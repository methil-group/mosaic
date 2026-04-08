import re
import json
import asyncio
from typing import List, Dict, Any, Callable, Optional, Tuple
import os

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

    def _log(self, message: str):
        if self.log_path:
            with open(self.log_path, "a", encoding="utf-8") as f:
                f.write(message + "\n")

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
        while step < self.max_steps:
            step += 1
            if self.verbose:
                print(f"\n--- Step {step} ---")
            self._log(f"\n--- STEP {step} ---")
            
            full_text = ""
            self._log("\n[LLM RESPONSE START]")
            async for event in self.llm.stream_chat(self.model, self.messages):
                if event["type"] == "token":
                    t = event["data"]
                    full_text += t
                    if self.verbose:
                        print(t, end="", flush=True)
                    self._log(t)
            self._log("[LLM RESPONSE END]\n")
            
            if self.verbose:
                print("\n")
            
            tool_call = self._parse_tool_call(full_text)
            if tool_call:
                name, params = tool_call
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
                
                log_res = result[:500] + "..." if len(result) > 500 else result
                self._log(f"TOOL RESULT:\n{log_res}")
                if self.verbose:
                    print(f"Tool Result: {result[:200]}..." if len(result) > 200 else f"Tool Result: {result}")
                
                self.messages.append({"role": "assistant", "content": full_text})
                self.messages.append({"role": "user", "content": f"<tool_result>\n<name>{name}</name>\n<content>\n{result}\n</content>\n</tool_result>"})
            else:
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

To call a tool, use the following format:
<tool_call>
<name>tool_name</name>
<parameters>
<param1>value1</param1>
<param2>value2</param2>
</parameters>
</tool_call>

Be precise and complete your tasks step by step. When you are done, provide a final summary of your work.
"""

    def _parse_tool_call(self, content: str) -> Optional[Tuple[str, Dict[str, Any]]]:
        try:
            match = re.search(r"<tool_call>(.*?)</tool_call>", content, re.DOTALL)
            if not match:
                return None
            
            inner = match.group(1)
            name_match = re.search(r"<name>(.*?)</name>", inner, re.DOTALL)
            if not name_match:
                return None
            name = name_match.group(1).strip()
            
            params = {}
            params_match = re.search(r"<parameters>(.*?)</parameters>", inner, re.DOTALL)
            if params_match:
                p_inner = params_match.group(1)
                tags = re.findall(r"<(.*?)>(.*?)</\1>", p_inner, re.DOTALL)
                for tag, val in tags:
                    params[tag] = val.strip()
            
            return name, params
        except:
            return None
