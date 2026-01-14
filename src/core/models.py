"""Available MLX models registry."""

from dataclasses import dataclass


@dataclass
class ModelInfo:
    """Information about an available model."""
    id: str
    name: str
    size: str
    description: str
    recommended: bool = False


# Available models organized by provider
MODELS = [
    # LiquidAI LFM models (default)
    ModelInfo(
        id="LiquidAI/LFM2.5-1.2B-Instruct-MLX-4bit",
        name="LFM 2.5 1.2B",
        size="~700MB",
        description="Fast, lightweight. Good for simple tasks.",
        recommended=True,
    ),
    ModelInfo(
        id="LiquidAI/LFM2.5-1.2B-Instruct-MLX-bf16",
        name="LFM 2.5 1.2B (bf16)",
        size="~2.4GB",
        description="Higher precision, slower.",
    ),
    
    # Qwen models (good for coding)
    ModelInfo(
        id="mlx-community/Qwen2.5-Coder-3B-Instruct-4bit",
        name="Qwen 2.5 Coder 3B",
        size="~1.8GB",
        description="Optimized for coding tasks.",
        recommended=True,
    ),
    ModelInfo(
        id="mlx-community/Qwen2.5-Coder-7B-Instruct-4bit",
        name="Qwen 2.5 Coder 7B",
        size="~4GB",
        description="Best for complex coding. Needs 8GB+ RAM.",
    ),
    ModelInfo(
        id="mlx-community/Qwen2.5-14B-Instruct-4bit",
        name="Qwen 2.5 14B",
        size="~8GB",
        description="Very capable. Needs 16GB+ RAM.",
    ),
    
    # Mistral models
    ModelInfo(
        id="mlx-community/Mistral-7B-Instruct-v0.3-4bit",
        name="Mistral 7B",
        size="~4GB",
        description="General purpose, good reasoning.",
    ),
    
    # DeepSeek models (excellent for coding)
    ModelInfo(
        id="mlx-community/DeepSeek-Coder-V2-Lite-Instruct-4bit",
        name="DeepSeek Coder V2 Lite",
        size="~8GB",
        description="Excellent for coding. Needs 16GB+ RAM.",
    ),
]

DEFAULT_MODEL = MODELS[0].id


def get_model_by_id(model_id: str) -> ModelInfo | None:
    """Get model info by ID."""
    for model in MODELS:
        if model.id == model_id:
            return model
    return None


def print_model_menu() -> str:
    """Print model selection menu and return selected model ID."""
    from rich.console import Console
    from rich.table import Table
    from rich.prompt import Prompt
    
    console = Console()
    
    table = Table(title="💗 Methil Vibe - Select Model", show_header=True)
    table.add_column("#", style="cyan", width=3)
    table.add_column("Model", style="green")
    table.add_column("Size", style="yellow")
    table.add_column("Description")
    
    for i, model in enumerate(MODELS, 1):
        rec = " ⭐" if model.recommended else ""
        table.add_row(
            str(i),
            f"{model.name}{rec}",
            model.size,
            model.description
        )
    
    console.print()
    console.print(table)
    console.print()
    
    while True:
        choice = Prompt.ask(
            "Choose model [1-{}] or paste HuggingFace ID".format(len(MODELS)),
            default="1"
        )
        
        # Check if it's a number
        if choice.isdigit():
            idx = int(choice) - 1
            if 0 <= idx < len(MODELS):
                return MODELS[idx].id
            console.print("[red]Invalid choice, try again.[/red]")
        else:
            # Assume it's a custom HuggingFace model ID
            if "/" in choice:
                return choice
            console.print("[red]Enter a number or valid HuggingFace model ID (org/model)[/red]")
