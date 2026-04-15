import re
import uuid
import json
import os
from datetime import datetime
from typing import List, Dict, Any, Callable, AsyncIterable, Optional, Tuple
from .prompt import PromptBuilder
from .tools.base import Tool
from ..framework.llm.base import LlmProvider

class Agent:
    def __init__(
        self,
        llm: LlmProvider,
        model: str,
        workspace: str,
        user_name: str,
        tools: List[Tool]
    ):
        self.llm = llm
        self.model = model
        self.workspace = workspace
        self.user_name = user_name
        self.tools = tools
        self.messages: List[Dict[str, str]] = []
        self.stopped = False
        
        # Initialize logging
        self.log_dir = os.path.join(self.workspace, ".log")
        os.makedirs(self.log_dir, exist_ok=True)
        self.session_id = datetime.now().strftime("%Y%m%d_%H%M%S")
        self.log_file = os.path.join(self.log_dir, f"session_{self.session_id}.log")

    def _log(self, data: str, category: str = "INFO"):
        timestamp = datetime.now().isoformat()
        try:
            # Ensure log directory still exists (in case model deletes it)
            os.makedirs(os.path.dirname(self.log_file), exist_ok=True)
            with open(self.log_file, "a", encoding="utf-8") as f:
                f.write(f"[{timestamp}] [{category}] {data}\n")
        except:
            # If we really can't log, just continue to avoid crashing the whole agent
            pass

    async def run(
        self,
        user_prompt: str,
        history: List[Dict[str, str]],
        on_event: Callable[[Dict[str, Any]], None]
    ):
        system_prompt = PromptBuilder.create_system_prompt(self.tools, self.workspace, self.user_name)
        self.messages = [
            {"role": "system", "content": system_prompt},
            *history,
            {"role": "user", "content": user_prompt}
        ]
        
        self._log(f"Starting session with model: {self.model}", "SYSTEM")
        self._log(f"User Prompt: {user_prompt}", "USER")
        
        await self.reasoning_loop(on_event)

    async def reasoning_loop(self, on_event: Callable[[Dict[str, Any]], None]):
        total_steps = 0
        consecutive_retries = 0
        while not self.stopped:
            total_steps += 1
            if total_steps > 30:
                on_event({"type": "error", "message": "Max steps reached"})
                break
            
            full_text = ""
            buffer = ""
            masking = False
            try:
                async for event in self.llm.stream_chat(self.model, self.messages):
                    if self.stopped:
                        break
                    
                    if event["type"] == "token":
                        token = event["data"]
                        full_text += token
                        
                        # Buffering logic for tool masking
                        buffer += token
                        
                        while buffer:
                            if not masking:
                                if "<tool_call>" in buffer:
                                    # Start of a tool call found
                                    pre_tag, post_tag = buffer.split("<tool_call>", 1)
                                    if pre_tag:
                                        on_event({"type": "token", "data": pre_tag})
                                    masking = True
                                    buffer = "<tool_call>" + post_tag
                                elif "<" in buffer:
                                    # Potential tag starting
                                    idx = buffer.find("<")
                                    if idx > 0:
                                        # Emit everything before the first "<"
                                        on_event({"type": "token", "data": buffer[:idx]})
                                        buffer = buffer[idx:]
                                        continue
                                    
                                    # Buffer starts with "<". Check if it's still a possible prefix of "<tool_call>"
                                    if not "<tool_call>".startswith(buffer):
                                        # It's not a tool call tag (might be <thought> or something else)
                                        # Emit the first character and continue
                                        on_event({"type": "token", "data": buffer[0]})
                                        buffer = buffer[1:]
                                        continue
                                    else:
                                        # It's a prefix of "<tool_call>", wait for more tokens
                                        break
                                else:
                                    # No tags at all, emit everything
                                    on_event({"type": "token", "data": buffer})
                                    buffer = ""
                            else:
                                # We are masking content inside <tool_call> tags
                                if "</tool_call>" in buffer:
                                    # End of tool call found
                                    idx = buffer.find("</tool_call>") + len("</tool_call>")
                                    # We don't emit the tool call itself
                                    masking = False
                                    buffer = buffer[idx:]
                                    # Continue processing the rest of the buffer
                                    continue
                                else:
                                    # Still inside a tool call, wait for the closing tag
                                    break
                    
                    elif event["type"] == "usage":
                        on_event({"type": "usage", "data": event["data"]})
                    elif event["type"] == "error":
                        on_event({"type": "error", "message": event["message"]})
                        return
                
                # If anything left in buffer, flush it (only if not masking)
                if buffer and not masking:
                    on_event({"type": "token", "data": buffer})
                
                self._log(f"Raw LLM Response:\n{full_text}", "LLM_RESPONSE")
            except Exception as e:
                self._log(f"Error in stream: {str(e)}", "ERROR")
                on_event({"type": "error", "message": str(e)})
                return

            # Check for empty response
            if not full_text.strip():
                # If we just sent a tool result, the model might be stalling
                if self.messages and self.messages[-1]["role"] == "user" and "<tool_response>" in self.messages[-1]["content"]:
                    consecutive_empty_responses += 1
                    if consecutive_empty_responses > 2:
                        self._log("Too many empty responses. Stopping.", "ERROR")
                        on_event({"type": "error", "message": "Too many consecutive empty responses from model."})
                        break
                    
                    retry_msg = "Error: You returned an empty response. If the previous tool failed, please address the error. If it succeeded, please continue your task or provide a final answer."
                    self._log(f"Empty response detected after tool call. Retrying {consecutive_empty_responses}/2...", "WARNING")
                    self.messages.append({"role": "user", "content": retry_msg})
                    continue
            
            # Reset empty response counter if we got something
            if full_text.strip():
                consecutive_empty_responses = 0

            tool_call = self.parse_tool_call(full_text)
            if tool_call:
                consecutive_retries = 0
                name, params = tool_call
                call_id = f"toolu-{uuid.uuid4().hex[:12]}"
                self._log(f"Tool Call Detected: {name}({json.dumps(params)})", "TOOL_CALL")
                on_event({"type": "tool_started", "name": name, "parameters": params, "call_id": call_id})
                
                tool = next((t for t in self.tools if t.name() == name), None)
                if tool:
                    try:
                        result = await tool.execute(params, self.workspace)
                    except Exception as e:
                        result = f"Error: {str(e)}"
                else:
                    result = f"Error: Tool '{name}' not found"
                
                # Enhanced logging for tool results
                status = "SUCCESS" if not result.startswith("Error:") else "FAILURE"
                self._log(f"Tool Result ({name}) [{status}]: {result[:1000]}", "TOOL_RESULT")
                on_event({"type": "tool_finished", "name": name, "result": result, "call_id": call_id})
                
                self.messages.append({"role": "assistant", "content": full_text})
                self.messages.append({"role": "user", "content": PromptBuilder.format_tool_result(name, result, call_id)})
            elif "<tool_call>" in full_text:
                consecutive_retries += 1
                self._log(f"Malformed tool call detected. Retry {consecutive_retries}/3", "WARNING")
                if consecutive_retries > 3:
                    self._log("Max retries reached for malformed call. Stopping.", "ERROR")
                    on_event({"type": "error", "message": "Too many consecutive malformed tool calls. stopping."})
                    break
                
                error_msg = "Error: Invalid tool call format. Ensure you provide a valid JSON object with 'name' and 'arguments' keys inside the <tool_call> tags."
                on_event({"type": "token", "data": f"\n[System: {error_msg}]\n"})
                self.messages.append({"role": "assistant", "content": full_text})
                self.messages.append({"role": "user", "content": error_msg})
                continue
            else:
                on_event({"type": "final_answer", "data": full_text})
                break

    def parse_tool_call(self, content: str) -> Optional[Tuple[str, Dict[str, Any]]]:
        try:
            match = re.search(r"<tool_call>(.*?)</tool_call>", content, re.DOTALL)
            if not match:
                return None
            
            inner = match.group(1).strip()
            
            json_str = inner
            
            # Robust JSON extraction:
            # Try to find all possible JSON objects within the tags by attempting to parse 
            # every substring starting with '{' and ending with '}'.
            
            starts = [m.start() for m in re.finditer(r"\{", json_str)]
            ends = [m.start() for m in re.finditer(r"\}", json_str)]
            
            # Try from longest to shortest to catch outer objects first
            for start in starts:
                for end in reversed(ends):
                    if end <= start:
                        continue
                    
                    block = json_str[start:end+1].strip()
                    try:
                        data = json.loads(block)
                        if isinstance(data, dict) and "name" in data:
                            name = str(data["name"])
                            args = data.get("arguments", {})
                            if not isinstance(args, dict):
                                args = {}
                            return name, args
                    except:
                        continue
            
            self._log(f"No valid tool call JSON found in content: {inner[:200]}...", "PARSE_ERROR")
            return None
        except Exception as e:
            self._log(f"Unexpected error in parse_tool_call: {str(e)}", "PARSE_ERROR")
            return None
