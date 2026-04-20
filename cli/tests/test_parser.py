import pytest
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

def test_parse_markdown_json(agent):
    content = '<tool_call>```json\n{"name": "test", "arguments": {}}\n```</tool_call>'
    name, params = agent.parse_tool_call(content)
    assert name == "test"
    assert params == {}

def test_parse_noisy_content(agent):
    content = '<tool_call>Here is the call: {"name": "test", "arguments": {"x": 1}} Hope it works!</tool_call>'
    name, params = agent.parse_tool_call(content)
    assert name == "test"
    assert params == {"x": 1}

def test_parse_multiple_braces(agent):
    content = '<tool_call>Thoughts { "a": 1 } Call {"name": "test", "arguments": {}} </tool_call>'
    # Should pick the first valid JSON block that has a "name"
    name, params = agent.parse_tool_call(content)
    assert name == "test"

def test_parse_alternate_closing_tags(agent):
    content_answer = '<tool_call>{"name": "test_answer", "arguments": {}}</tool_answer>'
    name, params = agent.parse_tool_call(content_answer)
    assert name == "test_answer"

    content_response = '<tool_call>{"name": "test_response", "arguments": {}}</tool_response>'
    name, params = agent.parse_tool_call(content_response)
    assert name == "test_response"
