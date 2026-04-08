from textual.widgets import Static, Label
from textual.containers import Vertical

class TodoItem(Static):
    def __init__(self, title: str, description: str):
        super().__init__()
        self.todo_title = title
        self.description = description

    def render(self) -> str:
        return f"[bold cyan]• {self.todo_title}[/]\n  [dim]{self.description}[/]"

class TodoSidebar(Vertical):
    def compose(self):
        yield Label("TASKS / TODO", id="todo-sidebar-title")
        yield Vertical(id="todo-list")

    def add_todo(self, title: str, description: str):
        todo_list = self.query_one("#todo-list")
        todo_list.mount(TodoItem(title, description))
        todo_list.scroll_end()
