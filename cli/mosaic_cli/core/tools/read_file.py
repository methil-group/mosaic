import os
from .base import Tool
from .utils import resolve_path, format_with_line_numbers, truncate_result
from typing import Dict, Any

class ReadFileTool(Tool):
    def name(self) -> str:
        return "read_file"

    def description(self) -> str:
        return "Read the contents of a file. Returns the full file content with line numbers."

    async def execute(self, params: Dict[str, Any], workspace: str) -> str:
        path = params.get("path", "")
        if not path:
            return "Error: Missing path parameter"
        
        file_path = resolve_path(path, workspace)
        if not os.path.exists(file_path):
            return f"Error: File not found: {path} (Resolved to: {file_path}). Working in workspace: {workspace}"
        
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
            return truncate_result(format_with_line_numbers(content))
        except Exception as e:
            return f"Error: {str(e)}"
