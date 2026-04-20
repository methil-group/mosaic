from textual.widgets import Label, Button, Input
from textual.containers import Vertical, Horizontal
from textual.message import Message
from textual import on
from typing import Any, List, Dict

class MemoryItem(Horizontal):
    class DeleteRequested(Message):
        def __init__(self, index: int):
            self.index = index
            super().__init__()

    def __init__(self, text: str, index: int, timestamp: str, tags: List[str]):
        super().__init__()
        self.memory_text = text
        self.memory_index = index
        self.timestamp = timestamp
        self.tags = tags

    def compose(self):
        with Vertical(classes="memory-item-content"):
            yield Label(self.memory_text, classes="memory-text")
            with Horizontal(classes="memory-footer"):
                yield Label(f"[{self.timestamp[:10]}]", classes="memory-date")
                if self.tags:
                    yield Label(f" #{' #'.join(self.tags)}", classes="memory-tags")
        yield Button("X", id=f"delete-mem-{self.memory_index}", variant="error", classes="delete-mem-btn")

    @on(Button.Pressed)
    def on_delete(self):
        self.post_message(self.DeleteRequested(self.memory_index))

class MemorySidebar(Vertical):
    class AddRequested(Message):
        def __init__(self, text: str):
            self.text = text
            super().__init__()

    def compose(self):
        yield Label("BRAIN / MEMORIES", id="memory-sidebar-title")
        with Vertical(id="memory-list"):
            pass
        with Vertical(id="memory-input-area"):
            yield Label("Add to memory:")
            yield Input(placeholder="Type a fact to remember...", id="memory-manual-input")

    def refresh_memories(self, memories: List[Dict[str, Any]]):
        mem_list = self.query_one("#memory-list")
        mem_list.query("*").remove()
        
        for i, mem in enumerate(memories):
            mem_list.mount(MemoryItem(
                mem["text"],
                i,
                mem.get("timestamp", ""),
                mem.get("tags", [])
            ))
        mem_list.scroll_end()

    @on(Input.Submitted, "#memory-manual-input")
    def on_submit(self, event: Input.Submitted):
        if event.value.strip():
            self.post_message(self.AddRequested(event.value.strip()))
            event.input.value = ""
