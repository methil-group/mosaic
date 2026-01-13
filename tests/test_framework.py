"""Tests for the framework classes."""

import pytest

from src.framework.abstract_tool import AbstractTool, ToolResult, ToolRegistry
from src.framework.abstract_llm import AbstractLLM, Message, LLMResponse
from src.framework.config import LLMConfig, AgentConfig


class TestToolResult:
    """Tests for ToolResult dataclass."""
    
    def test_success_result(self):
        result = ToolResult(success=True, output="Hello")
        assert result.success is True
        assert result.output == "Hello"
        assert result.error is None
    
    def test_error_result(self):
        result = ToolResult(success=False, output="", error="Something failed")
        assert result.success is False
        assert result.error == "Something failed"


class TestToolRegistry:
    """Tests for ToolRegistry."""
    
    def test_register_and_get(self):
        class DummyTool(AbstractTool):
            @property
            def name(self):
                return "dummy"
            
            @property
            def description(self):
                return "A dummy tool"
            
            @property
            def parameters(self):
                return {}
            
            def execute(self, **kwargs):
                return ToolResult(success=True, output="dummy")
        
        registry = ToolRegistry()
        tool = DummyTool()
        registry.register(tool)
        
        assert registry.get("dummy") is tool
        assert registry.get("nonexistent") is None
    
    def test_list_tools(self):
        registry = ToolRegistry()
        assert len(registry.list_tools()) == 0


class TestMessage:
    """Tests for Message dataclass."""
    
    def test_message_creation(self):
        msg = Message(role="user", content="Hello")
        assert msg.role == "user"
        assert msg.content == "Hello"


class TestConfig:
    """Tests for configuration classes."""
    
    def test_llm_config_defaults(self):
        config = LLMConfig()
        assert config.temperature == 0.1
        assert config.top_k == 50
        assert config.max_tokens == 2048
    
    def test_agent_config_defaults(self):
        config = AgentConfig()
        assert config.require_confirmation is True
        assert config.max_tool_iterations == 10
