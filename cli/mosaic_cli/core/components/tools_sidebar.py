from textual.widgets import Static, Label
from textual.containers import Vertical, Horizontal
from typing import List, Any
from ..tools.base import Tool

class ToolItem(Vertical):
    def __init__(self, tool: Tool):
        super().__init__()
        self.tool_name = tool.name()
        self.tool_description = tool.description()

    def compose(self):
        yield Label(f"/{self.tool_name}", classes="tool-item-name")
        yield Static(self.tool_description, classes="tool-item-desc")

class ToolsSidebar(Vertical):
    def compose(self):
        yield Label("AVAILABLE TOOLS", id="tools-sidebar-title")
        yield Vertical(id="tools-list")

    def refresh_tools(self, tools: List[Tool]):
        tools_list = self.query_one("#tools-list")
        tools_list.query("*").remove()
        
        # Sort tools by name
        sorted_tools = sorted(tools, key=lambda x: x.name())
        
        for tool in sorted_tools:
            tools_list.mount(ToolItem(tool))
        
        tools_list.scroll_end()
