from textual.app import ComposeResult
from textual.widgets import Label, ListItem

class WorkspaceItem(ListItem):
    """A widget for a workspace in the sidebar."""
    def __init__(self, name: str, path: str):
        super().__init__()
        self.workspace_name = name
        self.path = path

    def compose(self) -> ComposeResult:
        yield Label(f"📁 {self.workspace_name}", classes="workspace-label")
