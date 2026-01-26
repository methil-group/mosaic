from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from src.Framework.Tools.tool_registry import ToolRegistry
from src.Framework.Tools.tool import Tool


class AbstractLLM(ABC):
    def __init__(self, model_path: str):
        self.tool_registry = ToolRegistry()

    @abstractmethod
    def chat(self, prompt: str, system_prompt: str = "", history: Optional[List[Dict[str, str]]] = None, tools: Optional[List[Tool]] = None) -> str:
        pass
