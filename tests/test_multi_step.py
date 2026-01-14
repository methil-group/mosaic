"""Tests for multi-step reasoning and tool calling.

Run: pytest tests/test_multi_step.py -v
"""

import pytest
import tempfile
import json
from pathlib import Path


class TestToolParsing:
    """Test tool call parsing from various response formats."""
    
    @pytest.fixture
    def agent(self):
        """Create agent with mock LLM."""
        # Lazy import to avoid slow mlx loading
        from src.core.agent import Agent
        
        class MockLLM:
            model_name = "mock"
            def load(self): pass
            def generate_stream(self, messages, max_tokens=None):
                yield "Done"
        
        return Agent(llm=MockLLM(), working_dir="/tmp")
    
    def test_parse_json_in_backticks(self, agent):
        """Parse tool calls in ```json blocks."""
        response = '''I will read:
```json
{"tool": "read_file", "args": {"path": "test.txt"}}
```'''
        calls = agent._parse_tool_calls(response)
        assert len(calls) == 1
        assert calls[0]["tool"] == "read_file"
    
    def test_parse_tool_block(self, agent):
        """Parse tool calls in ```tool blocks."""
        response = '''```tool
{"tool": "bash", "args": {"command": "ls"}}
```'''
        calls = agent._parse_tool_calls(response)
        assert len(calls) == 1
        assert calls[0]["tool"] == "bash"
    
    def test_parse_raw_json(self, agent):
        """Parse raw JSON without backticks."""
        response = 'Do: {"tool": "read_file", "args": {"path": "x.py"}}'
        calls = agent._parse_tool_calls(response)
        assert len(calls) == 1
    
    def test_parse_nested_args(self, agent):
        """Parse JSON with nested arguments."""
        response = '{"tool": "write_file", "args": {"path": "a.py", "content": "x=1"}}'
        calls = agent._parse_tool_calls(response)
        assert len(calls) == 1
        assert calls[0]["args"]["content"] == "x=1"
    
    def test_no_tool_calls(self, agent):
        """Handle response with no tools."""
        calls = agent._parse_tool_calls("Just text, no tools.")
        assert len(calls) == 0


class TestToolExecution:
    """Test tool execution."""
    
    @pytest.fixture
    def agent_in_tmpdir(self):
        """Create agent in a temp directory."""
        from src.core.agent import Agent
        
        class MockLLM:
            model_name = "mock"
            def load(self): pass
            def generate_stream(self, messages, max_tokens=None):
                yield "Done"
        
        with tempfile.TemporaryDirectory() as tmpdir:
            yield Agent(llm=MockLLM(), working_dir=tmpdir), tmpdir
    
    def test_bash(self, agent_in_tmpdir):
        agent, _ = agent_in_tmpdir
        result = agent.execute_tool("bash", {"command": "echo hello"})
        assert "hello" in result
    
    def test_read_file(self, agent_in_tmpdir):
        agent, tmpdir = agent_in_tmpdir
        Path(tmpdir, "test.txt").write_text("content123")
        result = agent.execute_tool("read_file", {"path": "test.txt"})
        assert result == "content123"
    
    def test_write_file(self, agent_in_tmpdir):
        agent, tmpdir = agent_in_tmpdir
        agent.execute_tool("write_file", {"path": "new.txt", "content": "hello"})
        assert Path(tmpdir, "new.txt").read_text() == "hello"
    
    def test_edit_file(self, agent_in_tmpdir):
        agent, tmpdir = agent_in_tmpdir
        Path(tmpdir, "edit.txt").write_text("foo bar")
        agent.execute_tool("edit_file", {
            "path": "edit.txt",
            "old_text": "foo",
            "new_text": "baz"
        })
        assert Path(tmpdir, "edit.txt").read_text() == "baz bar"
    
    def test_edit_not_found(self, agent_in_tmpdir):
        agent, tmpdir = agent_in_tmpdir
        Path(tmpdir, "x.txt").write_text("abc")
        result = agent.execute_tool("edit_file", {
            "path": "x.txt",
            "old_text": "xyz",
            "new_text": "new"
        })
        assert "Error" in result
    
    def test_path_escape_blocked(self, agent_in_tmpdir):
        agent, _ = agent_in_tmpdir
        result = agent.execute_tool("read_file", {"path": "../../etc/passwd"})
        assert "Error" in result
    
    def test_missing_args(self, agent_in_tmpdir):
        agent, _ = agent_in_tmpdir
        result = agent.execute_tool("read_file", {})
        assert "Error" in result


class TestPrompt:
    """Test prompt formatting."""
    
    def test_contains_working_dir(self):
        from src.core.prompts import get_system_prompt
        prompt = get_system_prompt("/my/path")
        assert "/my/path" in prompt
    
    def test_has_concise_rules(self):
        from src.core.prompts import get_system_prompt
        prompt = get_system_prompt("/tmp")
        assert "CONCISE" in prompt or "concise" in prompt.lower()
