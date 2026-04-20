from textual.widgets import Static, Label, Checkbox
from textual.containers import Vertical, Horizontal
from typing import Any

class TodoItem(Horizontal):
    def __init__(self, title: Any, description: Any, todo_id: Any):
        super().__init__()
        self.todo_id = str(todo_id)
        self.todo_title = str(title)
        self.description = str(description)

    def compose(self):
        yield Checkbox(id=f"todo-check-{self.todo_id}")
        with Vertical():
            yield Label(self.todo_title, classes="todo-item-title")
            if self.description:
                yield Static(self.description, classes="todo-item-desc", id=f"todo-desc-{self.todo_id}")

class TodoSidebar(Vertical):
    def compose(self):
        yield Label("TASKS / TODO", id="todo-sidebar-title")
        yield Vertical(id="todo-list")

    def add_todo(self, title: str, description: str, todo_id: str):
        todo_list = self.query_one("#todo-list")
        todo_list.mount(TodoItem(title, description, todo_id))
        todo_list.scroll_end()

    def sync_todos(self, todos_data: list):
        todo_list = self.query_one("#todo-list")
        # Reliably clear existing todos using query
        todo_list.query("*").remove()
            
        for i, todo in enumerate(todos_data):
            # Fallback to index if ID is missing (shouldn't happen with new sync logic)
            tid = str(todo.get("id", i))
            title = todo.get("title", "Task")
            # For bulk sync, descriptions might be empty/omitted to save tokens
            desc = todo.get("description", "") 
            item = TodoItem(title, desc, tid)
            if todo.get("completed"):
                item.add_class("completed")
            todo_list.mount(item)
                
        todo_list.scroll_end()

    def update_todo(self, todo_id: str, completed: bool):
        try:
            item = None
            # Find the item with this todo_id
            for child in self.query("#todo-list > TodoItem"):
                if getattr(child, "todo_id", None) == todo_id:
                    item = child
                    break
            
            if item:
                if completed:
                    item.add_class("completed")
                else:
                    item.remove_class("completed")
                
                checkbox = item.query_one(f"#todo-check-{todo_id}")
                checkbox.value = completed
        except Exception:
            pass
