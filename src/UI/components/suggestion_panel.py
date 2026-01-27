from textual.widgets import ListItem, ListView, Label
from textual.containers import Vertical
from textual.reactive import reactive
from textual.message import Message

class SuggestionListItem(ListItem):
    """ListItem that holds the suggestion text."""
    def __init__(self, label: str):
        super().__init__(Label(label))
        self.value = label

class SuggestionPanel(Vertical):
    """A floating panel for autocomplete suggestions."""

    DEFAULT_CSS = """
    SuggestionPanel {
        layer: overlay;
        dock: bottom;
        width: 100%;
        height: auto;
        max-height: 14;
        background: $surface;
        border: solid $accent;
        display: none;
        padding: 0;
        margin-bottom: 3; /* Clear the Input widget height */
        offset-y: 0;
    }
    
    SuggestionPanel.visible {
        display: block;
    }

    SuggestionPanel > ListView {
        height: auto;
        max-height: 10;
    }
    """

    def compose(self):
        yield ListView(id="suggestion-list")

    def update_suggestions(self, suggestions: list[str]):
        """Update the list of suggestions."""
        list_view = self.query_one("#suggestion-list", ListView)
        list_view.clear()
        
        if not suggestions:
            self.remove_class("visible")
            return
            
        for suggestion in suggestions:
            list_view.append(SuggestionListItem(suggestion))
            
        self.add_class("visible")
        # Select first item by default
        list_view.index = 0

    def move_selection(self, direction: int):
        """Move selection up (-1) or down (1)."""
        list_view = self.query_one("#suggestion-list", ListView)
        if not self.has_class("visible"):
            return
            
        current = list_view.index
        if current is None:
            list_view.index = 0
            return
            
        new_index = current + direction
        # Clamp
        if 0 <= new_index < len(list_view.children):
            list_view.index = new_index

    def get_selected(self) -> str | None:
        """Return the currently selected text."""
        list_view = self.query_one("#suggestion-list", ListView)
        if not self.has_class("visible") or list_view.index is None:
            return None
            
        # Get the SuggestionListItem directly
        item = list_view.children[list_view.index]
        if isinstance(item, SuggestionListItem):
            return item.value
        return None

    def hide(self):
        self.remove_class("visible")
