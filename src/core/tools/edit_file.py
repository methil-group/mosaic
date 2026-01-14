from pathlib import Path
from src.framework.abstract_tool import AbstractTool, ToolResult

class EditFileTool(AbstractTool):
    @property
    def name(self) -> str:
        return "edit_file"
    
    @property
    def description(self) -> str:
        return "Replace exact text in a file"
    
    @property
    def parameters(self) -> dict:
        return {
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "Path to the file to edit"
                },
                "old_text": {
                    "type": "string",
                    "description": "Exact text to replace"
                },
                "new_text": {
                    "type": "string",
                    "description": "New text to insert"
                }
            },
            "required": ["path", "old_text", "new_text"]
        }
    
    def execute(self, path: str, old_text: str, new_text: str, **kwargs) -> ToolResult:
        try:
            file_path = Path(path)
            if not file_path.exists():
                return ToolResult(success=False, output="", error=f"File not found: {path}")
            
            content = file_path.read_text(encoding='utf-8')
            if old_text not in content:
                preview = content[:500] + "..." if len(content) > 500 else content
                return ToolResult(success=False, output="", error=f"Text not found in file. Preview:\n{preview}")
            
            new_content = content.replace(old_text, new_text, 1)
            file_path.write_text(new_content, encoding='utf-8')
            
            return ToolResult(success=True, output=f"Successfully edited {path}")
        except Exception as e:
            return ToolResult(success=False, output="", error=str(e))
