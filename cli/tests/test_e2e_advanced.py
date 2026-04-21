import os
import json
import pytest
import asyncio
from unittest.mock import patch, MagicMock, AsyncMock
from mosaic_cli.main import Mosaic
from textual.widgets import Input, Label, Static, DirectoryTree
from mosaic_cli.core.components import MemoryItem, ToolItem

class MockLLM:
    def __init__(self, *args, **kwargs):
        pass

    async def stream_chat(self, model, messages):
        yield {"type": "token", "data": "Mock response"}
        yield {"type": "usage", "data": {"total_tokens": 10}}
        yield {"type": "final_answer", "data": "Mock response"}

    async def fetch_models(self):
        return ["mock-v1"]

    async def get_embedding(self, text: str):
        return [0.1] * 1536

@pytest.fixture
def workspace_with_files(temp_workspace):
    # Create some dummy files to test the tree
    workspace_path = temp_workspace
    os.makedirs(os.path.join(workspace_path, "src"), exist_ok=True)
    with open(os.path.join(workspace_path, "main.py"), "w") as f:
        f.write("print('hello')")
    with open(os.path.join(workspace_path, "src/utils.py"), "w") as f:
        f.write("def foo(): pass")
    return workspace_path

@pytest.mark.asyncio
async def test_cmd_click_file_tree_integration(workspace_with_files):
    """Test that Cmd+Click on a file tree node appends the path to the input."""
    with patch("mosaic_cli.main.OpenRouter", MockLLM), \
         patch("mosaic_cli.main.OpenAiProvider", MockLLM):
        
        app = Mosaic(workspace=workspace_with_files)
        
        async with app.run_test() as pilot:
            # 1. Expand the tree (it should be visible by default)
            tree = app.query_one("#workspace-tree")
            
            # 2. Wait for tree to load
            await pilot.pause()
            
            # 3. Simulate a Cmd+Click (we'll use the FilteredDirectoryTree's custom logic)
            # Find the first file node (main.py)
            # We can't easily click by ID because nodes don't have stable IDs, 
            # so we'll simulate the message directly or use the pilot.click with a node check.
            
            # Find main.py node
            root_node = tree.root
            main_py_node = next(child for child in root_node.children if "main.py" in str(child.label))
            
            # Instead of pilot.click (which requires coordinates), we'll post the message 
            # that FilteredDirectoryTree would post on a meta-click.
            # This validates the Mosaic.handle_file_cmd_clicked logic.
            # But let's try to be even more E2E and override on_click manually or call it.
            
            from textual.events import Click
            # Simulate a click on the tree widget at some Y coordinate that matches main.py
            # For simplicity, we trigger the message.
            from mosaic_cli.core.components.file_tree import FilteredDirectoryTree
            msg = FilteredDirectoryTree.FileCmdClicked(os.path.join(workspace_with_files, "main.py"))
            tree.post_message(msg)
            
            await pilot.pause()
            
            # Verify input updated
            user_input = app.query_one("#user-input", Input)
            assert user_input.value == "@main.py"
            
            # Try second click
            tree.post_message(FilteredDirectoryTree.FileCmdClicked(os.path.join(workspace_with_files, "src/utils.py")))
            await pilot.pause()
            assert user_input.value == "@main.py @src/utils.py"
            
            await pilot.press("ctrl+q")

@pytest.mark.asyncio
async def test_mandatory_persistence_at_startup(temp_workspace):
    """Verify that a session is saved immediately on launch even if empty."""
    with patch("mosaic_cli.main.OpenRouter", MockLLM), \
         patch("mosaic_cli.main.OpenAiProvider", MockLLM):
        
        app = Mosaic(workspace=temp_workspace)
        session_id = app.current_session_id
        
        async with app.run_test() as pilot:
            # Check disk
            chat_file = os.path.join(app.session.chats_dir, f"chat_{session_id}.json")
            assert os.path.exists(chat_file)
            
            with open(chat_file, "r") as f:
                data = json.load(f)
                assert data["session_id"] == session_id
                assert data["history"] == []
                
            await pilot.press("ctrl+q")

@pytest.mark.asyncio
async def test_new_chat_flow_persistence(temp_workspace):
    """Verify that clicking New Chat creates a fresh persisted session."""
    with patch("mosaic_cli.main.OpenRouter", MockLLM), \
         patch("mosaic_cli.main.OpenAiProvider", MockLLM):
        
        app = Mosaic(workspace=temp_workspace)
        initial_session_id = app.current_session_id
        
        async with app.run_test() as pilot:
            # 1. Open history
            await pilot.press("ctrl+h")
            
            # 2. Add some history (simulated)
            app.history = [{"role": "user", "content": "Test"}]
            app.save_chat()
            
            # 3. Create a new chat
            # We'll use the action/event handler
            app.handle_new_chat()
            
            await pilot.pause()
            
            # Check state
            new_session_id = app.current_session_id
            assert new_session_id != initial_session_id
            assert app.history == []
            
            # Check disk for new session
            new_chat_file = os.path.join(app.session.chats_dir, f"chat_{new_session_id}.json")
            assert os.path.exists(new_chat_file)
            
            await pilot.press("ctrl+q")
