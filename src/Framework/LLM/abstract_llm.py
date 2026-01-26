from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from src.Framework.Tools.tool_registry import ToolRegistry
from src.Framework.Tools.tool import Tool
from src.Framework.Utils.tool_utils import ToolUtils
from src.Core.Prompt.prompt_factory import PromptFactory


class AbstractLLM(ABC):
    def __init__(self, model_path: str):
        self.tool_registry = ToolRegistry()
        self.prompt_factory = PromptFactory()

    def register_tool(self, name: str, func: callable, description: str = "", parameters: Dict[str, Any] = None):
        self.tool_registry.register_tool(name, func, description, parameters)

    @abstractmethod
    def test_connection(self) -> bool:
        pass

    @abstractmethod
    def _generate(self, messages: List[Dict[str, str]]) -> str:
        pass

    @abstractmethod
    def _generate_stream(self, messages: List[Dict[str, str]]) -> Any:
        pass

    def chat(self, prompt: str, system_prompt: str = "", history: Optional[List[Dict[str, str]]] = None, tools: Optional[List[Tool]] = None, verbose: bool = False) -> str:
        if history is None:
            history = []

        if not system_prompt:
            system_prompt = self.prompt_factory.create_system_prompt()

        if tools:
            for tool in tools:
                self.tool_registry.register(tool)
            tool_desc = ToolUtils.format_tools_for_prompt(tools)
            prompt = self.prompt_factory.create_tool_prompt(prompt, tool_desc)

        messages = [{"role": "system", "content": system_prompt}] + history + [{"role": "user", "content": prompt}]
        
        response = self._generate(messages)

        while True:
            if verbose:
                print(f"\n[MODEL RESPONSE]\n{response}\n")

            tool_calls = ToolUtils.extract_tool_calls(response)
            if not tool_calls:
                break

            for tool_call in tool_calls:
                tool_name = tool_call.get('name')
                if verbose:
                    print(f"[EXECUTING TOOL] {tool_name} with params: {tool_call.get('parameters')}")
                
                result = ToolUtils.execute_tool_call(tool_call, self.tool_registry)
                
                if verbose:
                    print(f"[TOOL RESULT] {result}\n")
                
                result_prompt = self.prompt_factory.format_tool_result(response, tool_name, result)
                
                messages.append({"role": "assistant", "content": response})
                messages.append({"role": "user", "content": result_prompt})
            
            response = self._generate(messages)

        return response

    def chat_stream(self, prompt: str, system_prompt: str = "", history: Optional[List[Dict[str, str]]] = None, tools: Optional[List[Tool]] = None, verbose: bool = False):
        """
        Streaming version of chat. Yields response chunks and handles tool calls.
        """
        if history is None:
            history = []

        if not system_prompt:
            system_prompt = self.prompt_factory.create_system_prompt()

        if tools:
            for tool in tools:
                self.tool_registry.register(tool)
            tool_desc = ToolUtils.format_tools_for_prompt(tools)
            prompt = self.prompt_factory.create_tool_prompt(prompt, tool_desc)

        messages = [{"role": "system", "content": system_prompt}] + history + [{"role": "user", "content": prompt}]
        
        while True:
            full_response = ""
            if verbose and full_response == "":
                 print("\n[MODEL RESPONSE STREAMING START]")

            for chunk in self._generate_stream(messages):
                full_response += chunk
                yield chunk

            if verbose:
                print("\n[MODEL RESPONSE STREAMING END]\n")

            tool_calls = ToolUtils.extract_tool_calls(full_response)
            if not tool_calls:
                break

            for tool_call in tool_calls:
                tool_name = tool_call.get('name')
                if verbose:
                    print(f"[EXECUTING TOOL] {tool_name} with params: {tool_call.get('parameters')}")
                
                result = ToolUtils.execute_tool_call(tool_call, self.tool_registry)
                
                if verbose:
                    print(f"[TOOL RESULT] {result}\n")
                    
                result_prompt = self.prompt_factory.format_tool_result(full_response, tool_name, result)
                
                messages.append({"role": "assistant", "content": full_response})
                messages.append({"role": "user", "content": result_prompt})
            
            # Continue the loop to get the next response after tool execution
            yield "\n" # Add a newline between tool results and new response
