import json
from .base import Tool
from .utils import read_todos
from typing import Dict, Any

class GetTodoListTool(Tool):
    def name(self) -> str:
        return "get_todo_list"

    def description(self) -> str:
        return "Get the current list of todos. Returns a JSON list of todos with their IDs, titles, and completion status."

    async def execute(self, params: Dict[str, Any], workspace: str) -> str:
        todos = read_todos(workspace)
        return json.dumps({
            "status": "success",
            "todos": todos
        }, ensure_ascii=False)
