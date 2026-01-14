"""Main entry point for Methil Vibe."""

import sys
from pathlib import Path
import click
from rich.console import Console
from rich.panel import Panel

from src.core.models import print_model_menu, get_model_by_id
from src.core.llm import MLXLLM
from src.core.agent import Agent

console = Console()

def print_welcome(model_name: str):
    """Print welcome message."""
    console.print(Panel.fit(
        f"[bold cyan]💗 Methil Vibe[/bold cyan]\n"
        f"[dim]opla owned[/dim]\n\n"
        f"Model: [green]{model_name}[/green]\n"
        f"Type [yellow]/quit[/yellow] to exit, [yellow]/clear[/yellow] to reset history",
        title="Bienvenue",
        border_style="cyan"
    ))

@click.command()
@click.option("--model", "-m", help="Model ID to use (skip selection menu)")
@click.option("--dir", "-w", default=".", help="Working directory")
def main(model: str, dir: str):
    """Methil Vibe - opla owned."""
    
    working_dir = Path(dir).resolve()
    
    # 1. Model Selection
    if not model:
        model_id = print_model_menu()
    else:
        model_id = model
        
    # 2. Initialization
    try:
        llm = MLXLLM(model_name=model_id)
        # We don't load yet, Agent will load it on first chat or we load it now
        llm.load() 
        
        agent = Agent(llm=llm, working_dir=working_dir)
    except Exception as e:
        console.print(f"[red]Initialization error: {e}[/red]")
        sys.exit(1)
        
    print_welcome(model_id)
    
    # 3. REPL Loop
    while True:
        try:
            user_input = console.input("\n[bold green]>>> [/bold green]").strip()
            
            if not user_input:
                continue
                
            if user_input.lower() in ("/quit", "/exit", "exit", "quit"):
                console.print("[yellow]Au revoir! 👋[/yellow]")
                break
                
            if user_input.lower() == "/clear":
                agent._init_history()
                console.print("[green]✓ Context cleared.[/green]")
                continue
                
            # Process with agent
            agent.chat(user_input)
            
        except KeyboardInterrupt:
            console.print("\n[yellow]Type /quit to exit[/yellow]")
        except EOFError:
            break
        except Exception as e:
            console.print(f"[red]Error: {e}[/red]")

if __name__ == "__main__":
    main()
