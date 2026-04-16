from typing import AsyncIterable, List, Dict, Any
from .openai import OpenAiProvider

class LmStudioProvider(OpenAiProvider):
    def __init__(self, base_url: str = "http://localhost:1234/v1"):
        # LM Studio usually doesn't require an API key, but we pass a placeholder 
        # as the base class might expect one for headers.
        super().__init__(api_key="lm-studio", base_url=base_url)

    async def fetch_models(self) -> List[str]:
        """Fetch available models from LM Studio."""
        models = await super().fetch_models()
        return models
