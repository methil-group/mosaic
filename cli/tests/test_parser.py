import pytest
from mosaic_cli.core.parser import ToolCallParser

def test_parse_valid_tool_call():
    content = '<tool_call>{"name": "read_file", "arguments": {"path": "test.txt"}}</tool_call>'
    result = ToolCallParser.parse(content)
    assert result is not None
    name, params = result
    assert name == "read_file"
    assert params == {"path": "test.txt"}

def test_parse_tool_call_with_text():
    content = 'Thinking... <tool_call>{"name": "list_dir", "arguments": {}}</tool_call>'
    result = ToolCallParser.parse(content)
    assert result is not None
    name, params = result
    assert name == "list_dir"
    assert params == {}

def test_parse_malformed_json():
    content = '<tool_call>{"name": "read_file", "arguments": {missing_quotes}}</tool_call>'
    assert ToolCallParser.parse(content) is None

def test_parse_no_tags():
    content = 'No tool call here.'
    assert ToolCallParser.parse(content) is None

def test_parse_empty_tags():
    content = '<tool_call></tool_call>'
    assert ToolCallParser.parse(content) is None

def test_parse_markdown_json():
    content = '<tool_call>```json\n{"name": "test", "arguments": {}}\n```</tool_call>'
    result = ToolCallParser.parse(content)
    assert result is not None
    name, params = result
    assert name == "test"
    assert params == {}

def test_parse_noisy_content():
    content = '<tool_call>Here is the call: {"name": "test", "arguments": {"x": 1}} Hope it works!</tool_call>'
    result = ToolCallParser.parse(content)
    assert result is not None
    name, params = result
    assert name == "test"
    assert params == {"x": 1}

def test_parse_multiple_braces():
    content = '<tool_call>Thoughts { "a": 1 } Call {"name": "test", "arguments": {}} </tool_call>'
    # Should pick the first valid JSON block that has a "name"
    result = ToolCallParser.parse(content)
    assert result is not None
    name, params = result
    assert name == "test"

def test_parse_alternate_closing_tags():
    content_answer = '<tool_call>{"name": "test_answer", "arguments": {}}</tool_answer>'
    result = ToolCallParser.parse(content_answer)
    assert result is not None
    name, params = result
    assert name == "test_answer"

    content_response = '<tool_call>{"name": "test_response", "arguments": {}}</tool_response>'
    result = ToolCallParser.parse(content_response)
    assert result is not None
    name, params = result
    assert name == "test_response"
