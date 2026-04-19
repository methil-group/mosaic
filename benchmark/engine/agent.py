import re
import json
import asyncio
from typing import List, Dict, Any, Callable, Optional, Tuple
import os
import uuid

class BenchmarkAgent:
    def __init__(
        self,
        llm,
        model: str,
        workspace: str,
        tools: List[Any],
        log_path: Optional[str] = None,
        verbose: bool = True
    ):
        self.llm = llm
        self.model = model
        self.workspace = workspace
        self.tools = tools
        self.messages = []
        self.max_steps = 20
        self.log_path = log_path
        self.verbose = verbose
        self.tool_counts = {}
        self.total_tokens = 0

    def _log(self, message: str, end: str = "\n"):
        if self.log_path:
            with open(self.log_path, "a", encoding="utf-8") as f:
                f.write(message + end)

    async def run(self, task: str):
        self._log(f"=== NEW RUN for Model: {self.model} ===")
        self._log(f"Workspace: {self.workspace}")
        
        system_prompt = self._create_system_prompt()
        self._log("\n--- SYSTEM PROMPT ---\n" + system_prompt)
        self._log("\n--- USER TASK ---\n" + task)
        
        if self.verbose:
            print(f"Starting agent with task: {task}")
        
        self.messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": task}
        ]
        
        step = 0
        consecutive_retries = 0
        while step < self.max_steps:
            step += 1
            if self.verbose:
                print(f"\n--- Step {step} ---")
            self._log(f"\n--- STEP {step} ---")
            
            full_text = ""
            self._log("\n[LLM RESPONSE START]")
            usage_received = False
            async for event in self.llm.stream_chat(self.model, self.messages):
                if event["type"] == "token":
                    t = event["data"]
                    full_text += t
                    if self.verbose:
                        print(t, end="", flush=True)
                    self._log(t, end="")
                elif event["type"] == "usage":
                    self.total_tokens += event["data"].get("completion_tokens", 0)
                    usage_received = True
            
            if not usage_received and full_text:
                # Fallback: estimate tokens (approx 4 chars per token)
                estimated_tokens = max(1, len(full_text) // 4)
                self.total_tokens += estimated_tokens
                
            self._log("[LLM RESPONSE END]\n")
            
            if self.verbose:
                print("\n")
            
            tool_call = self._parse_tool_call(full_text)
            if tool_call:
                consecutive_retries = 0
                name, params = tool_call
                call_id = f"toolu-{uuid.uuid4().hex[:12]}"
                self.tool_counts[name] = self.tool_counts.get(name, 0) + 1
                if self.verbose:
                    print(f"Tool Call: {name}({params})")
                self._log(f"TOOL CALL DETECTED: {name}\nParameters: {json.dumps(params, indent=2)}")
                
                tool = next((t for t in self.tools if t.name() == name), None)
                if tool:
                    try:
                        result = await tool.execute(params, self.workspace)
                    except Exception as e:
                        result = f"Error: {str(e)}"
                else:
                    result = f"Error: Tool '{name}' not found"
                
                log_res = str(result)[:500] + "..." if len(str(result)) > 500 else str(result)
                self._log(f"TOOL RESULT:\n{log_res}")
                if self.verbose:
                    print(f"Tool Result: {str(result)[:200]}..." if len(str(result)) > 200 else f"Tool Result: {result}")
                
                # Format as <tool_response>
                content = result
                if isinstance(result, str):
                    try:
                        content = json.loads(result)
                    except:
                        content = {"message": result}
                
                response_data = {
                    "tool_call_id": call_id,
                    "name": name,
                    "content": content
                }
                
                self.messages.append({"role": "assistant", "content": full_text})
                self.messages.append({"role": "user", "content": f"<tool_response>\n{json.dumps(response_data)}\n</tool_response>"})
            elif "<tool_call>" in full_text:
                consecutive_retries += 1
                self.tool_counts["_malformed_"] = self.tool_counts.get("_malformed_", 0) + 1
                
                if consecutive_retries > 3:
                    self._log(f"MALFORMED TOOL CALL DETECTED (Retry limit reached: {consecutive_retries}/3)")
                    self._log("Too many malformed tool calls. stopping.")
                    return "Error: Too many malformed tool calls"
                
                self._log(f"MALFORMED TOOL CALL DETECTED (Retry {consecutive_retries}/3)")
                
                error_msg = "Error: Invalid tool call format. Ensure you provide a valid JSON object with 'name' and 'arguments' keys inside the <tool_call> tags."
                self.messages.append({"role": "assistant", "content": full_text})
                self.messages.append({"role": "user", "content": error_msg})
                continue
            else:
                if not full_text.strip():
                    consecutive_retries += 1
                    
                    if consecutive_retries <= 3:
                        self._log(f"EMPTY RESPONSE DETECTED (Retry {consecutive_retries}/3)")
                        if self.verbose:
                            print(f"Empty response, retrying ({consecutive_retries}/3)...")
                        # Skip adding to messages to keep it clean, just retry
                        continue
                    else:
                        self._log(f"EMPTY RESPONSE DETECTED (Retry limit reached: {consecutive_retries}/3)")
                        self._log("Too many empty responses. stopping.")
                        return "Error: Too many empty responses"

                self._log("Final Answer or no tool call received.")
                if self.verbose:
                    print("Final Answer received or no tool call.")
                return full_text
        
        if self.verbose:
            print("Max steps reached.")
        return "Error: Max steps reached"

    def _create_system_prompt(self) -> str:
        tools_desc = "\n".join([f"- {t.name()}: {t.description()}" for t in self.tools])
        return f"""You are an agentic coding assistant. Your workspace is: {self.workspace}

Available tools:
{tools_desc}

To call a tool, you MUST use the following XML format. DO NOT use your native tool calling syntax or special tokens like <|channel|> or <|message|>.
<tool_call>
{{"name": "tool_name", "arguments": {{"param1": "value1", "param2": "value2"}}}}
</tool_call>

Be precise and complete your tasks step by step. When you are done, provide a final summary of your work.
"""

    def _parse_tool_call(self, content: str) -> Optional[Tuple[str, Dict[str, Any]]]:
        # Try Strategy 1: XML Format (Default)
        match = re.search(r"<tool_call>(.*?)</(?:tool_call|tool_answer|tool_response)>", content, re.DOTALL)
        if match:
            try:
                inner = match.group(1).strip()
                data = json.loads(inner)
                name = data.get("name")
                params = data.get("arguments", {})
                if name:
                    return name, params
            except:
                pass

        # Try Strategy 2: Native Channel/Message Format (gpt-oss/llama-3 style)
        # Format: <|channel|>analysis to=container.exec code<|message|>{"cmd":["bash","-lc","ls -R"]}<|call|>
        if "<|message|>" in content:
            msg_match = re.search(r"<\|message\|>(.*?)(?:<\|call\|>|$)", content, re.DOTALL)
            if msg_match:
                try:
                    data = json.loads(msg_match.group(1).strip())
                    # If it's a bash command, map to run_command
                    if "cmd" in data and isinstance(data["cmd"], list):
                        # Simple mapping: join the list if it looks like a bash command
                        cmd_list = data["cmd"]
                        if len(cmd_list) > 1 and "bash" in cmd_list[0]:
                             # Extract actual command from -c or -lc
                             for i, arg in enumerate(cmd_list):
                                 if arg in ["-c", "-lc"] and i + 1 < len(cmd_list):
                                     return "run_command", {"command": cmd_list[i+1]}
                        # Fallback: join all
                        return "run_command", {"command": " ".join(cmd_list)}
                except:
                    pass

        # Try Strategy 3: Pure JSON block
        json_match = re.search(r"({.*})", content, re.DOTALL)
        if json_match:
            try:
                data = json.loads(json_match.group(1).strip())
                if "name" in data and "parameters" in data:
                    return data["name"], data["parameters"]
                if "tool" in data and "args" in data:
                    return data["tool"], data["args"]
                if "cmd" in data: # Direct command call
                    return "run_command", {"command": data["cmd"] if isinstance(data["cmd"], str) else " ".join(data["cmd"])}
            except:
                pass

        return None
