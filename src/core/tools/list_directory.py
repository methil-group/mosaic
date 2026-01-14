from pathlib import Path
from src.framework.abstract_tool import AbstractTool, ToolResult

class ListDirectoryTool(AbstractTool):
    @property
    def name(self) -> str:
        return "list_directory"
    
    @property
    def description(self) -> str:
        return "List contents of a directory"
    
    @property
    def parameters(self) -> dict:
        return {
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "Path to the directory"
                }
            },
            "required": ["path"]
        }
    
    def execute(self, path: str, **kwargs) -> ToolResult:
        try:
            dir_path = Path(path)
            if not dir_path.exists():
                return ToolResult(success=False, output="", error=f"Directory not found: {path}")
            
            if not dir_path.is_dir():
                return ToolResult(success=False, output="", error=f"Path is not a directory: {path}")
                
            items = []
            for item in dir_path.iterdir():
                prefix = "[DIR] " if item.is_dir() else "[FILE]"
                items.append(f"{prefix} {item.name}")
            
            # Sort for consistent output
            items.sort()
            
            if not items:
                return ToolResult(success=True, output="Directory is empty")
                
            return ToolResult(success=True, output="\n".join(items))
        except Exception as e:
            return ToolResult(success=False, output="", error=str(e))
