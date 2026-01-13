"""Search code tool implementation."""

import re
from pathlib import Path

from src.framework.abstract_tool import AbstractTool, ToolResult


class SearchCodeTool(AbstractTool):
    """Tool to search for patterns in code files."""
    
    # Common code file extensions
    CODE_EXTENSIONS = {
        ".py", ".js", ".ts", ".jsx", ".tsx", ".java", ".c", ".cpp", ".h",
        ".go", ".rs", ".rb", ".php", ".swift", ".kt", ".scala", ".sh",
        ".bash", ".zsh", ".json", ".yaml", ".yml", ".toml", ".xml",
        ".html", ".css", ".scss", ".sass", ".less", ".sql", ".md", ".txt"
    }
    
    @property
    def name(self) -> str:
        return "search_code"
    
    @property
    def description(self) -> str:
        return "Search for a pattern in code files within a directory."
    
    @property
    def parameters(self) -> dict:
        return {
            "type": "object",
            "properties": {
                "pattern": {
                    "type": "string",
                    "description": "The pattern to search for (supports regex)"
                },
                "path": {
                    "type": "string",
                    "description": "The directory to search in"
                },
                "file_pattern": {
                    "type": "string",
                    "description": "Optional glob pattern to filter files (e.g., '*.py')"
                }
            },
            "required": ["pattern", "path"]
        }
    
    def execute(self, pattern: str, path: str, file_pattern: str | None = None, **kwargs) -> ToolResult:
        try:
            dir_path = Path(path).resolve()
            
            if not dir_path.exists():
                return ToolResult(
                    success=False,
                    output="",
                    error=f"Directory not found: {path}"
                )
            
            # Compile regex pattern
            try:
                regex = re.compile(pattern, re.IGNORECASE)
            except re.error as e:
                return ToolResult(
                    success=False,
                    output="",
                    error=f"Invalid regex pattern: {e}"
                )
            
            results = []
            glob_pattern = file_pattern or "**/*"
            
            for file_path in dir_path.glob(glob_pattern):
                if not file_path.is_file():
                    continue
                
                # Skip non-code files if no specific pattern
                if not file_pattern and file_path.suffix.lower() not in self.CODE_EXTENSIONS:
                    continue
                
                try:
                    content = file_path.read_text(encoding="utf-8")
                    lines = content.split("\n")
                    
                    for line_num, line in enumerate(lines, 1):
                        if regex.search(line):
                            rel_path = file_path.relative_to(dir_path)
                            results.append(f"{rel_path}:{line_num}: {line.strip()}")
                            
                            # Limit results
                            if len(results) >= 50:
                                results.append("... (results truncated, showing first 50 matches)")
                                return ToolResult(
                                    success=True,
                                    output="\n".join(results)
                                )
                except (UnicodeDecodeError, PermissionError):
                    continue
            
            if not results:
                return ToolResult(
                    success=True,
                    output=f"No matches found for pattern: {pattern}"
                )
            
            return ToolResult(
                success=True,
                output="\n".join(results)
            )
        except Exception as e:
            return ToolResult(
                success=False,
                output="",
                error=f"Error searching code: {str(e)}"
            )
