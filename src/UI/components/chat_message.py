from textual.widgets import Static
from textual.reactive import reactive
from rich.markdown import Markdown

class ChatMessage(Static):
    """A widget to display a chat message with markdown support."""
    content = reactive("")

    def __init__(self, role: str, content: str = ""):
        super().__init__()
        self.role = role
        self.content = content

    def render(self) -> Markdown:
        return Markdown(f"**{self.role.upper()}**:\n{self.content}")
