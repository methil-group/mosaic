import os
import json
import pytest
from unittest.mock import MagicMock
from mosaic_cli.main import Mosaic
from mosaic_cli.core.components.todo import TodoItem, TodoSidebar
from mosaic_cli.core.components.history import HistorySidebar
from textual.widgets import Select

@pytest.fixture
def temp_workspace(tmp_path):
    workspace = tmp_path / "project"
    workspace.mkdir()
    return str(workspace)

@pytest.mark.asyncio
async def test_provider_settings_visibility(temp_workspace):
    app = Mosaic(workspace=temp_workspace)
    async with app.run_test():
        # Initial state (default: openrouter)
        assert app.query_one("#openrouter-settings").display is True
        assert app.query_one("#openai-settings").display is False
        assert app.query_one("#lmstudio-settings").display is False

        # Change to openai
        select = app.query_one("#provider-select", Select)
        select.value = "openai"
        # The event handler should trigger
        app.update_provider_settings_visibility("openai")
        
        assert app.query_one("#openrouter-settings").display is False
        assert app.query_one("#openai-settings").display is True
        assert app.query_one("#lmstudio-settings").display is False

@pytest.mark.asyncio
async def test_chat_persistence(temp_workspace):
    app = Mosaic(workspace=temp_workspace)
    app.history = [{"role": "user", "content": "Hello"}, {"role": "assistant", "content": "Hi"}]
    
    # Test saving
    app.save_chat()
    chat_file = os.path.join(app.chats_dir, f"chat_{app.current_session_id}.json")
    assert os.path.exists(chat_file)
    
    with open(chat_file, "r") as f:
        data = json.load(f)
        assert data["session_id"] == app.current_session_id
        assert len(data["history"]) == 2
        assert data["history"][0]["content"] == "Hello"

    # Test loading
    old_session_id = app.current_session_id
    app.history = []
    app.load_chat(old_session_id)
    assert len(app.history) == 2
    assert app.history[0]["role"] == "user"

@pytest.mark.asyncio
async def test_todo_management(temp_workspace):
    sidebar = TodoSidebar()
    # Mocking todo list
    todo_list = MagicMock()
    sidebar.query_one = MagicMock(return_value=todo_list)
    
    # Test adding todo
    sidebar.add_todo("Task 1", "Desc 1", "1")
    assert todo_list.mount.called
    
    # Test updating todo state (CSS class)
    item = TodoItem("Task 2", "Desc 2", "2")
    # Manually check class addition
    item.add_class("completed")
    assert "completed" in item.classes

@pytest.mark.asyncio
async def test_history_sidebar_refresh(temp_workspace):
    sidebar = HistorySidebar()
    chats_dir = os.path.join(temp_workspace, ".mosaic", "chats")
    os.makedirs(chats_dir, exist_ok=True)
    
    # Create a dummy chat
    session_id = "20240420_120000"
    with open(os.path.join(chats_dir, f"chat_{session_id}.json"), "w") as f:
        json.dump({"history": []}, f)
        
    # Mock query_one for refresh
    history_list = MagicMock()
    sidebar.query_one = MagicMock(return_value=history_list)
    
    sidebar.refresh_history(chats_dir)
    assert history_list.mount.called
