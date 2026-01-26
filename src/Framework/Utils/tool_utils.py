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
        
        # Primary format: <tool_call> tags
        tool_pattern = r'<tool_call>(.*?)</tool_call>'
        matches = re.findall(tool_pattern, response, re.DOTALL)
        
        for match in matches:
            try:
                tool_data = json.loads(match.strip())
                if 'name' in tool_data:
                    tool_calls.append(tool_data)
            except json.JSONDecodeError:
                continue
        
        # Support for [TOOL_CALLS] format (observed deviation)
        # (Basically for models like devstrall)
        if not tool_calls:
            dev_pattern = r'\[TOOL_CALLS\](\w+)\s*({.*?})'
            matches = re.findall(dev_pattern, response, re.DOTALL)
            for tool_name, params_str in matches:
                try:
                    params = json.loads(params_str)
                    tool_calls.append({
                        "name": tool_name,
                        "parameters": params
                    })
                except json.JSONDecodeError:
                    continue

        # Fallback: Markdown JSON format
        # (Qwen2.5 Coder for example)
        if not tool_calls:
            json_pattern = r'```json\s*\n\s*({.*?})\s*\n\s*```'
            matches = re.findall(json_pattern, response, re.DOTALL)
            
            for match in matches:
                try:
                    tool_data = json.loads(match.strip())
                    if 'name' in tool_data:
                        tool_calls.append(tool_data)
                except json.JSONDecodeError:
                    continue
        
        # Fallback: Raw JSON objects with "name" and "parameters" or just "name"
        # (never happens normally lol)
        if not tool_calls:
            try:
                # Look for JSON-like objects that have a "name" key
                json_objects = re.findall(r'({[^{}]*"name"[^{}]*})', response)
                for json_str in json_objects:
                    try:
                        tool_data = json.loads(json_str)
                        if 'name' in tool_data:
                            tool_calls.append(tool_data)
                    except:
                        continue
            except:
                pass
                
        return tool_calls
    
    @staticmethod
    def execute_tool_call(tool_call: Dict[str, Any], registry: ToolRegistry) -> Any:
        tool_name = tool_call.get("name")
        parameters = tool_call.get("parameters", {})
        
        tool = registry.get(tool_name)
        if tool:
            return tool.function(**parameters)
        return f"Tool '{tool_name}' not found"