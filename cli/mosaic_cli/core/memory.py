import json
import os
import math
from datetime import datetime
from typing import List, Dict, Any, Optional
from ..framework.llm.base import LlmProvider

class MemoryManager:
    def __init__(self, workspace: str, llm_provider: LlmProvider):
        self.workspace = workspace
        self.llm_provider = llm_provider
        self.memory_dir = os.path.join(workspace, ".mosaic")
        self.memory_file = os.path.join(self.memory_dir, "memories.json")
        self.memories: List[Dict[str, Any]] = []
        self._load_memories()

    def _load_memories(self):
        if os.path.exists(self.memory_file):
            try:
                with open(self.memory_file, "r", encoding="utf-8") as f:
                    self.memories = json.load(f)
            except Exception:
                self.memories = []
        else:
            self.memories = []

    def _save_memories(self):
        if not os.path.exists(self.memory_dir):
            os.makedirs(self.memory_dir, exist_ok=True)
        
        with open(self.memory_file, "w", encoding="utf-8") as f:
            json.dump(self.memories, f, indent=2, ensure_ascii=False)

    async def store(self, text: str, tags: Optional[List[str]] = None):
        """Generates an embedding and stores the text in memory."""
        try:
            embedding = await self.llm_provider.get_embedding(text)
            memory_entry = {
                "text": text,
                "embedding": embedding,
                "timestamp": datetime.now().isoformat(),
                "tags": tags or []
            }
            self.memories.append(memory_entry)
            self._save_memories()
            return True
        except Exception as e:
            print(f"Error storing memory: {e}")
            return False

    async def search(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Searches for relevant memories using semantic similarity."""
        if not self.memories:
            return []

        try:
            query_embedding = await self.llm_provider.get_embedding(query)
            
            scored_memories = []
            for mem in self.memories:
                score = self._cosine_similarity(query_embedding, mem["embedding"])
                scored_memories.append((score, mem))
            
            # Sort by score descending
            scored_memories.sort(key=lambda x: x[0], reverse=True)
            
            # Return top results
            results = []
            for score, mem in scored_memories[:limit]:
                results.append({
                    "text": mem["text"],
                    "score": score,
                    "timestamp": mem["timestamp"],
                    "tags": mem["tags"]
                })
            return results
        except Exception as e:
            print(f"Error searching memory: {e}")
            return []

    def delete(self, index: int):
        """Deletes a memory by index and saves."""
        if 0 <= index < len(self.memories):
            self.memories.pop(index)
            self._save_memories()
            return True
        return False

    def _cosine_similarity(self, v1: List[float], v2: List[float]) -> float:
        """Calculates cosine similarity between two vectors."""
        if len(v1) != len(v2):
            return 0.0
        
        dot_product = sum(a * b for a, b in zip(v1, v2))
        magnitude1 = math.sqrt(sum(a * a for a in v1))
        magnitude2 = math.sqrt(sum(b * b for b in v2))
        
        if magnitude1 == 0 or magnitude2 == 0:
            return 0.0
            
        return dot_product / (magnitude1 * magnitude2)
