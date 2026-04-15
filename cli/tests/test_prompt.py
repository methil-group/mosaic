import pytest
import json
from mosaic_cli.core.prompt import PromptBuilder

def test_format_tool_result_string():
    name = "test_tool"
    result = "Success!"
    call_id = "call-123"
    
    formatted = PromptBuilder.format_tool_result(name, result, call_id)
    
    assert "<tool_response>" in formatted
    assert "</tool_response>" in formatted
    
    # Extract JSON
    raw_json = formatted.replace("<tool_response>", "").replace("</tool_response>", "").strip()
    data = json.loads(raw_json)
    
    assert data["name"] == name
    assert data["tool_call_id"] == call_id
    assert data["content"] == {"message": "Success!"}

def test_format_tool_result_json_string():
    name = "test_tool"
    result = '{"status": "ok", "count": 5}'
    call_id = "call-456"
    
    formatted = PromptBuilder.format_tool_result(name, result, call_id)
    raw_json = formatted.replace("<tool_response>", "").replace("</tool_response>", "").strip()
    data = json.loads(raw_json)
    
    assert data["content"] == {"status": "ok", "count": 5}

def test_create_system_prompt():
    prompt = PromptBuilder.create_system_prompt([], "/tmp", "Alice")
    assert "Alice" in prompt
    assert "/tmp" in prompt
    assert '<tool_call>' in prompt
    # Check escaped braces
    assert '{"name": "tool_name"' in prompt
