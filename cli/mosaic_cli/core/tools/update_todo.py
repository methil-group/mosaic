import json
from .base import Tool
from typing import Dict, Any

class UpdateTodoTool(Tool):
    def name(self) -> str:
        return "update_todo"

    def description(self) -> str:
        return "Update a todo item status. Use 'id' and 'completed' (boolean) parameters. Use this to track your progress."

    async def execute(self, params: Dict[str, Any], workspace: str) -> str:
        todo_id = params.get("id")
        completed = params.get("completed")
        
        if todo_id is None:
            return "Error: Missing 'id' parameter."
        if completed is None:
            return "Error: Missing 'completed' parameter."
            
        result = {
            "status": "success",
            "todo": {
                "id": str(todo_id),
                "completed": bool(completed)
            }
        }
        return json.dumps(result)
