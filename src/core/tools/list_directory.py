"""List directory tool implementation."""

from pathlib import Path
from datetime import datetime

from src.framework.abstract_tool import AbstractTool, ToolResult


class ListDirectoryTool(AbstractTool):
    """Tool to list directory contents."""
    
    @property
    def name(self) -> str:
        return "list_directory"
    
    @property
    def description(self) -> str:
        return "List the contents of a directory."
    
    @property
    def parameters(self) -> dict:
        return {
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "The path to the directory to list"
                },
                "recursive": {
                    "type": "boolean",
                    "description": "Whether to list recursively (default: false)"
                }
            },
            "required": ["path"]
        }
    
    def execute(self, path: str, recursive: bool = False, **kwargs) -> ToolResult:
        try:
            dir_path = Path(path).resolve()
            
            if not dir_path.exists():
                return ToolResult(
                    success=False,
                    output="",
                    error=f"Directory not found: {path}"
                )
            
            if not dir_path.is_dir():
                return ToolResult(
                    success=False,
                    output="",
                    error=f"Path is not a directory: {path}"
                )
            
            entries = []
            pattern = "**/*" if recursive else "*"
            
            for item in sorted(dir_path.glob(pattern)):
                rel_path = item.relative_to(dir_path)
                if item.is_dir():
                    entries.append(f"📁 {rel_path}/")
                else:
                    size = self._format_size(item.stat().st_size)
                    entries.append(f"📄 {rel_path} ({size})")
            
            if not entries:
                return ToolResult(
                    success=True,
                    output="(empty directory)"
                )
            
            return ToolResult(
                success=True,
                output="\n".join(entries)
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
                error=f"Error listing directory: {str(e)}"
            )
    
    def _format_size(self, size: int) -> str:
        """Format file size in human-readable format."""
        for unit in ["B", "KB", "MB", "GB"]:
            if size < 1024:
                return f"{size:.1f}{unit}"
            size /= 1024
        return f"{size:.1f}TB"
