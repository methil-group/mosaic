"""Abstract base class for agent tools."""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any


@dataclass
class ToolResult:
    """Result returned by a tool execution."""
    success: bool
    output: str
    error: str | None = None


class AbstractTool(ABC):
    """Abstract base class that all tools must implement."""
    
    @property
    @abstractmethod
    def name(self) -> str:
        """Unique name of the tool."""
        pass
    
    @property
    @abstractmethod
    def description(self) -> str:
        """Description of what the tool does."""
        pass
    
    @property
    @abstractmethod
    def parameters(self) -> dict[str, Any]:
        """JSON schema of the tool's parameters."""
        pass
    
    @abstractmethod
    def execute(self, **kwargs) -> ToolResult:
        """Execute the tool with given parameters."""
        pass
    
    def to_schema(self) -> dict:
        """Convert tool to schema format for LLM."""
        return {
            "name": self.name,
            "description": self.description,
            "parameters": self.parameters
        }


class ToolRegistry:
    """Registry to manage available tools."""
    
    def __init__(self):
        self._tools: dict[str, AbstractTool] = {}
    
    def register(self, tool: AbstractTool) -> None:
        """Register a tool."""
        self._tools[tool.name] = tool
    
    def get(self, name: str) -> AbstractTool | None:
        """Get a tool by name."""
        return self._tools.get(name)
    
    def list_tools(self) -> list[AbstractTool]:
        """List all registered tools."""
        return list(self._tools.values())
    
    def get_schemas(self) -> list[dict]:
        """Get schemas for all tools."""
        return [tool.to_schema() for tool in self._tools.values()]
