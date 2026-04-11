import pytest
import json
import asyncio
from unittest.mock import MagicMock, AsyncMock
from mosaic_cli.core.agent import Agent

class MockLLM:
    def __init__(self, responses):
        self.responses = responses
        self.call_count = 0
        
    async def stream_chat(self, model, messages):
        if self.call_count < len(self.responses):
            resp = self.responses[self.call_count]
            self.call_count += 1
            # Simulate streaming
            yield {"type": "token", "data": resp}
        else:
            yield {"type": "token", "data": "Final answer."}

@pytest.mark.asyncio
async def test_agent_retry_loop():
    # Simulate a malformed call followed by a good one
    responses = [
        '<tool_call>{"malformed": "json"</tool_call>', # Missing closing brace
        '<tool_call>{"name": "test_tool", "arguments": {}}</tool_call>',
        'Done.'
    ]
    
    mock_llm = MockLLM(responses)
    mock_tool = MagicMock()
    mock_tool.name.return_value = "test_tool"
    mock_tool.execute = AsyncMock(return_value="Tool Success")
    
    agent = Agent(llm=mock_llm, model="test", workspace=".", user_name="User", tools=[mock_tool])
    
    events = []
    def on_event(event):
        events.append(event)
        
    await agent.run("Start", [], on_event=on_event)
    
    # Check that it saw the malformed call and retried
    token_data = "".join(e["data"] for e in events if e["type"] == "token")
    assert "Invalid tool call format" in token_data
    
    # Check that it eventually called the tool
    assert any(e["type"] == "tool_started" and e["name"] == "test_tool" for e in events)
    assert any(e["type"] == "tool_finished" and e["name"] == "test_tool" for e in events)

@pytest.mark.asyncio
async def test_agent_retry_limit():
    # Simulate 5 malformed calls (limit is 3)
    responses = ['<tool_call>bad</tool_call>'] * 5
    
    mock_llm = MockLLM(responses)
    agent = Agent(llm=mock_llm, model="test", workspace=".", user_name="User", tools=[])
    
    events = []
    def on_event(event):
        events.append(event)
        
    await agent.run("Start", [], on_event=on_event)
    
    # Check for error event
    assert any(e["type"] == "error" and "Too many" in e["message"] for e in events)
    # Consecutive retries should have hit the limit
    retry_messages = [e["data"] for e in events if e["type"] == "token" and "Invalid tool call format" in e["data"]]
    assert len(retry_messages) == 3
