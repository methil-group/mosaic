from typing import Dict, Any
from .base import Tool

class RecallMemoriesTool(Tool):
    def __init__(self, memory_manager):
        self.memory_manager = memory_manager

    def name(self) -> str:
        return "recall_memories"

    def description(self) -> str:
        return "Searches your long-term memory for relevant past facts, preferences, or project details. Use this when you need context about the user or the project that isn't in the current chat history."

    async def execute(self, params: Dict[str, Any], workspace: str) -> str:
        query = params.get("query")
        if not query:
            return "Error: No query provided."
        
        limit = params.get("limit", 5)
        results = await self.memory_manager.search(query, limit)
        
        if not results:
            return "No relevant memories found."
        
        formatted_results = []
        for i, res in enumerate(results, 1):
            text = res["text"]
            score = res["score"]
            tags = ", ".join(res["tags"]) if res["tags"] else "none"
            formatted_results.append(f"{i}. [Match: {score:.2f}] {text} (Tags: {tags})")
            
        return "Found the following relevant memories:\n" + "\n".join(formatted_results)
