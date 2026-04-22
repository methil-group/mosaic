import re
import json
from typing import Dict, Any, Optional, Tuple

class ToolCallParser:
    """Handles the robust extraction and parsing of tool calls from text."""
    
    @staticmethod
    def parse(content: str) -> Optional[Tuple[str, Dict[str, Any]]]:
        """
        Parses text for <tool_call> tags and extracts the first valid JSON tool call.
        Returns (name, arguments) or None.
        """
        try:
            match = re.search(r"<tool_call>(.*?)</(?:tool_call|tool_answer|tool_response)>", content, re.DOTALL)
            if match:
                inner = match.group(1).strip()
            else:
                # Fallback: check if the whole content or a large block is JSON
                inner = content.strip()
            
            # Robust JSON extraction within the string
            starts = [m.start() for m in re.finditer(r"\{", inner)]
            ends = [m.start() for m in re.finditer(r"\}", inner)]
            
            # Try combinations from largest to smallest
            for start in starts:
                for end in reversed(ends):
                    if end <= start:
                        continue
                    
                    block = inner[start:end+1].strip()
                    try:
                        data = json.loads(block)
                        if isinstance(data, dict) and "name" in data:
                            name = str(data["name"])
                            args = data.get("arguments", {})
                            if not isinstance(args, dict):
                                args = {}
                            return name, args
                    except Exception:
                        continue
            
            return None
        except Exception:
            return None

    @staticmethod
    def has_any_call_tag(content: str) -> bool:
        """Quick check if the string contains tool call start tags."""
        return "<tool_call>" in content
