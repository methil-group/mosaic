from typing import Dict, Any, List
import json
import re
from src.Framework.Tools.tool import Tool
from src.Framework.Tools.tool_registry import ToolRegistry


class ToolUtils:
    @staticmethod
    def format_tools_for_prompt(tools: List[Tool]) -> str:
        tools_desc = "Available tools:\n"
        for tool in tools:
            tools_desc += f"- {tool.name}: {tool.description}\n"
            if tool.parameters:
                tools_desc += f"  Parameters: {json.dumps(tool.parameters)}\n"
        return tools_desc
    
    @staticmethod
    def extract_tool_calls(response: str) -> List[Dict[str, Any]]:
        tool_calls = []
        tool_pattern = r'<tool_call>(.*?)</tool_call>'
        matches = re.findall(tool_pattern, response, re.DOTALL)
        
        for match in matches:
            try:
                tool_data = json.loads(match.strip())
                tool_calls.append(tool_data)
            except json.JSONDecodeError:
                continue
                
        return tool_calls
    
    @staticmethod
    def execute_tool_call(tool_call: Dict[str, Any], registry: ToolRegistry) -> Any:
        tool_name = tool_call.get("name")
        parameters = tool_call.get("parameters", {})
        
        tool = registry.get(tool_name)
        if tool:
            return tool.function(**parameters)
        return f"Tool '{tool_name}' not found"