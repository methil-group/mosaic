import json
import re
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
        
        await self.reasoning_loop(on_event)

    async def reasoning_loop(self, on_event: Callable[[Dict[str, Any]], None]):
        total_steps = 0
        while not self.stopped:
            total_steps += 1
            if total_steps > 30:
                on_event({"type": "error", "message": "Max steps reached"})
                break
            
            full_text = ""
            try:
                async for event in self.llm.stream_chat(self.model, self.messages):
                    if self.stopped:
                        break
                    
                    if event["type"] == "token":
                        token = event["data"]
                        full_text += token
                        on_event({"type": "token", "data": token})
                    elif event["type"] == "usage":
                        on_event({"type": "usage", "data": event["data"]})
                    elif event["type"] == "error":
                        on_event({"type": "error", "message": event["message"]})
                        return
            except Exception as e:
                on_event({"type": "error", "message": str(e)})
                return

            tool_call = self.parse_tool_call(full_text)
            if tool_call:
                name, params = tool_call
                on_event({"type": "tool_started", "name": name, "parameters": params})
                
                tool = next((t for t in self.tools if t.name() == name), None)
                if tool:
                    try:
                        result = await tool.execute(params, self.workspace)
                    except Exception as e:
                        result = f"Error: {str(e)}"
                else:
                    result = f"Error: Tool '{name}' not found"
                
                on_event({"type": "tool_finished", "name": name, "result": result})
                
                self.messages.append({"role": "assistant", "content": full_text})
                self.messages.append({"role": "user", "content": PromptBuilder.format_tool_result(name, result)})
            else:
                on_event({"type": "final_answer", "data": full_text})
                break

    def parse_tool_call(self, content: str) -> Optional[Tuple[str, Dict[str, Any]]]:
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
                # Simple parser for <tag>value</tag>
                tags = re.findall(r"<(.*?)>(.*?)</\1>", p_inner, re.DOTALL)
                for tag, val in tags:
                    params[tag] = val.strip()
            
            return name, params
        except:
            return None
