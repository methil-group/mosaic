from src.Framework.LLM.abstract_llm import AbstractLLM
from src.Core.Tools.tools import TOOLS
from typing import List, Dict, Any, Optional

class Agent:
    def __init__(self, llm: AbstractLLM, verbose: bool = False):
        self.llm = llm
        self.verbose = verbose

    def chat(self, prompt: str, history: Optional[List[Dict[str, str]]] = None, log_callback: callable = print) -> str:
        return self.llm.chat(prompt, history=history, tools=TOOLS, verbose=self.verbose, log_callback=log_callback)

    def chat_stream(self, prompt: str, history: Optional[List[Dict[str, str]]] = None, log_callback: callable = print):
        return self.llm.chat_stream(prompt, history=history, tools=TOOLS, verbose=self.verbose, log_callback=log_callback)

    def run(self, prompt: str):
        response = self.chat(prompt)
        return response

    def run_stream(self, prompt: str, log_callback: callable = print):
        return self.chat_stream(prompt, log_callback=log_callback)
