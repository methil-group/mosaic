import os
from .base import Tool
from .utils import resolve_path
from typing import Dict, Any

class ListDirectoryTool(Tool):
    def name(self) -> str:
        return "list_directory"

    def description(self) -> str:
        return "List the contents of a directory."

    async def execute(self, params: Dict[str, Any], workspace: str) -> str:
        path = params.get("path", ".")
        dir_path = resolve_path(path, workspace)
        
        if not os.path.exists(dir_path):
            return f"Error: Directory not found: {path}"
        
        if not os.path.isdir(dir_path):
            return f"Error: Path is not a directory: {path}"
        
        try:
            items = os.listdir(dir_path)
            lines = []
            for item in items:
                item_path = os.path.join(dir_path, item)
                if os.path.isdir(item_path):
                    lines.append(f"[DIR] {item}")
                else:
                    lines.append(f"[FILE] {item}")
            return "\n".join(lines) if lines else "(empty directory)"
        except Exception as e:
            return f"Error: {str(e)}"
