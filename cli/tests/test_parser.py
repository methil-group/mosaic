import pytest
import json
from mosaic_cli.core.agent import Agent

@pytest.fixture
def agent():
    return Agent(llm=None, model="test", workspace=".", user_name="User", tools=[])

def test_parse_valid_tool_call(agent):
    content = '<tool_call>{"name": "read_file", "arguments": {"path": "test.txt"}}</tool_call>'
    name, params = agent.parse_tool_call(content)
    assert name == "read_file"
    assert params == {"path": "test.txt"}

def test_parse_tool_call_with_text(agent):
    content = 'Thinking... <tool_call>{"name": "list_dir", "arguments": {}}</tool_call>'
    name, params = agent.parse_tool_call(content)
    assert name == "list_dir"
    assert params == {}

def test_parse_malformed_json(agent):
    content = '<tool_call>{"name": "read_file", "arguments": {missing_quotes}}</tool_call>'
    assert agent.parse_tool_call(content) is None

def test_parse_no_tags(agent):
    content = 'No tool call here.'
    assert agent.parse_tool_call(content) is None

def test_parse_empty_tags(agent):
    content = '<tool_call></tool_call>'
    assert agent.parse_tool_call(content) is None
