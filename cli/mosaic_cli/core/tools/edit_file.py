import os
from .base import Tool
from .utils import resolve_path
from typing import Dict, Any

class EditFileTool(Tool):
    def name(self) -> str:
        return "edit_file"

    def description(self) -> str:
        return "Perform a surgical find-and-replace in a file. Parameters: 'path', 'old_content' (the exact text to find), 'new_content' (the replacement text). ALWAYS read the file first to get the exact content to replace."

    async def execute(self, params: Dict[str, Any], workspace: str) -> str:
        path = params.get("path", "")
        # Handle both 'old_content' and common assistant hallucination 'content_to_replace'
        old_content = params.get("old_content") or params.get("content_to_replace") or ""
        new_content = params.get("new_content", "")
        
        if not path:
            return "Error: Missing path parameter"
        
        if not old_content:
            return "Error: Missing 'old_content' parameter (the text you want to replace)."
        
        file_path = resolve_path(path, workspace)
        if not os.path.exists(file_path):
            return f"Error: File not found: {path}"
        
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
            
            if old_content not in content:
                return "Error: old_content not found in file. Read the file first to get exact content."
            
            count = content.count(old_content)
            if count > 1:
                return f"Error: old_content found {count} times. Make it more specific to match exactly once."
            
            new_full_content = content.replace(old_content, new_content)
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(new_full_content)
                
            return f"File edited successfully: {path}"
        except Exception as e:
            return f"Error: {str(e)}"
