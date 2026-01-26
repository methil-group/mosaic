import os
from typing import List, Dict, Any, Optional
from openai import OpenAI
from src.Framework.LLM.abstract_llm import AbstractLLM

class LMStudioLLM(AbstractLLM):
    # Temporary, the logics should be to ask lm studio what models are available
    # and populate the list from that
    MODELS = [
        ("Current Loaded Model", "lmstudio-community/loaded-model"),
        ("Llama 3 8B", "meta-llama/llama-3-8b"),
        ("Custom...", "custom"),
    ]

    def __init__(self, model_path: str, base_url: str = "http://localhost:1234/v1"):
        """
        model_path: the model ID to use
        base_url: the LM Studio API endpoint (default: http://localhost:1234/v1)
        """
        super().__init__(model_path)
        self.model_id = model_path
        self.base_url = base_url
        
        self.client = OpenAI(
            base_url=self.base_url,
            api_key="lm-studio", # LM Studio doesn't require a real key
        )

    def test_connection(self) -> bool:
        try:
            self.client.models.list()
            return True
        except Exception:
            return False

    def _generate(self, messages: List[Dict[str, str]]) -> str:
        response = self.client.chat.completions.create(
            model=self.model_id,
            messages=messages,
        )
        return response.choices[0].message.content

    def _generate_stream(self, messages: List[Dict[str, str]]):
        from src.Framework.Utils.logger import llm_logger
        llm_logger.log(f"Requesting LM Studio stream for model: {self.model_id} at {self.base_url}")
        
        response = self.client.chat.completions.create(
            model=self.model_id,
            messages=messages,
            stream=True
        )
        
        for chunk in response:
            if chunk.choices and chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content
