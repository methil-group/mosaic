import os
from textual.widgets import DirectoryTree, Label, Button, Static
from textual.containers import Vertical
from textual.message import Message

class FilteredDirectoryTree(DirectoryTree):
    """DirectoryTree that hides hidden files and directories."""
    
    def filter_paths(self, paths):
        return [p for p in paths if not p.name.startswith(".")]


class FileTreeSidebar(Vertical):
    """Right-hand sidebar showing the workspace file tree."""

    DEFAULT_CSS = ""
    
    class FileSelected(Message):
        def __init__(self, path: str):
            self.path = path
            super().__init__()

    def __init__(self, workspace: str, **kwargs):
        super().__init__(**kwargs)
        self.workspace = workspace

    def compose(self):
        yield Label("FILE TREE", id="file-tree-title")
        yield Button("⟳ Refresh", id="refresh-tree-btn", variant="default")
        yield FilteredDirectoryTree(self.workspace, id="workspace-tree")

    def on_button_pressed(self, event: Button.Pressed):
        if event.button.id == "refresh-tree-btn":
            self.refresh_tree()

    def refresh_tree(self):
        try:
            tree = self.query_one("#workspace-tree", FilteredDirectoryTree)
            tree.reload()
        except Exception:
            pass

    def on_directory_tree_file_selected(self, event: FilteredDirectoryTree.FileSelected):
        self.post_message(self.FileSelected(str(event.path)))
