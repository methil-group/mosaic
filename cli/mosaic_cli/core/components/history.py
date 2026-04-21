import os
import json
from datetime import datetime
from textual.widgets import Static, Label, Button
from textual.containers import Vertical, Horizontal
from textual.message import Message
from textual import on

class HistoryItem(Static):
    class Selected(Message):
        def __init__(self, session_id: str):
            self.session_id = session_id
            super().__init__()

    def __init__(self, session_id: str, title: str, timestamp: str):
        super().__init__()
        self.session_id = session_id
        self.chat_title = title
        self.timestamp = timestamp

    def compose(self):
        with Vertical():
            yield Label(self.chat_title, classes="history-item-title")
            yield Label(self.timestamp, classes="history-item-date")

    def on_click(self):
        self.post_message(self.Selected(self.session_id))

class HistorySidebar(Vertical):
    class NewChatRequested(Message):
        pass

    def compose(self):
        with Horizontal(classes="sidebar-header"):
            yield Label("CHATS", id="history-sidebar-title")
            yield Button("✕", id="close-history-btn", classes="close-btn")
        yield Button("New Chat", id="new-chat-btn", variant="primary")
        yield Vertical(id="history-list")

    @on(Button.Pressed, "#close-history-btn")
    def on_close_sidebar(self):
        self.display = False

    @on(Button.Pressed, "#new-chat-btn")
    def on_new_chat(self):
        self.post_message(self.NewChatRequested())

    def refresh_history(self, chats_dir: str):
        history_list = self.query_one("#history-list")
        history_list.query("*").remove()
        
        if not os.path.exists(chats_dir):
            return

        files = []
        for f in os.listdir(chats_dir):
            if f.startswith("chat_") and f.endswith(".json"):
                path = os.path.join(chats_dir, f)
                try:
                    mtime = os.path.getmtime(path)
                    files.append((f, mtime))
                except Exception:
                    continue
        
        # Sort by mtime descending
        files.sort(key=lambda x: x[1], reverse=True)

        for filename, _ in files:
            session_id = filename.replace("chat_", "").replace(".json", "")
            
            # Extract basic info
            title = session_id
            timestamp = ""
            try:
                with open(os.path.join(chats_dir, filename), "r") as f:
                    data = json.load(f)
                    # Use first user message as title if exists
                    for msg in data.get("history", []):
                        if msg.get("role") == "user":
                            title = msg.get("content", "")[:30] + "..."
                            break
                    
                    # Try to parse timestamp from filename or metadata
                    dt = datetime.strptime(session_id, "%Y%m%d_%H%M%S")
                    timestamp = dt.strftime("%b %d, %H:%M")
            except Exception:
                pass

            history_list.mount(HistoryItem(session_id, title, timestamp))
