import os
from typing import List, Dict, Any, Optional
from openai import OpenAI
from dotenv import load_dotenv
from src.Framework.LLM.abstract_llm import AbstractLLM

class OpenRouterLLM(AbstractLLM):
    def __init__(self, model_path: str):
        """
        model_path here is the OpenRouter model ID (e.g., 'openai/gpt-4o')
        """
        super().__init__(model_path)
        load_dotenv()
        
        api_key = os.getenv("OPENROUTER_API_KEY")
        if not api_key:
            raise ValueError("OPENROUTER_API_KEY not found in environment variables")
            
        self.client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=api_key,
        )
        self.model_id = model_path

    def test_connection(self) -> bool:
        """
        Tests connection to OpenRouter by sending a simple query.
        """
        try:
            self.client.chat.completions.create(
                model=self.model_id,
                messages=[{"role": "user", "content": "test"}],
                max_tokens=1
            )
            return True
        except Exception as e:
            print(f"Connection test failed: {str(e)}")
            return False

    def _generate(self, messages: List[Dict[str, str]]) -> str:
        """
        Implementation of the abstract generate method using OpenRouter.
        """
        response = self.client.chat.completions.create(
            model=self.model_id,
            messages=messages,
        )
        
        return response.choices[0].message.content

    def _generate_stream(self, messages: List[Dict[str, str]]):
        """
        Streaming implementation for OpenRouter.
        """
        response = self.client.chat.completions.create(
            model=self.model_id,
            messages=messages,
            stream=True
        )
        
        for chunk in response:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content
