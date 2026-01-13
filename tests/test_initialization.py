"""Tests for initialization to ensure no 'tool' parsing errors."""

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
    
    def test_system_prompt_has_no_tool_blocks(self):
        """Ensure the system prompt doesn't contain ```tool blocks that could be parsed."""
        assert "```tool" not in SYSTEM_PROMPT, \
            "System prompt should not contain ```tool blocks to avoid parsing errors"
    
    def test_get_system_prompt_no_tool_blocks(self):
        """Test formatted system prompt has no tool blocks."""
        prompt = get_system_prompt("/test/directory")
        assert "```tool" not in prompt, \
            "Formatted system prompt should not contain ```tool blocks"
    
    def test_agent_initialization_no_error(self):
        """Test that Agent can be initialized without errors."""
        mock_llm = MockLLM()
        config = AgentConfig(working_directory=Path("/tmp"))
        
        # This should not raise any exceptions
        agent = Agent(llm=mock_llm, config=config)
        
        assert agent is not None
        assert len(agent.messages) == 1  # Only system prompt
        assert agent.messages[0].role == "system"
    
    def test_agent_system_prompt_no_tool_blocks(self):
        """Verify agent's system prompt message has no tool blocks."""
        mock_llm = MockLLM()
        config = AgentConfig(working_directory=Path("/tmp"))
        agent = Agent(llm=mock_llm, config=config)
        
        system_message = agent.messages[0].content
        assert "```tool" not in system_message, \
            "Agent's system message should not contain ```tool blocks"
    
    def test_extract_tool_calls_ignores_json_blocks(self):
        """Test that _extract_tool_calls ignores ```json blocks."""
        mock_llm = MockLLM()
        config = AgentConfig(working_directory=Path("/tmp"))
        agent = Agent(llm=mock_llm, config=config)
        
        # This is the kind of content that was causing the bug
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
