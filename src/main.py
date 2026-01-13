"""Main CLI entry point for Methil Agent."""

import sys
from pathlib import Path

import click
from rich.console import Console
from rich.markdown import Markdown
from rich.panel import Panel
from rich.syntax import Syntax

from src.framework.config import LLMConfig, AgentConfig
from src.core.llm import LFMLLM
from src.core.agent import Agent


console = Console()


def print_welcome():
    """Print welcome message."""
    console.print(Panel.fit(
        "[bold cyan]💗 Methil Vibe[/bold cyan]\n"
        "[dim]opla owned[/dim]\n\n"
        "Commandes:\n"
        "  [green]/quit[/green]    - Quitter\n"
        "  [green]/clear[/green]   - Effacer l'historique\n"
        "  [green]/help[/green]    - Afficher l'aide\n"
        "  [green]/confirm[/green] - Confirmer une écriture de fichier\n"
        "  [green]/reject[/green]  - Rejeter une écriture de fichier",
        title="Bienvenue",
        border_style="cyan"
    ))


def print_response(response: str):
    """Print the agent's response with formatting."""
    # Check if response contains code blocks for syntax highlighting
    console.print()
    console.print(Markdown(response))
    console.print()


def handle_command(command: str, agent: Agent) -> bool:
    """Handle a slash command. Returns True if should continue, False to quit."""
    cmd = command.strip().lower()
    
    if cmd == "/quit" or cmd == "/exit":
        console.print("[yellow]Au revoir! 👋[/yellow]")
        return False
    
    elif cmd == "/clear":
        agent.clear_history()
        console.print("[green]✓ Historique effacé[/green]")
    
    elif cmd == "/help":
        print_welcome()
    
    elif cmd == "/confirm":
        write_tool = agent.get_write_tool()
        if write_tool:
            result = write_tool.confirm_pending()
            if result:
                if result.success:
                    console.print(f"[green]✓ {result.output}[/green]")
                else:
                    console.print(f"[red]✗ {result.error}[/red]")
            else:
                console.print("[yellow]Aucune écriture en attente[/yellow]")
        else:
            console.print("[yellow]Aucune écriture en attente[/yellow]")
    
    elif cmd == "/reject":
        write_tool = agent.get_write_tool()
        if write_tool:
            write_tool.reject_pending()
            console.print("[yellow]✓ Écriture rejetée[/yellow]")
        else:
            console.print("[yellow]Aucune écriture en attente[/yellow]")
    
    else:
        console.print(f"[red]Commande inconnue: {command}[/red]")
    
    return True


@click.command()
@click.option("--model", default="LiquidAI/LFM2.5-1.2B-Instruct-MLX-4bit", help="Model name to use")
@click.option("--working-dir", "-w", type=click.Path(exists=True), default=".", help="Working directory")
@click.option("--no-confirm", is_flag=True, help="Disable confirmation for file writes")
def main(model: str, working_dir: str, no_confirm: bool):
    """Methil Vibe - opla owned."""
    
    # Setup configuration
    llm_config = LLMConfig(model_name=model)
    agent_config = AgentConfig(
        require_confirmation=not no_confirm,
        working_directory=Path(working_dir).resolve()
    )
    
    # Print welcome
    print_welcome()
    console.print(f"[dim]Répertoire de travail: {agent_config.working_directory}[/dim]\n")
    
    # Initialize LLM and Agent
    try:
        llm = LFMLLM(config=llm_config)
        agent = Agent(llm=llm, config=agent_config)
    except Exception as e:
        console.print(f"[red]Erreur d'initialisation: {e}[/red]")
        sys.exit(1)
    
    # Main REPL loop
    while True:
        try:
            # Get user input
            user_input = console.input("[bold green]>>> [/bold green]").strip()
            
            if not user_input:
                continue
            
            # Handle commands
            if user_input.startswith("/"):
                if not handle_command(user_input, agent):
                    break
                continue
            
            # Process with agent
            with console.status("[cyan]Réflexion...[/cyan]"):
                response = agent.chat(user_input)
            
            print_response(response)
            
        except KeyboardInterrupt:
            console.print("\n[yellow]Utilisez /quit pour quitter[/yellow]")
        except EOFError:
            break
        except Exception as e:
            console.print(f"[red]Erreur: {e}[/red]")


if __name__ == "__main__":
    main()
