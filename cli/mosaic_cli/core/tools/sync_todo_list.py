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
            
        # Parse XML-like todos more robustly
        # First find all <todo ...>...</todo> tags
        todo_tags = re.findall(r"<todo\s+(.*?)>(.*?)</todo>", data, re.DOTALL)
        
        todos = []
        for attrs_str, title in todo_tags:
            # Extract id and completed from the attributes string
            id_match = re.search(r"id=[\"'](.*?)[\"']", attrs_str, re.DOTALL)
            comp_match = re.search(r"completed=[\"'](.*?)[\"']", attrs_str, re.DOTALL)
            desc_match = re.search(r"description=[\"'](.*?)[\"']", attrs_str, re.DOTALL)
            
            if id_match:
                todos.append({
                    "id": id_match.group(1),
                    "title": title.strip(),
                    "completed": comp_match.group(1).lower() == "true" if comp_match else False,
                    "description": desc_match.group(1) if desc_match else ""
                })
            
        if not todos:
            return f"Error: No valid <todo> elements found in data. Found raw content: {data[:100]}..."

        return json.dumps({
            "status": "success",
            "todos": todos
        }, ensure_ascii=False)
