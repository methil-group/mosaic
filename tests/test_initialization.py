"""Tests for initialization to ensure no errors on startup."""

import pytest
from pathlib import Path
from src.core.prompts import get_system_prompt
from src.core.agent import Agent
from src.core.llm import MLXLLM

class MockLLM:
    """Mock LLM for testing."""
    def __init__(self):
        self.model_name = "mock"
    def generate(self, messages, max_tokens=None):
        return "Test response"
    def load(self):
        pass

class TestInitialization:
    """Tests to ensure initialization works without errors."""
    
    def test_get_system_prompt_no_error(self):
        """Test that get_system_prompt works."""
        prompt = get_system_prompt("/test/directory")
        assert "/test/directory" in prompt
        assert "AVAILABLE TOOLS" in prompt
    
    def test_agent_initialization_no_error(self):
        """Test that Agent can be initialized without errors."""
        mock_llm = MockLLM()
        agent = Agent(llm=mock_llm, working_dir="/tmp")
        
        assert agent is not None
        assert len(agent.history) == 1
        assert agent.history[0]["role"] == "system"
    
    def test_parse_tool_calls(self):
        """Test tool call parsing from text."""
        mock_llm = MockLLM()
        agent = Agent(llm=mock_llm)
        
        text = 'Check this: ```tool\n{"tool": "bash", "args": {"command": "ls"}}\n```'
        calls = agent._parse_tool_calls(text)
        assert len(calls) == 1
        assert calls[0]["tool"] == "bash"
        assert calls[0]["args"]["command"] == "ls"
        
    def test_parse_raw_json_tool_calls(self):
        """Test tool call parsing from raw JSON behavior."""
        mock_llm = MockLLM()
        agent = Agent(llm=mock_llm)
        
        text = 'I will do this: {"tool": "read_file", "args": {"path": "test.txt"}}'
        calls = agent._parse_tool_calls(text)
        assert len(calls) == 1
        assert calls[0]["tool"] == "read_file"
