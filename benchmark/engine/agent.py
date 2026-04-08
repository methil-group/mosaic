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
        tools: List[Any]
    ):
        self.llm = llm
        self.model = model
        self.workspace = workspace
        self.tools = tools
        self.messages = []
        self.max_steps = 20

    async def run(self, task: str):
        print(f"Starting agent with task: {task}")
        
        system_prompt = self._create_system_prompt()
        self.messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": task}
        ]
        
        step = 0
        while step < self.max_steps:
            step += 1
            print(f"\n--- Step {step} ---")
            
            full_text = ""
            async for event in self.llm.stream_chat(self.model, self.messages):
                if event["type"] == "token":
                    full_text += event["data"]
                    print(event["data"], end="", flush=True)
            
            print("\n")
            
            tool_call = self._parse_tool_call(full_text)
            if tool_call:
                name, params = tool_call
                print(f"Tool Call: {name}({params})")
                
                tool = next((t for t in self.tools if t.name() == name), None)
                if tool:
                    try:
                        result = await tool.execute(params, self.workspace)
                    except Exception as e:
                        result = f"Error: {str(e)}"
                else:
                    result = f"Error: Tool '{name}' not found"
                
                print(f"Tool Result: {result[:200]}..." if len(result) > 200 else f"Tool Result: {result}")
                
                self.messages.append({"role": "assistant", "content": full_text})
                self.messages.append({"role": "user", "content": f"<tool_result>\n<name>{name}</name>\n<content>\n{result}\n</content>\n</tool_result>"})
            else:
                print("Final Answer received or no tool call.")
                return full_text
        
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
