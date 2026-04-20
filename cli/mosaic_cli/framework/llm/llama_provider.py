import os
from typing import AsyncIterable, List, Dict, Any
import asyncio
from concurrent.futures import ThreadPoolExecutor
from .base import LlmProvider

# Try to import llama_cpp, but don't fail immediately if not present
try:
    from llama_cpp import Llama
except ImportError:
    Llama = None

class LlamaProvider(LlmProvider):
    def __init__(self, model_path: str, n_ctx: int = 4096, n_gpu_layers: int = -1):
        self.model_path = model_path
        self.n_ctx = n_ctx
        self.n_gpu_layers = n_gpu_layers
        self._llm = None
        self._executor = ThreadPoolExecutor(max_workers=1)

    def _get_llm(self):
        if self._llm is None:
            if Llama is None:
                raise ImportError("llama-cpp-python is not installed. Please install it with 'pip install llama-cpp-python'")
            if not os.path.exists(self.model_path):
                raise FileNotFoundError(f"Model file not found at {self.model_path}")
            
            self._llm = Llama(
                model_path=self.model_path,
                n_ctx=self.n_ctx,
                n_gpu_layers=self.n_gpu_layers,
                verbose=False,
                embedding=True # Enable embeddings for RAG
            )
        return self._llm

    async def stream_chat(self, model: str, messages: List[Dict[str, str]]) -> AsyncIterable[Dict[str, Any]]:
        llm = self._get_llm()
        
        loop = asyncio.get_event_loop()
        
        def run_inference():
            return llm.create_chat_completion(
                messages=messages,
                stream=True
            )

        it = await loop.run_in_executor(self._executor, run_inference)
        
        for chunk in it:
            if "choices" in chunk and len(chunk["choices"]) > 0:
                delta = chunk["choices"][0].get("delta", {})
                if "content" in delta:
                    yield {
                        "type": "token",
                        "data": delta["content"]
                    }
            
            if "usage" in chunk:
                yield {
                    "type": "usage",
                    "data": chunk["usage"]
                }
            
            await asyncio.sleep(0) # Yield control

    async def fetch_models(self) -> List[str]:
        return [os.path.basename(self.model_path)]

    async def get_embedding(self, text: str) -> List[float]:
        llm = self._get_llm()
        loop = asyncio.get_event_loop()
        
        def run_embedding():
            return llm.create_embedding(text)

        result = await loop.run_in_executor(self._executor, run_embedding)
        return result["data"][0]["embedding"]
