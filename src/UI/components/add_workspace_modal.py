from textual.app import ComposeResult
from textual.screen import ModalScreen
from textual.widgets import Label, Button, Input, Static
from textual.containers import Vertical, Center

class AddWorkspaceModal(ModalScreen):
    """A modal dialog to add a new workspace."""

    def compose(self) -> ComposeResult:
        with Center():
            with Vertical(id="add-workspace-modal"):
                yield Label("ADD NEW WORKSPACE", id="modal-title")
                yield Label("Workspace Name:")
                yield Input(placeholder="e.g., My Project", id="ws-name")
                yield Label("Absolute Path:")
                yield Input(placeholder="/path/to/folder", id="ws-path")
                with Center():
                    yield Button("Add", variant="primary", id="add-btn")
                    yield Button("Cancel", id="cancel-btn")

    def on_button_pressed(self, event: Button.Pressed) -> None:
        if event.button.id == "add-btn":
            name = self.query_one("#ws-name", Input).value.strip()
            path = self.query_one("#ws-path", Input).value.strip()
            if name and path:
                self.dismiss({"name": name, "path": path})
        else:
            self.dismiss(None)
