from mlx_lm import load, generate
from src.Framework.LLM.abstract_llm import AbstractLLM
from src.Framework.Tools.tool import Tool
from src.Framework.Utils.tool_utils import ToolUtils
from typing import List, Dict, Any, Optional
import json


class MLXLLM(AbstractLLM):
    def __init__(self, model_path: str):
        super().__init__(model_path)
        self.model, self.tokenizer = load(model_path)

    def register_tool(self, name: str, func: callable, description: str = "", parameters: Dict[str, Any] = None):
        self.tool_registry.register_tool(name, func, description, parameters)

    def chat(self, prompt: str, system_prompt: str = "", history: Optional[List[Dict[str, str]]] = None, tools: Optional[List[Dict[str, Any]]] = None) -> str:
        if history is None:
            history = []

        full_prompt = prompt
        if tools:
            tool_objects = [Tool(name=t['name'], function=lambda: None, description=t.get('description', ''), parameters=t.get('parameters')) for t in tools]
            tool_desc = ToolUtils.format_tools_for_prompt(tool_objects)
            full_prompt = f"{tool_desc}\n\nUser: {prompt}\n\nAssistant: I'll help you with that."

        if hasattr(self.tokenizer, "apply_chat_template") and self.tokenizer.chat_template is not None:
            messages = [{"role": "system", "content": system_prompt}] + history + [{"role": "user", "content": full_prompt}]
            prompt = self.tokenizer.apply_chat_template(
                messages, tokenize=False, add_generation_prompt=True
            )

        response = generate(
            self.model, 
            self.tokenizer, 
            prompt=prompt,
            verbose=True
        )

        tool_calls = ToolUtils.extract_tool_calls(response)
        if tool_calls:
            for tool_call in tool_calls:
                result = ToolUtils.execute_tool_call(tool_call, self.tool_registry)
                
                result_prompt = f"{response}\n<tool_result>{json.dumps({'tool': tool_call.get('name'), 'result': result})}</tool_result>\nContinue:"
                
                if hasattr(self.tokenizer, "apply_chat_template") and self.tokenizer.chat_template is not None:
                    messages.append({"role": "assistant", "content": response})
                    messages.append({"role": "user", "content": result_prompt})
                    prompt = self.tokenizer.apply_chat_template(
                        messages, tokenize=False, add_generation_prompt=True
                    )
                
                response = generate(
                    self.model, 
                    self.tokenizer, 
                    prompt=prompt,
                    verbose=True
                )

        return response

