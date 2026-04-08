import os
from typing import List

def resolve_path(path: str, workspace: str) -> str:
    if os.path.isabs(path):
        return path
    return os.path.normpath(os.path.join(workspace, path))

def truncate_result(content: str, max_chars: int = 10000) -> str:
    if len(content) > max_chars:
        return content[:max_chars] + f"\n... (truncated {len(content) - max_chars} characters)"
    return content

def format_with_line_numbers(content: str) -> str:
    lines = content.splitlines()
    return "\n".join(f"{i+1}: {line}" for i, line in enumerate(lines))
