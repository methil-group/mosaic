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

    def _generate(self, messages: List[Dict[str, str]]) -> str:
        prompt = ""
        if hasattr(self.tokenizer, "apply_chat_template") and self.tokenizer.chat_template is not None:
            prompt = self.tokenizer.apply_chat_template(
                messages, tokenize=False, add_generation_prompt=True
            )
        else:
            # Fallback simple template
            for msg in messages:
                prompt += f"{msg['role']}: {msg['content']}\n"
            prompt += "assistant: "

        response = generate(
            self.model, 
            self.tokenizer, 
            prompt=prompt,
            verbose=True
        )
        return response
