from textual.widgets import Static
from textual.containers import Vertical, Horizontal
from textual.widget import Widget
from textual.reactive import reactive
import json

class ToolBlock(Widget):
    """A collapsible block representing a tool execution and its result."""
    
    collapsed = reactive(True)
    
    def __init__(self, name: str, params: dict):
        super().__init__()
        self.tool_name = name
        self.params = params
        self.result = ""
        self.file_status = ""
        self.add_class("tool-block")
        self.add_class("collapsed")

    def compose(self):
        with Horizontal(classes="tool-header"):
            yield Static(f"🛠️ [bold]{self.tool_name}[/]", id="tool-title")
            yield Static("▶", id="tool-chevron")
            
        with Vertical(id="tool-details"):
            params_str = ", ".join([f"{k}={v}" for k,v in self.params.items()])
            yield Static(f"[bold]Parameters:[/] [dim]{params_str}[/]", classes="tool-params")
            self.result_static = Static("[italic dim]Executing...[/]", id="tool-result-static")
            yield self.result_static

    def on_click(self) -> None:
        self.collapsed = not self.collapsed
        self.toggle_class("collapsed")
        chevron = self.query_one("#tool-chevron")
        chevron.update("▶" if self.collapsed else "▼")

    def set_result(self, result: str, file_modified: bool = False):
        self.result = result
        self.file_status = " ✓ File modified" if file_modified else ""
        
        truncated = result[:500] + "..." if len(result) > 500 else result
        header_text = f"↳ Result{self.file_status}"
        
        self.result_static.update(f"[bold spring_green3]{header_text}[/]\n[dim]{truncated}[/]")
        self.query_one(".tool-header").add_class("has-result")

# Maintain backward compatibility for imports if needed, though they aren't used yet
class ToolExecution(Static):
    def __init__(self, name: str, params: dict):
        super().__init__(f"🛠️ {name} ({params})")

class ToolResult(Static):
    def __init__(self, name: str, result: str):
        super().__init__(f"↳ {result[:100]}...")

