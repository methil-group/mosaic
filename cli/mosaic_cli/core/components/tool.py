from textual.widgets import Static, Button
from textual.containers import Vertical, Horizontal
from textual.widget import Widget
from textual.reactive import reactive
from textual.message import Message
import json
from typing import Any
from rich.markup import escape

class ToolBlock(Widget):
    """A collapsible block representing a tool execution and its result."""
    
    class Approved(Message):
        """User approved the tool call."""
        def __init__(self, call_id: str):
            super().__init__()
            self.call_id = call_id

    class Rejected(Message):
        """User rejected the tool call."""
        def __init__(self, call_id: str):
            super().__init__()
            self.call_id = call_id

    result_text = reactive("")
    file_modified_status = reactive(False)
    collapsed = reactive(True)
    awaiting_approval = reactive(False)
    
    def __init__(self, name: Any, params: dict, call_id: str = ""):
        super().__init__()
        self.tool_name = str(name)
        self.params = params or {}
        self.call_id = call_id
        self.add_class("tool-block")
        self.add_class("collapsed")

    def compose(self):
        with Horizontal(classes="tool-header"):
            yield Static(f"🛠️ [bold]{escape(self.tool_name)}[/]", id="tool-title")
            yield Static("▶", id="tool-chevron")
            
        with Vertical(id="tool-details"):
            params_str = ", ".join([f"{k}={v}" for k,v in self.params.items()])
            yield Static(f"[bold]Parameters:[/] [dim]{escape(params_str)}[/]", classes="tool-params")
            
            with Horizontal(id="approval-area", classes="hidden"):
                yield Static("[bold gold1]Awaiting Approval...[/]", classes="approval-msg")
                yield Button("Approve", variant="success", id="approve-btn")
                yield Button("Reject", variant="error", id="reject-btn")

            yield Static("", id="tool-result-header")
            yield Static("Executing...", id="tool-result-content", markup=False)

    def on_click(self) -> None:
        if not self.awaiting_approval: # Allow collapse/expand only if not awaiting approval or always? Always is fine.
            self.collapsed = not self.collapsed
            self.toggle_class("collapsed")
            chevron = self.query_one("#tool-chevron")
            chevron.update("▶" if self.collapsed else "▼")

    def on_button_pressed(self, event: Button.Pressed) -> None:
        if event.button.id == "approve-btn":
            self.post_message(self.Approved(self.call_id))
            self.awaiting_approval = False
            self.query_one("#approval-area").add_class("hidden")
            self.query_one("#tool-result-content").update("Executing (Approved)...")
        elif event.button.id == "reject-btn":
            self.post_message(self.Rejected(self.call_id))
            self.awaiting_approval = False
            self.query_one("#approval-area").add_class("hidden")
            self.query_one("#tool-result-content").update("Rejected.")

    def set_result(self, result: str, file_modified: bool = False):
        self.result_text = result
        self.file_modified_status = file_modified
        self.awaiting_approval = False
        try:
            self.query_one("#approval-area").add_class("hidden")
        except Exception:
            pass
        
    def watch_result_text(self, result: str):
        self._update_ui()

    def watch_file_modified_status(self, status: bool):
        self._update_ui()

    def watch_awaiting_approval(self, value: bool):
        try:
            area = self.query_one("#approval-area")
            if value:
                area.remove_class("hidden")
                self.collapsed = False
                self.remove_class("collapsed")
                self.query_one("#tool-chevron").update("▼")
                self.query_one("#tool-result-content").update("[bold gold1]Waiting for user response...[/]")
            else:
                area.add_class("hidden")
        except Exception:
            pass

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
            pass

    def on_mount(self):
        if self.awaiting_approval:
            self.watch_awaiting_approval(True)
        if self.result_text:
            self._update_ui()

