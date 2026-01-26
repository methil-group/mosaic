from src.Framework.Utils.logger import ui_logger, llm_logger

class StreamProcessor:
    """Parses raw LLM stream to separate main text from technical blocks."""
    def __init__(self):
        self.buffer = ""
        self.in_block = False
        self.tags = {
            "<tool_call>": "</tool_call>",
            "<thought>": "</thought>",
            "[TOOL_CALLS]": None # Special handling or assume end of msg?
        }
        self.current_closer = None
        
    def process(self, chunk: str) -> list:
        # Returns list of (type, content)
        # types: 'main', 'start_block', 'block_content', 'end_block'
        
        # log input
        ui_logger.log(f"[StreamProcessor] Processing chunk: {repr(chunk)}")
        
        events = []
        self.buffer += chunk
        
        ui_logger.log(f"[StreamProcessor] Buffer after append: {repr(self.buffer)}")
        
        while self.buffer:
            if not self.in_block:
                # Find earliest starting tag
                min_idx = len(self.buffer)
                found_tag = None
                for tag in self.tags:
                    idx = self.buffer.find(tag)
                    if idx != -1 and idx < min_idx:
                        min_idx = idx
                        found_tag = tag
                
                if found_tag:
                    ui_logger.log(f"[StreamProcessor] Found tag: {found_tag} at index {min_idx}")
                    # Emit content before tag
                    if min_idx > 0:
                        events.append(('main', self.buffer[:min_idx]))
                    
                    # Enter block
                    events.append(('start_block', found_tag))
                    events.append(('block_content', found_tag)) # Show tag
                    
                    self.current_closer = self.tags[found_tag]
                    self.buffer = self.buffer[min_idx + len(found_tag):]
                    
                    if self.current_closer:
                        self.in_block = True
                        ui_logger.log(f"[StreamProcessor] Entered block. Closer: {self.current_closer}")
                    else:
                        # No closer: marker tag, stay out of block
                        self.in_block = False
                        events.append(('end_block', None))
                else:
                    # Check for partial tag at end
                    safe = True
                    for tag in self.tags:
                        # Check if buffer ends with a prefix of a tag
                        for i in range(1, len(tag)):
                            if self.buffer.endswith(tag[:i]):
                                safe = False
                                ui_logger.log(f"[StreamProcessor] Unsafe buffer (partial tag): {repr(self.buffer)}")
                                break
                        if not safe: break
                    
                    if safe:
                        events.append(('main', self.buffer))
                        self.buffer = ""
                    else:
                        # Emit safe part if buffer is long
                        if len(self.buffer) > 50:
                            # Keep last 20 chars just in case
                            emit = self.buffer[:-20]
                            events.append(('main', emit))
                            self.buffer = self.buffer[-20:]
                            ui_logger.log(f"[StreamProcessor] Emitted safe part, buffer now: {repr(self.buffer)}")
                        else:
                            ui_logger.log(f"[StreamProcessor] Buffer withheld for safety: {repr(self.buffer)}")
                        break
            else:
                # In block
                if self.current_closer:
                    idx = self.buffer.find(self.current_closer)
                    if idx != -1:
                        # Found closer
                        closer_len = len(self.current_closer)
                        # Emit content including closer
                        content = self.buffer[:idx + closer_len]
                        events.append(('block_content', content))
                        events.append(('end_block', None))
                        self.in_block = False
                        self.buffer = self.buffer[idx + closer_len:]
                        self.current_closer = None
                        ui_logger.log(f"[StreamProcessor] Found closer. Exited block. Buffer remainder: {repr(self.buffer)}")
                    else:
                        # Emit safe part
                        safe_closer = True
                        for i in range(1, len(self.current_closer)):
                            if self.buffer.endswith(self.current_closer[:i]):
                                safe_closer = False
                                break
                        
                        if safe_closer:
                            events.append(('block_content', self.buffer))
                            self.buffer = ""
                        else:
                             if len(self.buffer) > 50:
                                emit = self.buffer[:-20]
                                events.append(('block_content', emit))
                                self.buffer = self.buffer[-20:]
                             break
                else:
                    self.in_block = False
                    
        ui_logger.log(f"[StreamProcessor] Returning {len(events)} events")
        return events
