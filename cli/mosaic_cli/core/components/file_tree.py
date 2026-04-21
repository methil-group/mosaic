import os
from pathlib import Path
from textual.widgets import DirectoryTree, Label, Static, Button
from textual.containers import Vertical, Horizontal
from textual.message import Message
from textual import work, events, on

# File type icons/colored indicators using Unicode + Rich markup
FILE_ICONS: dict[str, str] = {
    # Web
    ".html": "[bold #e34c26]⬤[/] ",   # HTML orange
    ".htm":  "[bold #e34c26]⬤[/] ",
    ".css":  "[bold #264de4]⬤[/] ",   # CSS blue
    ".scss": "[bold #c6538c]⬤[/] ",   # SCSS pink
    ".sass": "[bold #c6538c]⬤[/] ",
    ".less": "[bold #1d365d]⬤[/] ",
    # JavaScript / TypeScript
    ".js":   "[bold #f7df1e]⬤[/] ",   # JS yellow
    ".mjs":  "[bold #f7df1e]⬤[/] ",
    ".cjs":  "[bold #f7df1e]⬤[/] ",
    ".ts":   "[bold #3178c6]⬤[/] ",   # TS blue
    ".tsx":  "[bold #61dafb]⬤[/] ",   # React cyan
    ".jsx":  "[bold #61dafb]⬤[/] ",
    # Python
    ".py":   "[bold #3572a5]⬤[/] ",   # Python blue
    ".pyi":  "[bold #3572a5]⬤[/] ",
    # PHP
    ".php":  "[bold #777bb3]⬤[/] ",   # PHP purple
    # Rust
    ".rs":   "[bold #dea584]⬤[/] ",   # Rust orange
    # Go
    ".go":   "[bold #00add8]⬤[/] ",   # Go cyan
    # Config / Data
    ".json": "[bold #cbcb41]⬤[/] ",   # JSON yellow
    ".toml": "[bold #9c4221]⬤[/] ",
    ".yaml": "[bold #cb171e]⬤[/] ",
    ".yml":  "[bold #cb171e]⬤[/] ",
    ".xml":  "[bold #e37933]⬤[/] ",
    ".env":  "[bold #ecc94b]⬤[/] ",
    # Docs
    ".md":   "[bold #a8917d]⬤[/] ",
    ".rst":  "[bold #a8917d]⬤[/] ",
    ".txt":  "[bold #8b7e6f]⬤[/] ",
    # Images
    ".png":  "[bold #a855f7]⬤[/] ",
    ".jpg":  "[bold #a855f7]⬤[/] ",
    ".jpeg": "[bold #a855f7]⬤[/] ",
    ".svg":  "[bold #ff9900]⬤[/] ",
    ".gif":  "[bold #a855f7]⬤[/] ",
    ".webp": "[bold #a855f7]⬤[/] ",
    # Shell
    ".sh":   "[bold #4eaa25]⬤[/] ",
    ".bash": "[bold #4eaa25]⬤[/] ",
    ".zsh":  "[bold #4eaa25]⬤[/] ",
    # C / C++
    ".c":    "[bold #555555]⬤[/] ",
    ".cpp":  "[bold #f34b7d]⬤[/] ",
    ".h":    "[bold #555555]⬤[/] ",
    ".hpp":  "[bold #f34b7d]⬤[/] ",
    # Java / Kotlin
    ".java": "[bold #b07219]⬤[/] ",
    ".kt":   "[bold #a97bff]⬤[/] ",
    # Ruby / Swift
    ".rb":   "[bold #cc342d]⬤[/] ",
    ".swift":"[bold #f05138]⬤[/] ",
    # Fallback
    "":      "[bold #5a5a5a]·[/] ",
}

DIR_ICON = "[bold #a8917d]▶[/] "


def get_icon(name: str) -> str:
    suffix = Path(name).suffix.lower()
    return FILE_ICONS.get(suffix, FILE_ICONS[""])


class FilteredDirectoryTree(DirectoryTree):
    """DirectoryTree that hides hidden files/dirs and shows file type icons."""
    
    def filter_paths(self, paths):
        return [p for p in paths if not p.name.startswith(".")]

    class FileCmdClicked(Message):
        def __init__(self, path: str):
            self.path = path
            super().__init__()

    def on_click(self, event: events.Click) -> None:
        if event.meta or event.ctrl:
            # get_node_at uses widget-relative y coordinate
            node = self.get_node_at(event.y)
            if node and node.data and not node.data.is_dir:
                self.post_message(self.FileCmdClicked(str(node.data.path)))
                event.stop()

    def render_label(self, node, base_style, style):
        label = super().render_label(node, base_style, style)
        return label


class FileTreeSidebar(Vertical):
    """Right-hand sidebar showing the workspace file tree with file icons."""

    DEFAULT_CSS = ""
    
    class FileSelected(Message):
        def __init__(self, path: str):
            self.path = path
            super().__init__()

    class FileCmdClicked(Message):
        def __init__(self, path: str):
            self.path = path
            super().__init__()

    def __init__(self, workspace: str, **kwargs):
        super().__init__(**kwargs)
        self.workspace = workspace

    def compose(self):
        with Horizontal(classes="sidebar-header"):
            yield Label("FILE TREE", id="file-tree-title")
            yield Button("✕", id="close-file-tree-btn", classes="close-btn")
        yield FilteredDirectoryTree(self.workspace, id="workspace-tree")

    @on(Button.Pressed, "#close-file-tree-btn")
    def on_close_sidebar(self):
        self.display = False

    def refresh_tree(self):
        try:
            tree = self.query_one("#workspace-tree", FilteredDirectoryTree)
            tree.reload()
        except Exception:
            pass

    def on_directory_tree_file_selected(self, event: FilteredDirectoryTree.FileSelected):
        self.post_message(self.FileSelected(str(event.path)))

    def on_filtered_directory_tree_file_cmd_clicked(self, event: FilteredDirectoryTree.FileCmdClicked):
        self.post_message(self.FileCmdClicked(str(event.path)))
