"""Main entry point for Methil Vibe."""

import signal
import sys
from pathlib import Path
import click
from rich.console import Console
from rich.text import Text
from rich.align import Align

from src.core.models import print_model_menu, PINK, clear_screen, show_cursor
from src.core.llm import MLXLLM
from src.core.agent import Agent

console = Console()


def handle_sigint(sig, frame):
    """Handle Ctrl+C cleanly."""
    show_cursor()
    console.print(f"\n[{PINK}]Au revoir! 👋[/{PINK}]")
    sys.exit(0)


# Register Ctrl+C handler
signal.signal(signal.SIGINT, handle_sigint)


def print_welcome(model_name: str):
    """Print beautiful welcome message."""
    clear_screen()
    
    header = Text()
    header.append("💗 ", style="bold")
    header.append("M E T H I L   V I B E", style=f"bold {PINK}")
    header.append(" 💗", style="bold")
    
    console.print()
    console.print(Align.center(header))
    console.print(Align.center(Text("opla owned", style="dim italic")))
    console.print()
    
    # Model info
    model_short = model_name.split("/")[-1] if "/" in model_name else model_name
    info = Text()
    info.append("Model: ", style="dim")
    info.append(model_short, style=f"bold {PINK}")
    console.print(Align.center(info))
    
    # Commands
    commands = Text()
    commands.append("/quit", style=f"{PINK}")
    commands.append(" exit  •  ", style="dim")
    commands.append("/clear", style=f"{PINK}")
    commands.append(" reset  •  ", style="dim")
    commands.append("Ctrl+C", style=f"{PINK}")
    commands.append(" quit", style="dim")
    console.print(Align.center(commands))
    console.print()
    console.print(Align.center(Text("─" * 50, style="dim")))
    console.print()


@click.command()
@click.option("--model", "-m", help="Model ID to use (skip selection menu)")
@click.option("--dir", "-d", "working_dir", default=".", help="Working directory")
def main(model: str, working_dir: str):
    """Methil Vibe - opla owned."""
    
    working_path = Path(working_dir).resolve()
    
    # 1. Model Selection
    if not model:
        model_id = print_model_menu()
    else:
        model_id = model
        
    # 2. Initialization
    try:
        llm = MLXLLM(model_name=model_id)
        llm.load()
        
        agent = Agent(llm=llm, working_dir=working_path)
    except Exception as e:
        show_cursor()
        console.print(f"[red]Error: {e}[/red]")
        sys.exit(1)
        
    print_welcome(model_id)
    
    # 3. REPL Loop
    while True:
        try:
            user_input = console.input(f"[bold {PINK}]>>> [/bold {PINK}]").strip()
            
            if not user_input:
                continue
                
            if user_input.lower() in ("/quit", "/exit", "exit", "quit"):
                console.print(f"[{PINK}]Au revoir! 👋[/{PINK}]")
                break
                
            if user_input.lower() == "/clear":
                agent._init_history()
                console.print(f"[{PINK}]✓ Context cleared.[/{PINK}]")
                continue
                
            # Process with agent
            agent.chat(user_input)
            
        except EOFError:
            break


if __name__ == "__main__":
    main()
