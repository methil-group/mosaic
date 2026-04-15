import os
from .base import Tool
from .utils import resolve_path
from typing import Dict, Any

class WriteFileTool(Tool):
    def name(self) -> str:
        return "write_file"

    def description(self) -> str:
        return "Write content to a file. Overwrites the file if it already exists."

    async def execute(self, params: Dict[str, Any], workspace: str) -> str:
        path = params.get("path", "")
        content = params.get("content", "")
        if not path:
            return "Error: Missing path parameter"
        
        file_path = resolve_path(path, workspace)
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        
        try:
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(content)
            return f"Successfully wrote to {path}"
        except Exception as e:
            return f"Error: {str(e)}"
