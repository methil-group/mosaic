import json
from .base import Tool
from .utils import read_todos, write_todos
from typing import Dict, Any

class UpdateTodoTool(Tool):
    def name(self) -> str:
        return "update_todo"

    def description(self) -> str:
        return "Update an existing todo item. Parameters: 'id' (required), 'title', 'description', 'completed' (boolean)."

    async def execute(self, params: Dict[str, Any], workspace: str) -> str:
        todo_id = params.get("id")
        if not todo_id:
            return "Error: Missing 'id' parameter."
            
        todos = read_todos(workspace)
        updated = False
        for todo in todos:
            if todo.get("id") == str(todo_id):
                if "title" in params:
                    todo["title"] = params["title"]
                if "description" in params:
                    todo["description"] = params["description"]
                if "completed" in params:
                    todo["completed"] = str(params["completed"]).lower() == "true"
                updated = True
                break
        
        if not updated:
            return f"Error: Todo with ID {todo_id} not found."
            
        write_todos(workspace, todos)
        
        return json.dumps({
            "status": "success",
            "todos": todos
        }, ensure_ascii=False)
