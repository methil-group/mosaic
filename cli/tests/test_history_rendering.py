import os
import json
import pytest
from mosaic_cli.main import Mosaic
from mosaic_cli.core.components import ToolBlock, ChatMessage

@pytest.fixture
def temp_workspace(tmp_path):
    workspace = tmp_path / "project"
    workspace.mkdir()
    # Create required mosaic directories
    os.makedirs(os.path.join(str(workspace), ".mosaic", "chats"), exist_ok=True)
    return str(workspace)

@pytest.mark.asyncio
async def test_history_tool_rendering(temp_workspace):
    app = Mosaic(workspace=temp_workspace)
    
    # Mock a history with tool call and response
    history = [
        {"role": "user", "content": "Hello"},
        {"role": "assistant", "content": 'Thinking...\n<tool_call>{"name": "list_directory", "arguments": {"path": "."}}</tool_call>'},
        {"role": "user", "content": '<tool_response>{"tool_call_id": "123", "name": "list_directory", "content": {"status": "success", "files": ["src", "tests"]}}</tool_response>'}
    ]
    
    session_id = "test_session"
    app.session.save_chat(session_id, history)
    
    async with app.run_test() as pilot:
        # Load the chat
        app.load_chat(session_id)
        
        # Verify content of chat log
        log = app.query_one("#chat-log")
        
        # 1. Check ToolBlock exists
        tool_blocks = log.query(ToolBlock)
        assert len(tool_blocks) == 1
        assert tool_blocks[0].tool_name == "list_directory"
        
        # 2. Check Tool response is NOT shown as a plain ChatMessage
        raw_responses = [m for m in log.query(ChatMessage) if "<tool_response>" in m.content]
        assert len(raw_responses) == 0, "Tool response should be absorbed into ToolBlock, not shown as User message"
        
        # 3. Check assistant text before tool call is still there
        assistant_msgs = [m for m in log.query(ChatMessage) if m.role == "assistant"]
        assert any("Thinking..." in m.content for m in assistant_msgs)
