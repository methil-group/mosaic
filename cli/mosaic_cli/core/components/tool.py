from textual.widgets import Static
from textual.containers import Vertical, Horizontal
from textual.widget import Widget
from textual.reactive import reactive
import json
from typing import Any
from rich.markup import escape

class ToolBlock(Widget):
    """A collapsible block representing a tool execution and its result."""
    
    collapsed = reactive(True)
    
    def __init__(self, name: Any, params: dict):
        super().__init__()
        self.tool_name = str(name)
        self.params = params or {}
        self.result = ""
        self.file_status = ""
        self.add_class("tool-block")
        self.add_class("collapsed")

    def compose(self):
        with Horizontal(classes="tool-header"):
            yield Static(f"🛠️ [bold]{escape(self.tool_name)}[/]", id="tool-title")
            yield Static("▶", id="tool-chevron")
            
        with Vertical(id="tool-details"):
            params_str = ", ".join([f"{k}={v}" for k,v in self.params.items()])
            yield Static(f"[bold]Parameters:[/] [dim]{escape(params_str)}[/]", classes="tool-params")
            self.result_header = Static("", id="tool-result-header")
            self.result_content = Static("Executing...", id="tool-result-content", markup=False)
            yield self.result_header
            yield self.result_content

    def on_click(self) -> None:
        self.collapsed = not self.collapsed
        self.toggle_class("collapsed")
        chevron = self.query_one("#tool-chevron")
        chevron.update("▶" if self.collapsed else "▼")

    def set_result(self, result: str, file_modified: bool = False):
        self.result = result
        self.file_status = " ✓ File modified" if file_modified else ""
        
        display_text = result
        try:
            # Try to parse as JSON for pretty-printing and correct encoding
            if result.strip().startswith(("{", "[")):
                data = json.loads(result)
                display_text = json.dumps(data, indent=2, ensure_ascii=False)
        except:
            pass
        
        truncated = display_text[:1000] + "..." if len(display_text) > 1000 else display_text
        header_text = f"↳ Result{self.file_status}"
        
        self.result_header.update(f"[bold spring_green3]{escape(header_text)}[/]")
        self.result_content.markup = False
        self.result_content.update(truncated)
        self.query_one(".tool-header").add_class("has-result")

# Maintain backward compatibility for imports if needed, though they aren't used yet
class ToolExecution(Static):
    def __init__(self, name: str, params: dict):
        super().__init__(f"🛠️ {name} ({params})")

class ToolResult(Static):
    def __init__(self, name: str, result: str):
        super().__init__(f"↳ {result[:100]}...")

