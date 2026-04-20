import os
import json
import pytest
import asyncio
from unittest.mock import patch, MagicMock, AsyncMock
from mosaic_cli.main import Mosaic
from textual.widgets import Input, Label, Static
from mosaic_cli.core.components import MemoryItem, ToolItem

class MockLLM:
    def __init__(self, *args, **kwargs):
        pass

    async def stream_chat(self, model, messages):
        yield {"type": "token", "data": "Mock response"}
        yield {"type": "usage", "data": {"total_tokens": 10}}

    async def fetch_models(self):
        return ["mock-v1"]

    async def get_embedding(self, text: str):
        return [0.1] * 1536

@pytest.mark.asyncio
async def test_memory_and_tools_e2e(temp_workspace):
    # Mock LLM providers and the provider initialization
    with patch("mosaic_cli.main.OpenRouter", MockLLM), \
         patch("mosaic_cli.main.OpenAiProvider", MockLLM), \
         patch("mosaic_cli.main.MemoryManager.store", new_callable=AsyncMock) as mock_store:
        
        mock_store.return_value = True
        
        app = Mosaic(workspace=temp_workspace)
        app.api_key = "test-key"
        
        async with app.run_test() as pilot:
            # 1. Test Tools Sidebar (Ctrl+T)
            await pilot.press("ctrl+t")
            tools_sidebar = app.query_one("#tools-sidebar")
            assert tools_sidebar.display is True
            
            # Verify some tools are listed
            tool_items = tools_sidebar.query(ToolItem)
            assert len(tool_items) > 0
            # Check for a specific tool like 'read_file'
            tool_names = [t.tool_name for t in tool_items]
            assert "read_file" in tool_names
            
            # 2. Test Memory Sidebar (Ctrl+M)
            # Opening memory should close tools
            await pilot.press("ctrl+m")
            memory_sidebar = app.query_one("#memory-sidebar")
            assert memory_sidebar.display is True
            assert tools_sidebar.display is False
            
            # 3. Test Manual Memory Addition
            # Find the input in memory sidebar
            mem_input = app.query_one("#memory-manual-input", Input)
            mem_input.value = "Remember this E2E fact"
            await pilot.press("enter")
            
            # Verify mock was called
            await pilot.pause()
            mock_store.assert_called_with("Remember this E2E fact", tags=["manual"])
            
            # 4. Test Sidebar Mutual Exclusion with History (Ctrl+H)
            await pilot.press("ctrl+h")
            assert app.query_one("#history-sidebar").display is True
            assert memory_sidebar.display is False
            
            # 5. Verify Tool Info
            await pilot.press("ctrl+t")
            # Check the first tool item content
            first_tool = tools_sidebar.query(ToolItem).first()
            assert first_tool.query_one(".tool-item-name", Label).renderable != ""
            assert first_tool.query_one(".tool-item-desc", Static).renderable != ""

            await pilot.press("ctrl+q")

@pytest.mark.asyncio
async def test_memory_deletion_e2e(temp_workspace):
    with patch("mosaic_cli.main.OpenRouter", MockLLM):
        app = Mosaic(workspace=temp_workspace)
        # Pre-seed a memory
        app.memory_manager.memories = [
            {"text": "Fact 1", "timestamp": "2023-01-01", "embedding": [0]*1536, "tags": []}
        ]
        
        async with app.run_test() as pilot:
            await pilot.press("ctrl+m")
            memory_list = app.query_one("#memory-list")
            
            # Verify memory item exists
            mem_items = memory_list.query(MemoryItem)
            assert len(mem_items) == 1
            
            # Simulate delete click
            # In Textual tests, we can click widgets components
            delete_btn = mem_items.first().query_one(".delete-mem-btn")
            await pilot.click(delete_btn)
            
            # Verify it's gone from app state
            assert len(app.memory_manager.memories) == 0
            
            # Verify UI refresh
            await pilot.pause()
            assert len(memory_list.query(MemoryItem)) == 0
            
            await pilot.press("ctrl+q")
