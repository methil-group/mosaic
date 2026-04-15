import os
from typing import List

def resolve_path(path: str, workspace: str) -> str:
    abs_workspace = os.path.abspath(workspace)
    
    # If the path is already absolute and within the workspace, just normalize it
    if os.path.isabs(path):
        normalized_path = os.path.normpath(path)
        if normalized_path.startswith(abs_workspace):
            return normalized_path
            
    # Otherwise, treat it as relative to workspace
    # Remove any absolute path prefix or leading slashes to force relative to workspace
    clean_path = path.lstrip("/").lstrip("\\")
    
    # On Windows, if a path starts with a drive letter, strip it
    if len(clean_path) > 1 and clean_path[1] == ":":
        clean_path = clean_path[2:].lstrip("/").lstrip("\\")
        
    resolved = os.path.normpath(os.path.join(abs_workspace, clean_path))
    
    # Security check: ensure the resolved path is still inside the workspace
    # We use commonpath to avoid prefix-matching different directories (e.g. /a/b prefixing /a/bc)
    try:
        if os.path.commonpath([abs_workspace, resolved]) != abs_workspace:
            raise ValueError(f"Access denied: {path} is outside the workspace {abs_workspace}")
    except ValueError:
        raise ValueError(f"Access denied: {path} is outside the workspace {abs_workspace}")
            
    return resolved

def truncate_result(content: str, max_chars: int = 10000) -> str:
    if len(content) > max_chars:
        return content[:max_chars] + f"\n... (truncated {len(content) - max_chars} characters)"
    return content

def format_with_line_numbers(content: str) -> str:
    lines = content.splitlines()
    return "\n".join(f"{i+1}: {line}" for i, line in enumerate(lines))
