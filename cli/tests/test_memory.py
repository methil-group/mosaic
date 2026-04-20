import pytest
import os
import json
import asyncio
from unittest.mock import AsyncMock, MagicMock
from mosaic_cli.core.memory import MemoryManager
from mosaic_cli.framework.llm.base import LlmProvider

class MockLlmProvider(LlmProvider):
    async def get_embedding(self, text: str):
        # Return a deterministic embedding based on text to test proximity
        # Use simple mapping for testing purposes
        if "Python" in text:
            return [1.0] * 1536
        if "Rust" in text:
            return [-1.0] * 1536
        return [0.0] * 1536

    async def stream_chat(self, model, messages):
        yield {"type": "token", "data": "dummy"}

    async def fetch_models(self):
        return ["mock-model"]

@pytest.fixture
def memory_manager(tmp_path):
    mock_llm = MockLlmProvider()
    return MemoryManager(str(tmp_path), mock_llm)

@pytest.mark.asyncio
async def test_store_and_search_logic(memory_manager):
    # Store two distinct memories
    await memory_manager.store("I love Python development", tags=["python"])
    await memory_manager.store("I prefer Rust for performance", tags=["rust"])
    
    # Search for Python - should return the python memory first
    results = await memory_manager.search("Python", limit=1)
    assert len(results) == 1
    assert "Python" in results[0]["text"]
    assert results[0]["score"] == pytest.approx(1.0)
    
    # Search for Rust - should return the rust memory first
    results = await memory_manager.search("Rust", limit=1)
    assert len(results) == 1
    assert "Rust" in results[0]["text"]
    assert results[0]["score"] == pytest.approx(1.0) # Cosine same direction

@pytest.mark.asyncio
async def test_delete_out_of_bounds(memory_manager):
    await memory_manager.store("One")
    assert not memory_manager.delete(5) # Out of bounds
    assert not memory_manager.delete(-1)
    assert len(memory_manager.memories) == 1

@pytest.mark.asyncio
async def test_memory_corruption_recovery(tmp_path):
    workspace = str(tmp_path)
    dot_mosaic = os.path.join(workspace, ".mosaic")
    os.makedirs(dot_mosaic, exist_ok=True)
    
    # Create a corrupted JSON file
    with open(os.path.join(dot_mosaic, "memories.json"), "w") as f:
        f.write("invalid json {[[")
    
    mock_llm = MockLlmProvider()
    mgr = MemoryManager(workspace, mock_llm)
    
    # Should handle corruption by starting with empty list
    assert mgr.memories == []
    
    # Should still be able to store new memories
    await mgr.store("New memory")
    assert len(mgr.memories) == 1

@pytest.mark.asyncio
async def test_empty_search(memory_manager):
    # Search when no memories exist
    results = await memory_manager.search("anything")
    assert results == []

@pytest.mark.asyncio
async def test_persistence_integrity(tmp_path):
    workspace = str(tmp_path)
    mock_llm = MockLlmProvider()
    
    mgr = MemoryManager(workspace, mock_llm)
    await mgr.store("Memory 1", tags=["t1"])
    await mgr.store("Memory 2", tags=["t2"])
    
    # Check file content
    with open(mgr.memory_file, "r") as f:
        data = json.load(f)
        assert len(data) == 2
        assert data[0]["text"] == "Memory 1"
        assert data[1]["tags"] == ["t2"]

@pytest.mark.asyncio
async def test_delete_persistence(memory_manager):
    await memory_manager.store("ToBeDeleted")
    await memory_manager.store("KeepMe")
    
    assert len(memory_manager.memories) == 2
    memory_manager.delete(0)
    assert len(memory_manager.memories) == 1
    assert memory_manager.memories[0]["text"] == "KeepMe"
    
    # Re-verify persistence
    with open(memory_manager.memory_file, "r") as f:
        data = json.load(f)
        assert len(data) == 1
        assert data[0]["text"] == "KeepMe"
