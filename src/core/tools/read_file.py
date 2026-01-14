from pathlib import Path
from src.framework.abstract_tool import AbstractTool, ToolResult

class ReadFileTool(AbstractTool):
    @property
    def name(self) -> str:
        return "read_file"
    
    @property
    def description(self) -> str:
        return "Read the contents of a file"
    
    @property
    def parameters(self) -> dict:
        return {
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "Path to the file to read"
                }
            },
            "required": ["path"]
        }
    
    def execute(self, path: str, **kwargs) -> ToolResult:
        try:
            file_path = Path(path)
            if not file_path.exists():
                return ToolResult(success=False, output="", error=f"File not found: {path}")
            
            if not file_path.is_file():
                return ToolResult(success=False, output="", error=f"Path is not a file: {path}")
                
            content = file_path.read_text(encoding='utf-8')
            return ToolResult(success=True, output=content)
        except Exception as e:
            return ToolResult(success=False, output="", error=str(e))
