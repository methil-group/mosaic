"""Read file tool implementation."""

from pathlib import Path

from src.framework.abstract_tool import AbstractTool, ToolResult


class ReadFileTool(AbstractTool):
    """Tool to read the contents of a file."""
    
    @property
    def name(self) -> str:
        return "read_file"
    
    @property
    def description(self) -> str:
        return "Read the contents of a file at the specified path."
    
    @property
    def parameters(self) -> dict:
        return {
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "The path to the file to read"
                }
            },
            "required": ["path"]
        }
    
    def execute(self, path: str, **kwargs) -> ToolResult:
        try:
            file_path = Path(path).resolve()
            
            if not file_path.exists():
                return ToolResult(
                    success=False,
                    output="",
                    error=f"File not found: {path}"
                )
            
            if not file_path.is_file():
                return ToolResult(
                    success=False,
                    output="",
                    error=f"Path is not a file: {path}"
                )
            
            content = file_path.read_text(encoding="utf-8")
            return ToolResult(
                success=True,
                output=content
            )
        except PermissionError:
            return ToolResult(
                success=False,
                output="",
                error=f"Permission denied: {path}"
            )
        except UnicodeDecodeError:
            return ToolResult(
                success=False,
                output="",
                error=f"Cannot read binary file: {path}"
            )
        except Exception as e:
            return ToolResult(
                success=False,
                output="",
                error=f"Error reading file: {str(e)}"
            )
