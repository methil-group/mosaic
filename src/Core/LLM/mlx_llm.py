from mlx_lm import load, generate
from src.Framework.LLM.abstract_llm import AbstractLLM
from src.Framework.Tools.tool import Tool
from src.Framework.Utils.tool_utils import ToolUtils
from src.Core.Prompt.prompt_factory import PromptFactory
from typing import List, Dict, Any, Optional
import json


class MLXLLM(AbstractLLM):
    def __init__(self, model_path: str):
        super().__init__(model_path)
        self.model, self.tokenizer = load(model_path)
        self.prompt_factory = PromptFactory()

    def register_tool(self, name: str, func: callable, description: str = "", parameters: Dict[str, Any] = None):
        self.tool_registry.register_tool(name, func, description, parameters)

    def chat(self, prompt: str, system_prompt: str = "", history: Optional[List[Dict[str, str]]] = None, tools: Optional[List[Dict[str, Any]]] = None) -> str:
        if history is None:
            history = []

        if not system_prompt:
            system_prompt = self.prompt_factory.create_system_prompt()

        full_prompt = prompt
        if tools:
            tool_objects = [Tool(name=t['name'], function=lambda: None, description=t.get('description', ''), parameters=t.get('parameters')) for t in tools]
            tool_desc = ToolUtils.format_tools_for_prompt(tool_objects)
            
            usage_examples = ""
            if tools and len(tools) > 0 and 'usage_examples' in tools[0]:
                usage_examples = "\n".join(tools[0]['usage_examples'])
            
            full_prompt = self.prompt_factory.create_tool_prompt(prompt, tool_desc, usage_examples)

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
                
                result_prompt = self.prompt_factory.format_tool_result(response, tool_call.get('name'), result)
                
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
