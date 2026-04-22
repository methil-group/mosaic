import json
from .base import Tool
from typing import Dict, Any

class DeleteTodoTool(Tool):
    def name(self) -> str:
        return "delete_todo"

    def description(self) -> str:
        return "Delete a todo item by its ID."

    async def execute(self, params: Dict[str, Any], workspace: str) -> str:
        todo_id = params.get("todo_id") or params.get("id")
        
        if not todo_id:
            return "Error: Missing todo_id parameter."
            
        # Return a JSON string that the UI can parse to update the sidebar
        result = {
            "status": "success",
            "action": "delete",
            "todo_id": str(todo_id)
        }
        return json.dumps(result, ensure_ascii=False)
