"""Agent orchestration logic."""

import json
import re
from pathlib import Path

from src.framework.abstract_llm import AbstractLLM, Message
from src.framework.abstract_tool import AbstractTool, ToolRegistry, ToolResult
from src.framework.config import AgentConfig, DEFAULT_AGENT_CONFIG
from src.core.prompts import get_system_prompt
from src.core.tools.read_file import ReadFileTool
from src.core.tools.write_file import WriteFileTool
from src.core.tools.run_command import RunCommandTool
from src.core.tools.list_directory import ListDirectoryTool
from src.core.tools.search_code import SearchCodeTool


class Agent:
    """The main agent that orchestrates LLM and tools."""
    
    def __init__(
        self,
        llm: AbstractLLM,
        config: AgentConfig | None = None
    ):
        self.llm = llm
        self.config = config or DEFAULT_AGENT_CONFIG
        self.messages: list[Message] = []
        self.registry = ToolRegistry()
        
        # Register default tools
        self._register_default_tools()
        
        # Initialize with system prompt
        self._init_system_prompt()
    
    def _register_default_tools(self):
        """Register the default set of tools."""
        self.registry.register(ReadFileTool())
        self.registry.register(WriteFileTool(require_confirmation=self.config.require_confirmation))
        self.registry.register(RunCommandTool(working_directory=self.config.working_directory))
        self.registry.register(ListDirectoryTool())
        self.registry.register(SearchCodeTool())
    
    def _init_system_prompt(self):
        """Initialize the conversation with the system prompt."""
        system_prompt = get_system_prompt(str(self.config.working_directory))
        self.messages = [Message(role="system", content=system_prompt)]
    
    def _extract_tool_calls(self, response: str) -> list[dict]:
        """Extract tool calls from the LLM response."""
        tool_calls = []
        
        # Match ```tool ... ``` blocks
        pattern = r'```tool\s*\n?(.*?)\n?```'
        matches = re.findall(pattern, response, re.DOTALL)
        
        for match in matches:
            try:
                tool_call = json.loads(match.strip())
                if "tool" in tool_call:
                    tool_calls.append(tool_call)
            except json.JSONDecodeError:
                continue
        
        return tool_calls
    
    def _execute_tool(self, tool_call: dict) -> ToolResult:
        """Execute a single tool call."""
        tool_name = tool_call.get("tool")
        arguments = tool_call.get("arguments", {})
        
        tool = self.registry.get(tool_name)
        if tool is None:
            return ToolResult(
                success=False,
                output="",
                error=f"Unknown tool: {tool_name}"
            )
        
        return tool.execute(**arguments)
    
    def chat(self, user_message: str) -> str:
        """Process a user message and return the agent's response."""
        # Add user message
        self.messages.append(Message(role="user", content=user_message))
        
        iterations = 0
        final_response = ""
        
        while iterations < self.config.max_tool_iterations:
            iterations += 1
            
            # Get LLM response
            response = self.llm.generate(self.messages)
            response_text = response.content
            
            # Extract tool calls
            tool_calls = self._extract_tool_calls(response_text)
            
            if not tool_calls:
                # No tool calls, this is the final response
                final_response = response_text
                self.messages.append(Message(role="assistant", content=response_text))
                break
            
            # Execute tools and collect results
            self.messages.append(Message(role="assistant", content=response_text))
            
            tool_results = []
            for tool_call in tool_calls:
                result = self._execute_tool(tool_call)
                tool_name = tool_call.get("tool")
                
                if result.success:
                    tool_results.append(f"[{tool_name}] Succès:\n{result.output}")
                else:
                    tool_results.append(f"[{tool_name}] Erreur: {result.error}")
            
            # Add tool results as a user message
            results_text = "\n\n".join(tool_results)
            self.messages.append(Message(
                role="user",
                content=f"Résultats des outils:\n{results_text}"
            ))
            
            final_response = response_text
        
        return final_response
    
    def clear_history(self):
        """Clear conversation history, keeping only the system prompt."""
        self._init_system_prompt()
    
    def get_write_tool(self) -> WriteFileTool | None:
        """Get the write file tool for confirmation handling."""
        tool = self.registry.get("write_file")
        if isinstance(tool, WriteFileTool):
            return tool
        return None
