import os
from .base import Tool
from .utils import resolve_path, ensure_not_protected_path
from typing import Dict, Any

class DeleteFileTool(Tool):
    def name(self) -> str:
        return "delete_file"

    def description(self) -> str:
        return "Delete a file from the workspace."

    async def execute(self, params: Dict[str, Any], workspace: str) -> str:
        path = params.get("path", "")
        if not path:
            return "Error: Missing path parameter"
        
        try:
            ensure_not_protected_path(path, workspace)
            file_path = resolve_path(path, workspace)
            
            if not os.path.exists(file_path):
                return f"Error: File not found: {path}"
            
            if os.path.isdir(file_path):
                return f"Error: {path} is a directory. delete_file only works on files. Use run_command for directories if needed (restricted)."
            
            os.remove(file_path)
            return f"Successfully deleted {path}"
        except Exception as e:
            return f"Error: {str(e)}"
