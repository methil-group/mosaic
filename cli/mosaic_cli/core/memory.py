import json
import os
import math
from datetime import datetime
from typing import List, Dict, Any, Optional
from ..framework.llm.base import LlmProvider

from ..framework.llm.base import LlmProvider

class EmbeddingService:
    """Handles the generation of embeddings using an LLM provider."""
    def __init__(self, llm_provider: LlmProvider):
        self.llm_provider = llm_provider

    async def get_embedding(self, text: str) -> List[float]:
        return await self.llm_provider.get_embedding(text)

class MemoryStore:
    """Handles the persistence of memories in a JSON file."""
    def __init__(self, workspace: str):
        self.memory_dir = os.path.join(workspace, ".mosaic")
        self.memory_file = os.path.join(self.memory_dir, "memories.json")
        self.memories: List[Dict[str, Any]] = []
        self.load()

    def load(self):
        if os.path.exists(self.memory_file):
            try:
                with open(self.memory_file, "r", encoding="utf-8") as f:
                    self.memories = json.load(f)
            except Exception:
                self.memories = []
        else:
            self.memories = []

    def save(self):
        if not os.path.exists(self.memory_dir):
            os.makedirs(self.memory_dir, exist_ok=True)
        with open(self.memory_file, "w", encoding="utf-8") as f:
            json.dump(self.memories, f, indent=2, ensure_ascii=False)

    def add(self, entry: Dict[str, Any]):
        self.memories.append(entry)
        self.save()

    def delete(self, index: int) -> bool:
        if 0 <= index < len(self.memories):
            self.memories.pop(index)
            self.save()
            return True
        return False

class MemoryManager:
    """Coordinates embedding and storage services to provide RAG capabilities."""
    def __init__(self, workspace: str, llm_provider: LlmProvider):
        self.embedding_service = EmbeddingService(llm_provider)
        self.store_service = MemoryStore(workspace)

    @property
    def memories(self):
        return self.store_service.memories

    @memories.setter
    def memories(self, value):
        self.store_service.memories = value

    @property
    def memory_file(self):
        return self.store_service.memory_file

    async def store(self, text: str, tags: Optional[List[str]] = None) -> bool:
        """Generates an embedding and stores the text in memory."""
        try:
            embedding = await self.embedding_service.get_embedding(text)
            self.store_service.add({
                "text": text,
                "embedding": embedding,
                "timestamp": datetime.now().isoformat(),
                "tags": tags or []
            })
            return True
        except Exception as e:
            print(f"Error storing memory: {e}")
            return False

    async def search(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Searches for relevant memories using semantic similarity."""
        if not self.memories:
            return []

        try:
            query_embedding = await self.embedding_service.get_embedding(query)
            
            scored_memories = []
            for mem in self.memories:
                score = self._cosine_similarity(query_embedding, mem["embedding"])
                scored_memories.append((score, mem))
            
            scored_memories.sort(key=lambda x: x[0], reverse=True)
            
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

    def delete(self, index: int) -> bool:
        return self.store_service.delete(index)

    def _cosine_similarity(self, v1: List[float], v2: List[float]) -> float:
        """Calculates cosine similarity between two vectors."""
        if len(v1) != len(v2):
            return 0.0
        dot_product = sum(a * b for a, b in zip(v1, v2))
        magnitude1 = math.sqrt(sum(a * a for a in v1))
        magnitude2 = math.sqrt(sum(b * b for b in v2))
        return dot_product / (magnitude1 * magnitude2) if magnitude1 > 0 and magnitude2 > 0 else 0.0
