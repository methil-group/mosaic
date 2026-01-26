from src.Framework.LLM.abstract_llm import AbstractLLM
from src.Framework.Utils.bash_utils import BashUtils
from typing import List, Dict, Any, Optional

class Agent:
    def __init__(self, llm: AbstractLLM):
        self.llm = llm
        self._setup_tools()

    def _setup_tools(self):
        self.llm.register_tool(
            name="run_bash",
            func=BashUtils.run_bash,
            description="Execute a bash command and get the output.",
            parameters={
                "type": "object",
                "properties": {
                    "command": {
                        "type": "string",
                        "description": "The bash command to run."
                    }
                },
                "required": ["command"]
            }
        )

    def chat(self, prompt: str, history: Optional[List[Dict[str, str]]] = None) -> str:
        # We use empty system prompt to let MLXLLM use the default from PromptFactory
        # unless we want to override it here.
        tools = []
        for tool in self.llm.tool_registry.list_tools():
            tools.append({
                "name": tool.name,
                "description": tool.description,
                "parameters": tool.parameters
            })
        return self.llm.chat(prompt, history=history, tools=tools)

    def run(self, prompt: str):
        response = self.chat(prompt)
        return response
