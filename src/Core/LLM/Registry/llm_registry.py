from typing import Dict, Type, List, Tuple
from src.Framework.LLM.abstract_llm import AbstractLLM
from src.Core.LLM.openrouter_llm import OpenRouterLLM
from src.Core.LLM.mlx_llm import MLXLLM

class LLMRegistry:
    """Registry for available LLM providers and their models."""
    
    _PROVIDERS: Dict[str, Dict] = {
        "openrouter": {
            "name": "OpenRouter",
            "class": OpenRouterLLM,
        },
        "mlx": {
            "name": "MLX (Local)",
            "class": MLXLLM,
        }
    }

    @classmethod
    def get_providers(cls) -> List[Tuple[str, str]]:
        """Returns list of (display_name, provider_id) for UI Select."""
        return [(info["name"], provider_id) for provider_id, info in cls._PROVIDERS.items()]

    @classmethod
    def get_models(cls, provider_id: str) -> List[Tuple[str, str]]:
        """Returns list of models for a given provider."""
        provider_info = cls._PROVIDERS.get(provider_id)
        if provider_info:
            return provider_info["class"].MODELS
        return []

    @classmethod
    def get_class(cls, provider_id: str) -> Type[AbstractLLM]:
        """Returns the LLM class for a given provider."""
        return cls._PROVIDERS.get(provider_id, {}).get("class")
