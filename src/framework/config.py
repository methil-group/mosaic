"""Configuration classes."""

from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class LLMConfig:
    """LLM configuration following Liquid AI recommendations."""
    model_name: str = "LiquidAI/LFM2.5-1.2B-Instruct-MLX-4bit"
    temperature: float = 0.1
    top_k: int = 50
    top_p: float = 0.1
    repetition_penalty: float = 1.05
    max_tokens: int = 2048


@dataclass
class AgentConfig:
    """Agent configuration."""
    require_confirmation: bool = True
    max_tool_iterations: int = 10
    working_directory: Path = field(default_factory=Path.cwd)
    allowed_directories: list[Path] = field(default_factory=list)
    
    def __post_init__(self):
        if not self.allowed_directories:
            self.allowed_directories = [self.working_directory]


# Default configurations
DEFAULT_LLM_CONFIG = LLMConfig()
DEFAULT_AGENT_CONFIG = AgentConfig()
