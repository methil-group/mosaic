"""Available MLX models registry with beautiful UI."""

from dataclasses import dataclass
import os
import sys


# Main theme color
PINK = "#FF5FF4"


@dataclass
class ModelInfo:
    """Information about an available model."""
    id: str
    name: str
    size: str
    description: str
    recommended: bool = False


# Best models for agentic coding (lightweight, good instruction following)
MODELS = [
    ModelInfo(
        id="mlx-community/Qwen2.5-Coder-3B-Instruct-4bit",
        name="Qwen 2.5 Coder 3B",
        size="~1.8GB",
        description="Best balance: fast & smart for coding.",
        recommended=True,
    ),
    ModelInfo(
        id="mlx-community/Qwen2.5-Coder-7B-Instruct-4bit",
        name="Qwen 2.5 Coder 7B",
        size="~4GB",
        description="Excellent for complex coding. 8GB+ RAM.",
        recommended=True,
    ),
    ModelInfo(
        id="mlx-community/Qwen2.5-Coder-1.5B-Instruct-4bit",
        name="Qwen 2.5 Coder 1.5B",
        size="~900MB",
        description="Ultra-light, for quick tasks.",
    ),
    ModelInfo(
        id="mlx-community/Codestral-22B-v0.1-4bit",
        name="Codestral 22B (Mistral)",
        size="~12GB",
        description="State of the art. 16GB+ RAM.",
    ),
    ModelInfo(
        id="mlx-community/DeepSeek-Coder-V2-Lite-Instruct-4bit",
        name="DeepSeek Coder V2 Lite",
        size="~8GB",
        description="Excellent for coding. 16GB+ RAM.",
    ),
    ModelInfo(
        id="mlx-community/granite-3.1-8b-instruct-4bit",
        name="Granite 3.1 8B (IBM)",
        size="~4.5GB",
        description="Good for tool use & agents.",
    ),
]

DEFAULT_MODEL = MODELS[0].id


def is_model_downloaded(model_id: str) -> bool:
    """Check if a model is already downloaded in HuggingFace cache."""
    from pathlib import Path
    import os
    
    cache_dir = Path(os.path.expanduser("~/.cache/huggingface/hub"))
    if not cache_dir.exists():
        return False
    
    cache_name = "models--" + model_id.replace("/", "--")
    model_cache = cache_dir / cache_name
    
    if model_cache.exists():
        snapshots = model_cache / "snapshots"
        if snapshots.exists() and any(snapshots.iterdir()):
            return True
    
    return False


def delete_model(model_id: str) -> bool:
    """Delete a downloaded model from HuggingFace cache."""
    from pathlib import Path
    import os
    import shutil
    
    cache_dir = Path(os.path.expanduser("~/.cache/huggingface/hub"))
    cache_name = "models--" + model_id.replace("/", "--")
    model_cache = cache_dir / cache_name
    
    if model_cache.exists():
        shutil.rmtree(model_cache)
        return True
    return False


def get_downloaded_models() -> list[str]:
    """Get list of downloaded model IDs."""
    return [m.id for m in MODELS if is_model_downloaded(m.id)]


def get_model_by_id(model_id: str) -> ModelInfo | None:
    """Get model info by ID."""
    for model in MODELS:
        if model.id == model_id:
            return model
    return None


def clear_screen():
    """Clear the terminal screen."""
    os.system('cls' if os.name == 'nt' else 'clear')


def hide_cursor():
    """Hide the terminal cursor."""
    sys.stdout.write('\033[?25l')
    sys.stdout.flush()


def show_cursor():
    """Show the terminal cursor."""
    sys.stdout.write('\033[?25h')
    sys.stdout.flush()


def print_model_menu() -> str:
    """Print beautiful model selection menu with arrow keys."""
    from rich.console import Console
    from rich.text import Text
    from rich.align import Align
    from InquirerPy import inquirer
    from InquirerPy.base.control import Choice
    
    console = Console()
    
    while True:  # Loop to allow delete and come back
        try:
            clear_screen()
            hide_cursor()
            
            # Build the header
            header = Text()
            header.append("💗 ", style="bold")
            header.append("M E T H I L   V I B E", style=f"bold {PINK}")
            header.append(" 💗", style="bold")
            
            subtitle = Text("opla owned", style="dim italic")
            
            # Print centered header
            console.print()
            console.print()
            console.print(Align.center(header))
            console.print(Align.center(subtitle))
            console.print()
            console.print(Align.center(Text("Select your model (↑↓ to navigate, Enter to select)", style=f"{PINK}")))
            console.print()
            
            # Build choices
            choices = []
            for model in MODELS:
                star = " ⭐" if model.recommended else ""
                downloaded = " ✓" if is_model_downloaded(model.id) else ""
                display = f"{model.name}{star}{downloaded}  ({model.size}) - {model.description}"
                choices.append(Choice(value=model.id, name=display))
            
            # Add options
            choices.append(Choice(value="__custom__", name="📝 Load from HuggingFace..."))
            
            # Add delete option if any models are downloaded
            downloaded_models = get_downloaded_models()
            if downloaded_models:
                choices.append(Choice(value="__delete__", name="🗑️  Delete a downloaded model..."))
            
            # Show interactive menu
            show_cursor()
            selected = inquirer.select(
                message="",
                choices=choices,
                default=MODELS[0].id,
                pointer="▸",
                qmark="",
                amark="",
                mandatory=True,
            ).execute()
            
            hide_cursor()
            
            if selected == "__custom__":
                show_cursor()
                console.print()
                custom = inquirer.text(
                    message="HuggingFace model ID (e.g. mlx-community/model-name):",
                    qmark="📦",
                ).execute()
                hide_cursor()
                return custom if custom else MODELS[0].id
            
            elif selected == "__delete__":
                show_cursor()
                # Show delete menu
                delete_choices = []
                for model_id in downloaded_models:
                    model = get_model_by_id(model_id)
                    name = model.name if model else model_id
                    delete_choices.append(Choice(value=model_id, name=f"🗑️  {name}"))
                delete_choices.append(Choice(value="__back__", name="← Back"))
                
                to_delete = inquirer.select(
                    message="Select model to delete:",
                    choices=delete_choices,
                    pointer="▸",
                    qmark="",
                    amark="",
                ).execute()
                
                if to_delete != "__back__":
                    if delete_model(to_delete):
                        model = get_model_by_id(to_delete)
                        name = model.name if model else to_delete
                        console.print(f"[{PINK}]✓ Deleted {name}[/{PINK}]")
                        import time
                        time.sleep(1)
                
                hide_cursor()
                continue  # Go back to main menu
            
            return selected
            
        except KeyboardInterrupt:
            show_cursor()
            console.print(f"\n[{PINK}]Au revoir! 👋[/{PINK}]")
            sys.exit(0)
        finally:
            show_cursor()

