from textual.widgets import Static

class ChatMessage(Static):
    def __init__(self, role: str, content: str):
        super().__init__()
        self.role = role
        self.content = content

    def render(self) -> str:
        color = "cyan" if self.role == "user" else "green"
        if self.role == "system": color = "yellow"
        if self.role == "assistant": color = "green"
        return f"[{color} bold]{self.role.upper()}:[/] {self.content}"
