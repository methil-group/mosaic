from typing import Dict, Any, List
import json
import re
from src.Framework.Tools.tool import Tool
from src.Framework.Tools.tool_registry import ToolRegistry


from src.Framework.Utils.logger import ui_logger

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
    def extract_tool_calls(response: str) -> tuple[List[Dict[str, Any]], str | None]:
        tool_calls = []
        errors = []
        
        # Primary format: <tool_call> tags
        tool_pattern = r'<tool_call>(.*?)</tool_call>'
        matches = re.findall(tool_pattern, response, re.DOTALL)
        
        if matches:
            ui_logger.log(f"[ToolUtils] Found {len(matches)} <tool_call> matches")
        
        for match in matches:
            content = match.strip()
            # Try JSON first
            if content.startswith('{'):
                try:
                    tool_data = json.loads(content)
                    if 'name' in tool_data:
                        tool_calls.append(tool_data)
                except json.JSONDecodeError as e:
                    error_msg = f"JSON error in <tool_call>: {e}"
                    ui_logger.log(f"[ToolUtils] {error_msg}\nMatch: {repr(match)}")
                    errors.append(f"{error_msg} in content: {match[:200]}...")
                    continue
            # Try XML
            else:
                try:
                    # Wrap in root to handle fragment if needed, 
                    # but tool_pattern already extracts inner content. 
                    # If content is:
                    # <name>foo</name>
                    # <parameters>...</parameters>
                    # We can wrap it in a root tag to parse easily
                    
                    # Alternatively, the regex above removed the outer <tool_call>.
                    # So we have the children.
                    # It's safer to re-wrap in a dummy root or parse carefully.
                    
                    import xml.etree.ElementTree as ET
                    # Wrap in <root> to ensure single root element
                    xml_content = f"<root>{content}</root>"
                    root = ET.fromstring(xml_content)
                    
                    name_elem = root.find('name')
                    if name_elem is not None:
                        tool_name = name_elem.text.strip()
                        params = {}
                        params_elem = root.find('parameters')
                        if params_elem is not None:
                            for child in params_elem:
                                # Start with simple text content
                                val = child.text
                                if val:
                                    val = val.strip()
                                    # Try to interpret as JSON if it looks like it?
                                    # The user prompt had a JSON list in a param.
                                    if (val.startswith('[') and val.endswith(']')) or \
                                       (val.startswith('{') and val.endswith('}')):
                                       try:
                                           val = json.loads(val)
                                       except:
                                           pass
                                params[child.tag] = val
                            
                        tool_calls.append({
                            "name": tool_name,
                            "parameters": params
                        })
                except Exception as e:
                    error_msg = f"XML parsing error in <tool_call>: {e}"
                    ui_logger.log(f"[ToolUtils] {error_msg}\nMatch: {repr(match)}")
                    errors.append(f"{error_msg}"[:100])
                    continue
        
        # Support for [TOOL_CALLS] format (observed deviation)
        if not tool_calls:
            dev_pattern = r'\[TOOL_CALLS\](\w+)\s*({.*?})'
            matches = re.findall(dev_pattern, response, re.DOTALL)
            if matches:
                ui_logger.log(f"[ToolUtils] Found {len(matches)} [TOOL_CALLS] matches")
            for tool_name, params_str in matches:
                try:
                    params = json.loads(params_str)
                    tool_calls.append({
                        "name": tool_name,
                        "parameters": params
                    })
                except json.JSONDecodeError as e:
                    errors.append(f"JSON error in [TOOL_CALLS]: {e}")
                    continue

        # Fallback: Markdown JSON format
        if not tool_calls:
            json_pattern = r'```json\s*\n\s*({.*?})\s*\n\s*```'
            matches = re.findall(json_pattern, response, re.DOTALL)
            if matches:
                 ui_logger.log(f"[ToolUtils] Found {len(matches)} markdown code block matches")
            
            for match in matches:
                try:
                    tool_data = json.loads(match.strip())
                    if 'name' in tool_data:
                        tool_calls.append(tool_data)
                except json.JSONDecodeError as e:
                    errors.append(f"JSON error in markdown block: {e}")
                    continue
        
        # Fallback: Raw JSON objects
        if not tool_calls:
            try:
                # Look for JSON-like objects that have a "name" key
                json_objects = re.findall(r'({[^{}]*"name"[^{}]*})', response)
                if json_objects:
                    ui_logger.log(f"[ToolUtils] Found {len(json_objects)} raw JSON-like object matches")
                for json_str in json_objects:
                    try:
                        tool_data = json.loads(json_str)
                        if 'name' in tool_data:
                            tool_calls.append(tool_data)
                    except:
                        continue
            except:
                pass
                
        if not tool_calls:
            ui_logger.log(f"[ToolUtils] No tool calls extracted from response (first 200 chars): {repr(response[:200])}")
            
        error_result = "; ".join(errors) if errors and not tool_calls else None
        return tool_calls, error_result
    
    @staticmethod
    def execute_tool_call(tool_call: Dict[str, Any], registry: ToolRegistry) -> Any:
        tool_name = tool_call.get("name")
        parameters = tool_call.get("parameters", {})
        
        tool = registry.get(tool_name)
        if tool:
            return tool.function(**parameters)
        return f"Tool '{tool_name}' not found"