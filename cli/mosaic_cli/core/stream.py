import re
from typing import Callable, Any, Dict

class StreamProcessor:
    """Handles stateful buffering and masking of tokens during streaming."""
    
    def __init__(self, on_event: Callable[[Dict[str, Any]], None]):
        self.on_event = on_event
        self.buffer = ""
        self.masking = False
        self.full_text = ""

    def process_token(self, token: str):
        """Processes a new token, managing buffering and masking logic."""
        self.full_text += token
        self.buffer += token
        
        while self.buffer:
            if not self.masking:
                if "<tool_call>" in self.buffer:
                    # Start of a tool call found
                    pre_tag, post_tag = self.buffer.split("<tool_call>", 1)
                    if pre_tag:
                        self.on_event({"type": "token", "data": pre_tag})
                    self.masking = True
                    self.buffer = "<tool_call>" + post_tag
                elif "<" in self.buffer:
                    # Potential tag starting
                    idx = self.buffer.find("<")
                    if idx > 0:
                        # Emit everything before the first "<"
                        self.on_event({"type": "token", "data": self.buffer[:idx]})
                        self.buffer = self.buffer[idx:]
                        continue
                    
                    # Buffer starts with "<". Check if it's still a possible prefix of "<tool_call>"
                    if not "<tool_call>".startswith(self.buffer):
                        # It's not a tool call tag
                        self.on_event({"type": "token", "data": self.buffer[0]})
                        self.buffer = self.buffer[1:]
                        continue
                    else:
                        # It's a prefix of "<tool_call>", wait for more tokens
                        break
                else:
                    # No tags at all, emit everything
                    self.on_event({"type": "token", "data": self.buffer})
                    self.buffer = ""
            else:
                # Masking content inside <tool_call> tags
                end_match = re.search(r"</(?:tool_call|tool_answer|tool_response)>", self.buffer)
                if end_match:
                    # End of tool call found
                    idx = end_match.end()
                    self.masking = False
                    self.buffer = self.buffer[idx:]
                    continue
                else:
                    # Still inside a tool call, wait for closing tag
                    break

    def flush(self):
        """Flushes any remaining content in the buffer (if not masking)."""
        if self.buffer and not self.masking:
            self.on_event({"type": "token", "data": self.buffer})
            self.buffer = ""
