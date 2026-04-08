import json
import re
from .base import Tool
from typing import Dict, Any

class SyncTodoListTool(Tool):
    def name(self) -> str:
        return "sync_todo_list"

    def description(self) -> str:
        return "Sync the entire todo list. Pass everything inside a <data> tag with multiple <todo id='..' completed='true/false'>Title</todo> elements."

    async def execute(self, params: Dict[str, Any], workspace: str) -> str:
        data = params.get("data", "")
        if not data:
            return "Error: Empty or missing 'data' parameter."
            
        # Parse XML-like todos
        todo_matches = re.findall(r"<todo\s+id=[\"'](.*?)[\"']\s+completed=[\"'](.*?)[\"']>(.*?)</todo>", data, re.DOTALL)
        
        todos = []
        for tid, completed, title in todo_matches:
            todos.append({
                "id": tid,
                "title": title.strip(),
                "completed": completed.lower() == "true"
            })
            
        if not todos:
            return "Error: No valid <todo> elements found in 'data'."

        return json.dumps({
            "status": "success",
            "todos": todos
        })
