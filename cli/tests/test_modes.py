import pytest
import asyncio
import json
from mosaic_cli.core.agent import Agent
from unittest.mock import AsyncMock, MagicMock

@pytest.mark.asyncio
async def test_agent_review_mode_approve():
    # Mock LLM provider
    llm = MagicMock()
    # First call returns a tool call, second call returns final answer
    llm.stream_chat = MagicMock()
    
    async def mock_stream_1(*args, **kwargs):
        yield {"type": "token", "data": "<tool_call>{\"name\": \"ls\", \"arguments\": {\"path\": \".\"}}</tool_call>"}
        yield {"type": "usage", "data": {}}
        
    async def mock_stream_2(*args, **kwargs):
        yield {"type": "token", "data": "I see the files."}
        
    llm.stream_chat.side_effect = [mock_stream_1(), mock_stream_2()]
    
    # Mock Tool
    tool = MagicMock()
    tool.name.return_value = "ls"
    tool.execute = AsyncMock(return_value="file1.txt")
    
    agent = Agent(llm, "test-model", "/tmp", "User", [tool])
    agent.agent_mode = "review"
    agent.approval_queue = asyncio.Queue()
    
    events = []
    async def on_event(event):
        events.append(event)
        if event["type"] == "awaiting_approval":
            # Simulate user approval
            await agent.approval_queue.put("approve")

    await agent.run("Hello", [], on_event)
    
    # Check that tool was executed
    tool.execute.assert_called_once()
    assert any(e["type"] == "awaiting_approval" for e in events)
    assert any(e["type"] == "tool_finished" and "file1.txt" in e["result"] for e in events)

@pytest.mark.asyncio
async def test_agent_review_mode_reject():
    # Mock LLM provider
    llm = MagicMock()
    async def mock_stream(*args, **kwargs):
        yield {"type": "token", "data": "<tool_call>{\"name\": \"rm\", \"arguments\": {\"path\": \"important.txt\"}}</tool_call>"}
        
    llm.stream_chat.return_value = mock_stream()
    
    # Mock Tool
    tool = MagicMock()
    tool.name.return_value = "rm"
    tool.execute = AsyncMock()
    
    agent = Agent(llm, "test-model", "/tmp", "User", [tool])
    agent.agent_mode = "review"
    agent.approval_queue = asyncio.Queue()
    
    events = []
    async def on_event(event):
        events.append(event)
        if event["type"] == "awaiting_approval":
            # Simulate user rejection
            await agent.approval_queue.put("reject")

    # We expect the agent to continue and eventually stop or handle rejection
    # For the test, we'll just wait for the rejection event
    task = asyncio.create_task(agent.run("Delete it", [], on_event))
    
    # Wait for rejected event or timeout
    for _ in range(20):
        if any(e["type"] == "tool_rejected" for e in events):
            break
        await asyncio.sleep(0.1)
    
    agent.stopped = True
    await task
    
    # Check that tool was NOT executed
    tool.execute.assert_not_called()
    assert any(e["type"] == "tool_rejected" for e in events)
