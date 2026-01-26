from typing import Dict, Optional, List
from src.Framework.Tools.tool import Tool


class ToolRegistry:
    def __init__(self):
        self.tools: Dict[str, Tool] = {}
    
    def register(self, tool: Tool):
        self.tools[tool.name] = tool
    
    def register_tool(self, name: str, func: callable, description: str = "", parameters: dict = None):
        tool = Tool(name=name, function=func, description=description, parameters=parameters)
        self.register(tool)
    
    def get(self, name: str) -> Optional[Tool]:
        return self.tools.get(name)
    
    def list_tools(self) -> List[Tool]:
        return list(self.tools.values())