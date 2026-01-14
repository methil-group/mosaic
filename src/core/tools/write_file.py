from pathlib import Path
from typing import Optional
from src.framework.abstract_tool import AbstractTool, ToolResult

class WriteFileTool(AbstractTool):
    def __init__(self, require_confirmation: bool = True):
        self._require_confirmation = require_confirmation
        self._pending_op: Optional[dict] = None

    @property
    def name(self) -> str:
        return "write_file"
    
    @property
    def description(self) -> str:
        return "Write content to a file"
    
    @property
    def parameters(self) -> dict:
        return {
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "Path to the file to write"
                },
                "content": {
                    "type": "string",
                    "description": "Content to write"
                }
            },
            "required": ["path", "content"]
        }
    
    def execute(self, path: str, content: str, **kwargs) -> ToolResult:
        if self._require_confirmation:
            self._pending_op = {"path": path, "content": content}
            return ToolResult(success=True, output="PENDING confirmation. Call confirm_pending() to execute.")
        
        return self._do_write(path, content)
    
    def confirm_pending(self) -> ToolResult:
        if not self._pending_op:
            return ToolResult(success=False, output="", error="No pending operation to confirm")
        
        path = self._pending_op["path"]
        content = self._pending_op["content"]
        self._pending_op = None
        
        return self._do_write(path, content)
        
    def _do_write(self, path: str, content: str) -> ToolResult:
        try:
            file_path = Path(path)
            file_path.parent.mkdir(parents=True, exist_ok=True)
            file_path.write_text(content, encoding='utf-8')
            return ToolResult(success=True, output=f"Successfully wrote to {path}")
        except Exception as e:
            return ToolResult(success=False, output="", error=str(e))
