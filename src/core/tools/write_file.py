"""Write file tool implementation."""

from pathlib import Path

from src.framework.abstract_tool import AbstractTool, ToolResult


class WriteFileTool(AbstractTool):
    """Tool to write content to a file."""
    
    def __init__(self, require_confirmation: bool = True):
        self._require_confirmation = require_confirmation
        self._pending_write: dict | None = None
    
    @property
    def name(self) -> str:
        return "write_file"
    
    @property
    def description(self) -> str:
        return "Write content to a file at the specified path. Creates parent directories if needed."
    
    @property
    def parameters(self) -> dict:
        return {
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "The path to the file to write"
                },
                "content": {
                    "type": "string",
                    "description": "The content to write to the file"
                }
            },
            "required": ["path", "content"]
        }
    
    def execute(self, path: str, content: str, confirmed: bool = False, **kwargs) -> ToolResult:
        try:
            file_path = Path(path).resolve()
            
            # If confirmation is required and not yet confirmed
            if self._require_confirmation and not confirmed:
                self._pending_write = {"path": path, "content": content}
                preview = content[:500] + "..." if len(content) > 500 else content
                return ToolResult(
                    success=True,
                    output=f"[PENDING CONFIRMATION] Write to {path}:\n```\n{preview}\n```\nUse /confirm to approve or /reject to cancel."
                )
            
            # Create parent directories if needed
            file_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Write the file
            file_path.write_text(content, encoding="utf-8")
            
            self._pending_write = None
            return ToolResult(
                success=True,
                output=f"Successfully wrote {len(content)} characters to {path}"
            )
        except PermissionError:
            return ToolResult(
                success=False,
                output="",
                error=f"Permission denied: {path}"
            )
        except Exception as e:
            return ToolResult(
                success=False,
                output="",
                error=f"Error writing file: {str(e)}"
            )
    
    def confirm_pending(self) -> ToolResult | None:
        """Confirm and execute the pending write."""
        if self._pending_write:
            return self.execute(
                self._pending_write["path"],
                self._pending_write["content"],
                confirmed=True
            )
        return None
    
    def reject_pending(self) -> None:
        """Reject the pending write."""
        self._pending_write = None
