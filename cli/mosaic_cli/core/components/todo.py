from textual.widgets import Static, Label, Checkbox
from textual.containers import Vertical, Horizontal

class TodoItem(Horizontal):
    def __init__(self, title: str, description: str, todo_id: str):
        super().__init__()
        self.todo_id = todo_id
        self.todo_title = title
        self.description = description
        self.styles.height = "auto"
        self.styles.margin = (0, 0, 1, 0)

    def compose(self):
        yield Checkbox(id=f"todo-check-{self.todo_id}")
        with Vertical():
            yield Label(f"[bold cyan]{self.todo_title}[/]")
            yield Label(f"[dim]{self.description}[/]", id=f"todo-desc-{self.todo_id}")

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
        # Clear existing todos
        for child in todo_list.children:
            child.remove()
            
        for todo in todos_data:
            tid = todo.get("id", str(len(todo_list.children)))
            title = todo.get("title", "Task")
            # For bulk sync, descriptions might be empty/omitted to save tokens
            desc = todo.get("description", "") 
            item = TodoItem(title, desc, tid)
            todo_list.mount(item)
            # Update checkbox state
            if todo.get("completed"):
                self.call_after_refresh(self.update_todo, tid, True)
                
        todo_list.scroll_end()

    def update_todo(self, todo_id: str, completed: bool):
        try:
            checkbox = self.query_one(f"#todo-check-{todo_id}")
            checkbox.value = completed
        except:
            pass
