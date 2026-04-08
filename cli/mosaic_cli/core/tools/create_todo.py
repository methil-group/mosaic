import json
from .base import Tool
from typing import Dict, Any

class CreateTodoTool(Tool):
    def name(self) -> str:
        return "create_todo"

    def description(self) -> str:
        return "Create a new todo item. Use 'title' and 'description' parameters. ALWAYS use this tool first if you are starting a new project or feature."

    async def execute(self, params: Dict[str, Any], workspace: str) -> str:
        title = params.get("title", "")
        description = params.get("description", "")
        
        if not title:
            return "Error: Missing title for the todo item."
            
        # Return a JSON string that the UI can parse to update the sidebar
        result = {
            "status": "success",
            "todo": {
                "title": title,
                "description": description
            }
        }
        return json.dumps(result)
