from typing import Dict, Any
from .base import Tool

class StoreMemoryTool(Tool):
    def __init__(self, memory_manager):
        self.memory_manager = memory_manager

    def name(self) -> str:
        return "store_memory"

    def description(self) -> str:
        return "Saves important facts, preferences, or project details to long-term memory for future recall. Use this when the user tells you something you should remember forever."

    async def execute(self, params: Dict[str, Any], workspace: str) -> str:
        text = params.get("text")
        if not text:
            return "Error: No text provided to store."
        
        tags = params.get("tags", [])
        success = await self.memory_manager.store(text, tags)
        
        if success:
            return f"Successfully stored in long-term memory: '{text}'"
        else:
            return "Error: Failed to generate embeddings or store memory. Ensure your LLM provider supports embeddings."
