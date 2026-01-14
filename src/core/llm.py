"""MLX LLM implementation - supports any MLX model."""

from dataclasses import dataclass


@dataclass 
class LLMConfig:
    """LLM configuration."""
    model_name: str
    temperature: float = 0.1
    top_p: float = 0.9
    max_tokens: int = 4096


class MLXLLM:
    """LLM implementation using MLX - works with any MLX model."""
    
    def __init__(self, model_name: str, config: LLMConfig | None = None):
        self.model_name = model_name
        self.config = config or LLMConfig(model_name=model_name)
        self._model = None
        self._tokenizer = None
    
    def load(self):
        """Load the model (call this explicitly to show progress)."""
        if self._model is not None:
            return
            
        from mlx_lm import load
        
        print(f"🔄 Loading model: {self.model_name}")
        print("   (this may take a moment on first run...)")
        
        self._model, self._tokenizer = load(self.model_name)
        
        print("✅ Model loaded!")
    
    def generate(self, messages: list[dict], max_tokens: int | None = None) -> str:
        """Generate a response from the model.
        
        Args:
            messages: List of {"role": "user"|"assistant"|"system", "content": "..."}
            max_tokens: Override max tokens
            
        Returns:
            Generated text response
        """
        if self._model is None:
            self.load()
        
        from mlx_lm import generate
        from mlx_lm.sample_utils import make_sampler
        
        # Format messages using tokenizer's chat template
        if self._tokenizer.chat_template:
            prompt = self._tokenizer.apply_chat_template(
                messages,
                tokenize=False,
                add_generation_prompt=True
            )
        else:
            # Fallback formatting
            prompt = self._format_messages_fallback(messages)
        
        # Create sampler
        sampler = make_sampler(
            temp=self.config.temperature,
            top_p=self.config.top_p
        )
        
        # Generate
        response = generate(
            self._model,
            self._tokenizer,
            prompt=prompt,
            max_tokens=max_tokens or self.config.max_tokens,
            sampler=sampler,
            verbose=False
        )
        
        return response
    
    def _format_messages_fallback(self, messages: list[dict]) -> str:
        """Fallback message formatting if no chat template."""
        formatted = ""
        for msg in messages:
            role = msg["role"]
            content = msg["content"]
            if role == "system":
                formatted += f"System: {content}\n\n"
            elif role == "user":
                formatted += f"User: {content}\n\n"
            elif role == "assistant":
                formatted += f"Assistant: {content}\n\n"
        formatted += "Assistant: "
        return formatted
