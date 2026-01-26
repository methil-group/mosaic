from textual.widgets import Static, Markdown, Label, Collapsible
from textual.containers import Vertical
from textual.reactive import reactive
from rich.text import Text

class ChatMessage(Vertical):
    """A widget to display a chat message with markdown support and expandable actions."""
    
    def __init__(self, role: str, content: str = ""):
        super().__init__()
        self.role = role
        self.text_content = content
        self.log_content = ""

    def compose(self):
        if self.role == "user":
            header_text = Text("USER :", style="bold #ffffff")
            header_lbl = Label(header_text)
        else:
            header_text = Text("ASSISTANT :", style="bold #af87ff")
            header_lbl = Label(header_text)
        
        yield header_lbl
        
        # Actions section (only for assistant usually, but safe to have)
        if self.role != "user":
            # Start collapsed
            with Collapsible(title="Actions made", id="actions_view"):
                with Vertical(id="actions_container"):
                    pass # Items will be mounted here dynamically
        
        # Main content
        yield Markdown(self.text_content, id="md_view")

    def update_text(self, new_text: str):
        self.text_content = new_text
        self.query_one("#md_view", Markdown).update(self.text_content)
        # Force layout recalculation so the container grows
        self.refresh(layout=True)

    def add_action(self, log_text: str):
        """Append a tool log line to the actions view as a separate item."""
        container = self.query_one("#actions_container", Vertical)
        # specific class for styling, disable markup to prevent crashes
        container.mount(Static(log_text.strip(), classes="action-item", markup=False))

    def start_streaming_action(self) -> None:
        """Begin a new streaming action item."""
        container = self.query_one("#actions_container", Vertical)
        self.current_action_item = Static("", classes="action-item", markup=False)
        self.current_action_text = ""
        container.mount(self.current_action_item)
        
    def stream_to_action(self, text: str) -> None:
        """Update the current streaming action item."""
        if hasattr(self, 'current_action_item'):
            self.current_action_text += text
            self.current_action_item.update(self.current_action_text)
            # Ensure the Actions made container grows properly
            self.refresh(layout=True)
            
    def end_streaming_action(self) -> None:
        """Finalize the current action."""
        if hasattr(self, 'current_action_item'):
            del self.current_action_item
            if hasattr(self, 'current_action_text'):
                del self.current_action_text
            self.refresh(layout=True)
