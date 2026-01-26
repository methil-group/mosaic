from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from src.Framework.Tools.tool_registry import ToolRegistry
from src.Framework.Tools.tool import Tool
from src.Framework.Utils.tool_utils import ToolUtils
from src.Core.Prompt.prompt_factory import PromptFactory
from src.Framework.Utils.logger import llm_logger, ui_logger


class AbstractLLM(ABC):
    def __init__(self, model_path: str):
        self.tool_registry = ToolRegistry()

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

    def chat(self, prompt: str, system_prompt: str = "", history: Optional[List[Dict[str, str]]] = None, tools: Optional[List[Tool]] = None, verbose: bool = False, log_callback: callable = print) -> str:
        if history is None:
            history = []

        if not system_prompt:
            system_prompt = PromptFactory.create_system_prompt()

        if tools:
            for tool in tools:
                self.tool_registry.register(tool)
            tool_desc = ToolUtils.format_tools_for_prompt(tools)
            prompt = PromptFactory.create_tool_prompt(prompt, tool_desc)

        messages = [{"role": "system", "content": system_prompt}] + history + [{"role": "user", "content": prompt}]
        
        response = self._generate(messages)

        while True:
            if verbose:
                # log_callback(f"\n[MODEL RESPONSE]\n{response}\n")
                pass

            tool_calls, error_message = ToolUtils.extract_tool_calls(response)
            
            if not tool_calls:
                if error_message:
                    ui_logger.log(f"[AbstractLLM] JSON error detected: {error_message}. Retrying...")
                    messages.append({"role": "assistant", "content": response})
                    messages.append({"role": "user", "content": f"System Error: The tool call JSON was invalid. {error_message}. Please correct the JSON and try again."})
                    response = self._generate(messages)
                    continue
                else:
                    break

            for tool_call in tool_calls:
                tool_name = tool_call.get('name')
                if verbose:
                    log_callback(f"[EXECUTING TOOL] {tool_name} with params: {tool_call.get('parameters')}")
                
                result = ToolUtils.execute_tool_call(tool_call, self.tool_registry)
                
                if verbose:
                    log_callback(f"[TOOL RESULT] {result}\n")
                
                result_prompt = PromptFactory.format_tool_result(response, tool_name, result)
                
                messages.append({"role": "assistant", "content": response})
                messages.append({"role": "user", "content": result_prompt})
            
            response = self._generate(messages)

        return response

    def chat_stream(self, prompt: str, system_prompt: str = "", history: Optional[List[Dict[str, str]]] = None, tools: Optional[List[Tool]] = None, verbose: bool = False, log_callback: callable = print):
        """
        Streaming version of chat. Yields response chunks and handles tool calls.
        Technical tags are preserved in the stream for UI handling.
        """
        if history is None:
            history = []

        if not system_prompt:
            system_prompt = PromptFactory.create_system_prompt()

        if tools:
            for tool in tools:
                self.tool_registry.register(tool)
            tool_desc = ToolUtils.format_tools_for_prompt(tools)
            prompt = PromptFactory.create_tool_prompt(prompt, tool_desc)

        messages = [{"role": "system", "content": system_prompt}] + history + [{"role": "user", "content": prompt}]
        
        llm_logger.log(f"[AbstractLLM] chat_stream entry. Message count: {len(messages)}")
        
        while True:
            full_response = ""
            
            if verbose:
                # log_callback("\n[MODEL RESPONSE STREAMING START]")
                pass
            
            llm_logger.log(f"Turn start. Messages: {messages[-1]['content'][:100]}...")

            for chunk in self._generate_stream(messages):
                full_response += chunk
                if chunk:
                    # VERBOSE LOGGING FOR DEBUGGING
                    llm_logger.log(f"Stream Chunk Received: {chunk[:50]}{'...' if len(chunk) > 50 else ''}")
                    yield chunk

            if verbose:
                # log_callback("\n[MODEL RESPONSE STREAMING END]\n")
                pass
            
            ui_logger.log(f"[AbstractLLM] Full response gathered: {repr(full_response)}")

            tool_calls, error_message = ToolUtils.extract_tool_calls(full_response)
            ui_logger.log(f"[AbstractLLM] Extracted {len(tool_calls)} tool calls")
            
            if not tool_calls:
                if error_message:
                    ui_logger.log(f"[AbstractLLM] JSON error detected: {error_message}. Retrying...")
                    messages.append({"role": "assistant", "content": full_response})
                    messages.append({"role": "user", "content": f"System Error: The tool call JSON was invalid. {error_message}. Please correct the JSON and try again."})
                    yield f"\n[System Error: Invalid JSON detected. Retrying...]\n"
                    continue
                else:
                    ui_logger.log("[AbstractLLM] No tool calls found. Ending cycle.")
                    break

            for tool_call in tool_calls:
                tool_name = tool_call.get('name')
                if verbose:
                    log_callback(f"[EXECUTING TOOL] {tool_name} with params: {tool_call.get('parameters')}")
                
                llm_logger.log(f"Executing Tool: {tool_name} {tool_call.get('parameters')}")
                result = ToolUtils.execute_tool_call(tool_call, self.tool_registry)
                
                if verbose:
                    log_callback(f"[TOOL RESULT] {result}\n")
                
                llm_logger.log(f"Tool Result: {str(result)[:500]}")
                    
                result_prompt = PromptFactory.format_tool_result(full_response, tool_name, result)
                
                messages.append({"role": "assistant", "content": full_response})
                messages.append({"role": "user", "content": result_prompt})
            
            # Continue the loop to get the next response after tool execution
            yield "\n" # Add a newline between tool results and new response
