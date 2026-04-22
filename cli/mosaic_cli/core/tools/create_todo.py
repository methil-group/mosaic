import json
import uuid
from .base import Tool
from .utils import read_todos, write_todos
from typing import Dict, Any

class CreateTodoTool(Tool):
    def name(self) -> str:
        return "create_todo"

    def description(self) -> str:
        return "Create a new todo item. Use 'title' and 'description' parameters."

    async def execute(self, params: Dict[str, Any], workspace: str) -> str:
        title = params.get("title", "")
        description = params.get("description", "")
        
        if not title:
            return "Error: Missing title for the todo item."
            
        todos = read_todos(workspace)
        new_todo = {
            "id": str(uuid.uuid4())[:8],
            "title": title,
            "description": description,
            "completed": False
        }
        todos.append(new_todo)
        write_todos(workspace, todos)
        
        return json.dumps({
            "status": "success",
            "todos": todos
        }, ensure_ascii=False)
