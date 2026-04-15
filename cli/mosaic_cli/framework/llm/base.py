from abc import ABC, abstractmethod
from typing import AsyncIterable, List, Dict, Any

class LlmProvider(ABC):
    @abstractmethod
    async def stream_chat(self, model: str, messages: List[Dict[str, str]]) -> AsyncIterable[Dict[str, Any]]:
        pass

    @abstractmethod
    async def fetch_models(self) -> List[str]:
        pass
