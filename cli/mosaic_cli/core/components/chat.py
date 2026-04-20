from textual.widgets import Static, Markdown, Label
from textual.containers import Vertical
from typing import Any
from rich.markup import escape

class ChatMessage(Vertical):
    def __init__(self, role: str, content: Any):
        super().__init__()
        self.role = str(role)
        self.content = str(content)
        self.styles.height = "auto"
        self.styles.margin = (0, 0, 1, 0)

    def compose(self):
        color = "cyan" if self.role == "user" else "spring_green3"
        if self.role == "system":
            color = "gold1"
        
        yield Label(f"[bold {color}]{escape(self.role.upper())}:[/]")
        if self.role == "assistant":
            yield Markdown(self.content)
        else:
            yield Static(escape(self.content))

