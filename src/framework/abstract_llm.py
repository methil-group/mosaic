"""Abstract base class for LLM providers."""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Generator


@dataclass
class Message:
    """A chat message."""
    role: str  # "system", "user", "assistant"
    content: str


@dataclass
class LLMResponse:
    """Response from the LLM."""
    content: str
    finish_reason: str | None = None


class AbstractLLM(ABC):
    """Abstract base class for LLM providers."""
    
    @abstractmethod
    def generate(self, messages: list[Message], max_tokens: int = 2048) -> LLMResponse:
        """Generate a response from the LLM."""
        pass
    
    @abstractmethod
    def generate_stream(self, messages: list[Message], max_tokens: int = 2048) -> Generator[str, None, None]:
        """Generate a streaming response from the LLM."""
        pass
