"""MLX LLM implementation with streaming support."""

import os
import sys
import threading
from dataclasses import dataclass
from typing import Generator
from rich.console import Console

from src.core.models import PINK, hide_cursor, show_cursor

console = Console()


@dataclass 
class LLMConfig:
    """LLM configuration."""
    model_name: str
    temperature: float = 0.1
    top_p: float = 0.9
    max_tokens: int = 4096


# Tokens to strip from model output
CLEANUP_TOKENS = ["<|im_end|>", "<|end|>", "<|eot_id|>", "</s>", "[/INST]"]


def clean_response(text: str) -> str:
    """Clean up model response tokens."""
    for token in CLEANUP_TOKENS:
        text = text.replace(token, "")
    return text.strip()


class MLXLLM:
    """LLM implementation using MLX with streaming support."""
    
    def __init__(self, model_name: str, config: LLMConfig | None = None):
        self.model_name = model_name
        self.config = config or LLMConfig(model_name=model_name)
        self._model = None
        self._tokenizer = None
    
    def load(self):
        """Load the model with animated spinner (threaded)."""
        if self._model is not None:
            return
        
        hide_cursor()
        
        loading_done = threading.Event()
        load_error = [None]
        model_result = [None, None]
        
        def load_model():
            try:
                from mlx_lm import load
                old_stdout, old_stderr = sys.stdout, sys.stderr
                sys.stdout = open(os.devnull, 'w')
                sys.stderr = open(os.devnull, 'w')
                try:
                    model_result[0], model_result[1] = load(self.model_name)
                finally:
                    sys.stdout.close()
                    sys.stderr.close()
                    sys.stdout, sys.stderr = old_stdout, old_stderr
            except Exception as e:
                load_error[0] = e
            finally:
                loading_done.set()
        
        thread = threading.Thread(target=load_model)
        thread.start()
        
        spinner_chars = "⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏"
        i = 0
        
        while not loading_done.is_set():
            spinner = spinner_chars[i % len(spinner_chars)]
            console.print(f"  [{PINK}]{spinner}[/{PINK}] Loading model...", end="\r")
            loading_done.wait(timeout=0.1)
            i += 1
        
        thread.join()
        console.print(" " * 50, end="\r")
        
        if load_error[0]:
            show_cursor()
            raise load_error[0]
        
        self._model, self._tokenizer = model_result
        show_cursor()
        console.print(f"[{PINK}]✓ Model loaded![/{PINK}]")
    
    def _format_prompt(self, messages: list[dict]) -> str:
        """Format messages into a prompt."""
        if self._tokenizer.chat_template:
            return self._tokenizer.apply_chat_template(
                messages,
                tokenize=False,
                add_generation_prompt=True
            )
        # Fallback
        formatted = ""
        for msg in messages:
            role, content = msg["role"], msg["content"]
            if role == "system":
                formatted += f"System: {content}\n\n"
            elif role == "user":
                formatted += f"User: {content}\n\n"
            elif role == "assistant":
                formatted += f"Assistant: {content}\n\n"
        return formatted + "Assistant: "
    
    def generate_stream(self, messages: list[dict], max_tokens: int | None = None) -> Generator[str, None, None]:
        """Generate a streaming response."""
        if self._model is None:
            self.load()
        
        from mlx_lm import stream_generate
        from mlx_lm.sample_utils import make_sampler
        
        prompt = self._format_prompt(messages)
        sampler = make_sampler(temp=self.config.temperature, top_p=self.config.top_p)
        
        for chunk in stream_generate(
            self._model,
            self._tokenizer,
            prompt=prompt,
            max_tokens=max_tokens or self.config.max_tokens,
            sampler=sampler,
        ):
            # chunk is a GenerationResult with .text attribute
            text = chunk.text if hasattr(chunk, "text") else str(chunk)
            # Clean tokens as we stream
            for token in CLEANUP_TOKENS:
                if token in text:
                    text = text.replace(token, "")
            if text:
                yield text
    
    def generate(self, messages: list[dict], max_tokens: int | None = None) -> str:
        """Generate a full response (non-streaming)."""
        result = ""
        for chunk in self.generate_stream(messages, max_tokens):
            result += chunk
        return clean_response(result)
