from src.Framework.LLM.abstract_llm import AbstractLLM
from src.Core.Tools.tools import TOOLS
from typing import List, Dict, Any, Optional

class Agent:
    def __init__(self, llm: AbstractLLM):
        self.llm = llm

    def chat(self, prompt: str, history: Optional[List[Dict[str, str]]] = None) -> str:
        return self.llm.chat(prompt, history=history, tools=TOOLS)

    def run(self, prompt: str):
        response = self.chat(prompt)
        return response
