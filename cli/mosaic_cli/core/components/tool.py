from textual.widgets import Static
from textual.containers import Vertical, Horizontal
from textual.widget import Widget
from textual.reactive import reactive
import json
from typing import Any
from rich.markup import escape

class ToolBlock(Widget):
    """A collapsible block representing a tool execution and its result."""
    
    result_text = reactive("")
    file_modified_status = reactive(False)
    
    def __init__(self, name: Any, params: dict):
        super().__init__()
        self.tool_name = str(name)
        self.params = params or {}
        self.add_class("tool-block")
        self.add_class("collapsed")

    def compose(self):
        with Horizontal(classes="tool-header"):
            yield Static(f"🛠️ [bold]{escape(self.tool_name)}[/]", id="tool-title")
            yield Static("▶", id="tool-chevron")
            
        with Vertical(id="tool-details"):
            params_str = ", ".join([f"{k}={v}" for k,v in self.params.items()])
            yield Static(f"[bold]Parameters:[/] [dim]{escape(params_str)}[/]", classes="tool-params")
            yield Static("", id="tool-result-header")
            yield Static("Executing...", id="tool-result-content", markup=False)

    def on_click(self) -> None:
        self.collapsed = not self.collapsed
        self.toggle_class("collapsed")
        chevron = self.query_one("#tool-chevron")
        chevron.update("▶" if self.collapsed else "▼")

    def set_result(self, result: str, file_modified: bool = False):
        self.result_text = result
        self.file_modified_status = file_modified
        
    def watch_result_text(self, result: str):
        self._update_ui()

    def watch_file_modified_status(self, status: bool):
        self._update_ui()

    def _update_ui(self):
        try:
            res_header = self.query_one("#tool-result-header")
            res_content = self.query_one("#tool-result-content")
            
            file_status = " ✓ File modified" if self.file_modified_status else ""
            header_text = f"↳ Result{file_status}"
            res_header.update(f"[bold spring_green3]{escape(header_text)}[/]")
            
            display_text = self.result_text
            try:
                if display_text.strip().startswith(("{", "[")):
                    data = json.loads(display_text)
                    display_text = json.dumps(data, indent=2, ensure_ascii=False)
            except Exception:
                pass
                
            truncated = display_text[:1000] + "..." if len(display_text) > 1000 else display_text
            res_content.markup = False
            res_content.update(truncated)
            self.query_one(".tool-header").add_class("has-result")
        except Exception:
            # Widget not ready yet, Textual will call watches again or we can rely on on_mount
            pass

    def on_mount(self):
        if self.result_text:
            self._update_ui()

# Maintain backward compatibility for imports if needed, though they aren't used yet
class ToolExecution(Static):
    def __init__(self, name: str, params: dict):
        super().__init__(f"🛠️ {name} ({params})")

class ToolResult(Static):
    def __init__(self, name: str, result: str):
        super().__init__(f"↳ {result[:100]}...")

