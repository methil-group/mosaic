"""LFM 2.5 MLX LLM implementation."""

from typing import Generator
from src.framework.abstract_llm import AbstractLLM, Message, LLMResponse
from src.framework.config import LLMConfig, DEFAULT_LLM_CONFIG


class LFMLLM(AbstractLLM):
    """LLM implementation using LFM 2.5 via MLX."""
    
    def __init__(self, config: LLMConfig | None = None):
        self.config = config or DEFAULT_LLM_CONFIG
        self._model = None
        self._tokenizer = None
        self._sampler = None
        self._logits_processors = None
    
    def _ensure_loaded(self):
        """Lazy load the model."""
        if self._model is None:
            from mlx_lm import load
            from mlx_lm.sample_utils import make_sampler, make_logits_processors
            
            print(f"🔄 Loading model: {self.config.model_name}")
            self._model, self._tokenizer = load(self.config.model_name)
            
            self._sampler = make_sampler(
                temp=self.config.temperature,
                top_k=self.config.top_k,
                top_p=self.config.top_p
            )
            
            self._logits_processors = make_logits_processors(
                repetition_penalty=self.config.repetition_penalty
            )
            
            print("✅ Model loaded successfully")
    
    def _format_messages(self, messages: list[Message]) -> str:
        """Format messages using the chat template."""
        self._ensure_loaded()
        
        # Convert to dict format expected by tokenizer
        messages_dict = [{"role": m.role, "content": m.content} for m in messages]
        
        if self._tokenizer.chat_template is not None:
            return self._tokenizer.apply_chat_template(
                messages_dict,
                tokenize=False,
                add_generation_prompt=True
            )
        else:
            # Fallback formatting
            formatted = ""
            for msg in messages_dict:
                if msg["role"] == "system":
                    formatted += f"System: {msg['content']}\n\n"
                elif msg["role"] == "user":
                    formatted += f"User: {msg['content']}\n\n"
                elif msg["role"] == "assistant":
                    formatted += f"Assistant: {msg['content']}\n\n"
            formatted += "Assistant: "
            return formatted
    
    def generate(self, messages: list[Message], max_tokens: int | None = None) -> LLMResponse:
        """Generate a response from the LLM."""
        self._ensure_loaded()
        from mlx_lm import generate as mlx_generate
        
        prompt = self._format_messages(messages)
        
        response = mlx_generate(
            self._model,
            self._tokenizer,
            prompt=prompt,
            max_tokens=max_tokens or self.config.max_tokens,
            sampler=self._sampler,
            logits_processors=self._logits_processors,
            verbose=False
        )
        
        return LLMResponse(content=response)
    
    def generate_stream(self, messages: list[Message], max_tokens: int | None = None) -> Generator[str, None, None]:
        """Generate a streaming response from the LLM."""
        self._ensure_loaded()
        from mlx_lm import stream_generate
        
        prompt = self._format_messages(messages)
        
        for token in stream_generate(
            self._model,
            self._tokenizer,
            prompt=prompt,
            max_tokens=max_tokens or self.config.max_tokens,
            sampler=self._sampler,
            logits_processors=self._logits_processors
        ):
            yield token
