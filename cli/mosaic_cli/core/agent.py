import re
import uuid
import json
import os
from datetime import datetime
from typing import List, Dict, Any, Callable, Optional, Awaitable
from .memory import MemoryManager
from .prompt import PromptBuilder
from .tools.base import Tool
from .parser import ToolCallParser
from .stream import StreamProcessor
from ..framework.llm.base import LlmProvider

class Agent:
    def __init__(
        self,
        llm: LlmProvider,
        model: str,
        workspace: str,
        user_name: str,
        tools: List[Tool],
        memory_manager: Optional[MemoryManager] = None
    ):
        self.llm = llm
        self.model = model
        self.workspace = workspace
        self.user_name = user_name
        self.tools = tools
        self.memory_manager = memory_manager
        self.messages: List[Dict[str, str]] = []
        self.stopped = False
        
        # Mode settings (agent vs review)
        self.agent_mode = "agent" # Default
        self.approval_queue = None # Set by App if needed
        
        # Initialize logging
        self.log_dir = os.path.join(self.workspace, ".mosaic", "logs")
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
        except Exception:
            # If we really can't log, just continue to avoid crashing the whole agent
            pass

    async def run(
        self,
        user_prompt: str,
        history: List[Dict[str, str]],
        on_event: Callable[[Dict[str, Any]], Awaitable[None]]
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

    async def _emit(self, event: Dict[str, Any], on_event: Callable[[Dict[str, Any]], Any]):
        import asyncio
        import inspect
        res = on_event(event)
        if asyncio.iscoroutine(res) or inspect.isawaitable(res):
            await res

    async def reasoning_loop(self, on_event: Callable[[Dict[str, Any]], Any]):
        total_steps = 0
        consecutive_retries = 0
        consecutive_empty_responses = 0
        while not self.stopped:
            total_steps += 1
            if total_steps > 30:
                await self._emit({"type": "error", "message": "Max steps reached"}, on_event)
                break
            
            processor = StreamProcessor(on_event)
            try:
                async for event in self.llm.stream_chat(self.model, self.messages):
                    if self.stopped:
                        break
                    
                    if event["type"] == "token":
                        await processor.process_token(event["data"])
                    elif event["type"] == "usage":
                        await self._emit({"type": "usage", "data": event["data"]}, on_event)
                    elif event["type"] == "error":
                        await self._emit({"type": "error", "message": event["message"]}, on_event)
                        return
                
                await processor.flush()
                full_text = processor.full_text
                
                self._log(f"Raw LLM Response:\n{full_text}", "LLM_RESPONSE")
            except Exception as e:
                self._log(f"Error in stream: {str(e)}", "ERROR")
                await self._emit({"type": "error", "message": str(e)}, on_event)
                return

            # Check for empty response
            if not full_text.strip():
                # If we just sent a tool result, the model might be stalling
                if self.messages and self.messages[-1]["role"] == "user" and "<tool_response>" in self.messages[-1]["content"]:
                    consecutive_empty_responses += 1
                    if consecutive_empty_responses > 2:
                        self._log("Too many empty responses. Stopping.", "ERROR")
                        await self._emit({"type": "error", "message": "Too many consecutive empty responses from model."}, on_event)
                        break
                    
                    retry_msg = "Error: You returned an empty response. If the previous tool failed, please address the error. If it succeeded, please continue your task or provide a final answer."
                    self._log(f"Empty response detected after tool call. Retrying {consecutive_empty_responses}/2...", "WARNING")
                    self.messages.append({"role": "user", "content": retry_msg})
                    continue
            
            # Reset empty response counter if we got something
            if full_text.strip():
                consecutive_empty_responses = 0

            tool_call = ToolCallParser.parse(full_text)
            if tool_call:
                consecutive_retries = 0
                name, params = tool_call
                call_id = f"toolu-{uuid.uuid4().hex[:12]}"
                self._log(f"Tool Call Detected: {name}({json.dumps(params)})", "TOOL_CALL")
                
                # Emit event to UI
                await self._emit({"type": "tool_started", "name": name, "parameters": params, "call_id": call_id}, on_event)
                
                # Check for Review Mode
                if self.agent_mode == "review" and self.approval_queue:
                    self._log(f"Review Mode: Awaiting approval for {name}", "SYSTEM")
                    await self._emit({"type": "awaiting_approval", "name": name, "parameters": params, "call_id": call_id}, on_event)
                    
                    decision = await self.approval_queue.get()
                    self._log(f"User Decision: {decision}", "SYSTEM")
                    
                    if decision == "reject":
                        result = "Error: User rejected this tool call."
                        await self._emit({"type": "tool_rejected", "name": name, "call_id": call_id}, on_event)
                    else:
                        # Proceed with execution
                        tool = next((t for t in self.tools if t.name() == name), None)
                        if tool:
                            try:
                                result = await tool.execute(params, self.workspace)
                            except Exception as e:
                                result = f"Error: {str(e)}"
                        else:
                            result = f"Error: Tool '{name}' not found"
                else:
                    # Agent-driven mode (Automatic execution)
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
                await self._emit({"type": "tool_finished", "name": name, "result": result, "call_id": call_id}, on_event)
                
                self.messages.append({"role": "assistant", "content": full_text})
                self.messages.append({"role": "user", "content": PromptBuilder.format_tool_result(name, result, call_id)})
            elif "<tool_call>" in full_text:
                consecutive_retries += 1
                self._log(f"Malformed tool call detected. Retry {consecutive_retries}/3", "WARNING")
                if consecutive_retries > 3:
                    self._log("Max retries reached for malformed call. Stopping.", "ERROR")
                    await self._emit({"type": "error", "message": "Too many consecutive malformed tool calls. stopping."}, on_event)
                    break
                
                error_msg = "Error: Invalid tool call format. Ensure you provide a valid JSON object with 'name' and 'arguments' keys inside the <tool_call> tags."
                await self._emit({"type": "token", "data": f"\n[System: {error_msg}]\n"}, on_event)
                self.messages.append({"role": "assistant", "content": full_text})
                self.messages.append({"role": "user", "content": error_msg})
                continue
            else:
                await self._emit({"type": "final_answer", "data": full_text}, on_event)
                break

