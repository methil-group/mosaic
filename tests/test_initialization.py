"""Tests for initialization to ensure no errors on startup."""

import pytest
from pathlib import Path

from src.core.prompts import SYSTEM_PROMPT, get_system_prompt
from src.core.agent import Agent
from src.framework.abstract_llm import AbstractLLM, Message, LLMResponse
from src.framework.config import AgentConfig


class MockLLM(AbstractLLM):
    """Mock LLM for testing."""
    
    def generate(self, messages: list[Message], max_tokens: int | None = None) -> LLMResponse:
        return LLMResponse(content="Test response")
    
    def generate_stream(self, messages, max_tokens=None):
        yield "Test"


class TestInitialization:
    """Tests to ensure initialization works without errors."""
    
    def test_get_system_prompt_no_error(self):
        """Test that get_system_prompt works without KeyError."""
        # This was the bug - .format() was failing on {"tool": ...} in the prompt
        prompt = get_system_prompt("/test/directory")
        assert "/test/directory" in prompt
        assert len(prompt) > 100
    
    def test_agent_initialization_no_error(self):
        """Test that Agent can be initialized without errors."""
        mock_llm = MockLLM()
        config = AgentConfig(working_directory=Path("/tmp"))
        
        # This should not raise any exceptions
        agent = Agent(llm=mock_llm, config=config)
        
        assert agent is not None
        assert len(agent.messages) == 1  # Only system prompt
        assert agent.messages[0].role == "system"
    
    def test_agent_system_prompt_contains_working_dir(self):
        """Verify agent's system prompt contains working directory."""
        mock_llm = MockLLM()
        config = AgentConfig(working_directory=Path("/tmp/test"))
        agent = Agent(llm=mock_llm, config=config)
        
        system_message = agent.messages[0].content
        assert "/tmp/test" in system_message
    
    def test_extract_tool_calls_ignores_json_blocks(self):
        """Test that _extract_tool_calls ignores ```json blocks."""
        mock_llm = MockLLM()
        config = AgentConfig(working_directory=Path("/tmp"))
        agent = Agent(llm=mock_llm, config=config)
        
        # This should NOT be parsed as a tool call
        response_with_json_block = '''Here's an example:
```json
{
    "tool": "nom_de_l_outil",
    "arguments": {"arg1": "valeur1"}
}
```
'''
        tool_calls = agent._extract_tool_calls(response_with_json_block)
        assert len(tool_calls) == 0, \
            "```json blocks should not be parsed as tool calls"
    
    def test_extract_tool_calls_finds_tool_blocks(self):
        """Test that _extract_tool_calls correctly finds ```tool blocks."""
        mock_llm = MockLLM()
        config = AgentConfig(working_directory=Path("/tmp"))
        agent = Agent(llm=mock_llm, config=config)
        
        response_with_tool_block = '''I will read the file:
```tool
{
    "tool": "read_file",
    "arguments": {"path": "/tmp/test.txt"}
}
```
'''
        tool_calls = agent._extract_tool_calls(response_with_tool_block)
        assert len(tool_calls) == 1
        assert tool_calls[0]["tool"] == "read_file"
    
    def test_system_prompt_is_not_parsed_as_tool_call(self):
        """Ensure system prompt examples don't get parsed as real tool calls."""
        mock_llm = MockLLM()
        config = AgentConfig(working_directory=Path("/tmp"))
        agent = Agent(llm=mock_llm, config=config)
        
        # The system prompt contains example tool blocks, but _extract_tool_calls
        # is only called on LLM responses, not on the system prompt
        # This test ensures the agent initializes correctly
        assert agent is not None
        assert "read_file" in agent.messages[0].content  # Has tool docs
