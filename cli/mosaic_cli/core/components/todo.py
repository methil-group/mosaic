from textual.widgets import Static, Label, Checkbox
from textual.containers import Vertical, Horizontal
from typing import Any

class TodoItem(Horizontal):
    def __init__(self, title: Any, description: Any, todo_id: Any, completed: bool = False):
        super().__init__()
        self.todo_id = str(todo_id)
        self.todo_title = str(title)
        self.description = str(description)
        self.completed = completed

    def compose(self):
        status = "[x]" if self.completed else "[ ]"
        yield Label(status, id=f"todo-status-{self.todo_id}", classes="todo-status")
        with Vertical():
            yield Label(self.todo_title, classes="todo-item-title")
            if self.description:
                yield Static(self.description, classes="todo-item-desc", id=f"todo-desc-{self.todo_id}")

