import os
import fnmatch
from pathlib import Path
from src.framework.abstract_tool import AbstractTool, ToolResult

class SearchCodeTool(AbstractTool):
    @property
    def name(self) -> str:
        return "search_code"
    
    @property
    def description(self) -> str:
        return "Search for a pattern in code files"
    
    @property
    def parameters(self) -> dict:
        return {
            "type": "object",
            "properties": {
                "pattern": {
                    "type": "string",
                    "description": "Text pattern to search for"
                },
                "path": {
                    "type": "string",
                    "description": "Directory to search in"
                },
                "file_pattern": {
                    "type": "string",
                    "description": "Glob pattern for file names to include (e.g. *.py)", 
                    "default": "*"
                }
            },
            "required": ["pattern", "path"]
        }
    
    def execute(self, pattern: str, path: str, file_pattern: str = "*", **kwargs) -> ToolResult:
        try:
            search_path = Path(path)
            if not search_path.exists():
                return ToolResult(success=False, output="", error=f"Path not found: {path}")
            
            matches = []
            
            # Walk through the directory
            for root, _, files in os.walk(search_path):
                # Filter files by pattern
                for filename in fnmatch.filter(files, file_pattern):
                    file_full_path = Path(root) / filename
                    try:
                        # Read file content
                        # Skip binary files or decoding errors
                        try:
                            content = file_full_path.read_text(encoding='utf-8')
                        except UnicodeDecodeError:
                            continue
                            
                        if pattern in content:
                            matches.append(f"{file_full_path}: {pattern}")
                            
                    except Exception:
                        continue
            
            if not matches:
                return ToolResult(success=True, output="No matches found")
                
            return ToolResult(success=True, output="\n".join(matches))
            
        except Exception as e:
            return ToolResult(success=False, output="", error=str(e))
