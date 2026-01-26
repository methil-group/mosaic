import os
import sys
import asyncio
from typing import List, Optional

from textual.app import App, ComposeResult
from textual.widgets import Header, Footer, Input, Static, Label, ListItem, ListView
from textual.containers import Vertical, Horizontal, ScrollableContainer
from textual.reactive import reactive
from rich.markdown import Markdown

# Add root project path to sys.path to allow imports from src
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

from src.Core.Agent.agent import Agent
from src.Core.LLM.openrouter_llm import OpenRouterLLM
from src.UI.components.chat_message import ChatMessage
from src.UI.components.workspace_sidebar import WorkspaceItem
from src.UI.components.config_screen import ConfigScreen

class AgentTUI(App):
    """Modern TUI for the Agent with Workspace Sidebar."""
    
    TITLE = "Methil Vibe Agent"
    SUB_TITLE = "Iterative Agentic Workspace"
    CSS_PATH = "styles.css"

    BINDINGS = [
        ("v", "toggle_verbose", "Toggle Logs"),
        ("c", "show_config", "Config"),
        ("q", "quit", "Quit"),
    ]

    def compose(self) -> ComposeResult:
        yield Header()
        with Horizontal(id="main-layout"):
            with Vertical(id="sidebar"):
                yield Label("WORKSPACES", classes="workspace-header")
                with ListView(id="workspace-list"):
                    yield WorkspaceItem("Current Workspace", os.getcwd())
            with Vertical(id="chat-area"):
                yield ScrollableContainer(id="chat-scroll")
                yield Input(placeholder="Ask me anything... (Press 'v' to toggle logs)", id="user-input")
            yield ScrollableContainer(id="log-scroll")
        yield Footer()

    def on_mount(self) -> None:
        # Initialize our Agent
        try:
            llm = OpenRouterLLM("mistralai/devstral-2512")
            self.agent = Agent(llm, verbose=True)
        except Exception as e:
            self.notify(f"Initialization Error: {str(e)}", severity="error")
            
        self.input = self.query_one("#user-input")
        self.chat_scroll = self.query_one("#chat-scroll")
        self.log_scroll = self.query_one("#log-scroll")
        self.input.focus()

    def action_toggle_verbose(self) -> None:
        self.log_scroll.toggle_class("visible")

    def action_show_config(self) -> None:
        self.push_screen(ConfigScreen())

    def on_list_view_selected(self, event: ListView.Selected) -> None:
        if isinstance(event.item, WorkspaceItem):
            workspace = event.item
            # Update current working directory for the agent (conceptually)
            # In a real app, you might use os.chdir or pass the path to every tool
            self.notify(f"Switched to workspace: {workspace.workspace_name}")
            self.log_scroll.mount(Static(f"[bold blue]WORKSPACE CHANGED:[/] {workspace.path}", classes="tool-log"))
            self.log_scroll.scroll_end()

    async def on_input_submitted(self, event: Input.Submitted) -> None:
        prompt = event.value.strip()
        if not prompt:
            return
            
        self.input.value = ""
        
        # Mount User Message
        user_msg = ChatMessage("user", prompt)
        self.chat_scroll.mount(user_msg)
        self.chat_scroll.scroll_end()
        
        # Mount Assistant Placeholder
        assistant_msg = ChatMessage("assistant")
        self.chat_scroll.mount(assistant_msg)
        self.chat_scroll.scroll_end()
        
        # Start the non-blocking agent run
        asyncio.create_task(self.run_agent_loop(prompt, assistant_msg))

    async def run_agent_loop(self, prompt: str, assistant_msg: ChatMessage):
        loop = asyncio.get_event_loop()
        
        def log_to_tui(message: str):
            """Callback for verbose logging from the agent thread."""
            self.call_from_thread(self.log_scroll.mount, Static(message.strip(), classes="tool-log"))
            self.call_from_thread(self.log_scroll.scroll_end)

        # Start the generator with our TUI logger
        gen = self.agent.run_stream(prompt, log_callback=log_to_tui)
        
        while True:
            try:
                # Iterate through the generator in a way that doesn't block the event loop
                chunk = await loop.run_in_executor(None, next, gen, None)
                if chunk is None:
                    break
                
                # Append chunk to assistant message
                assistant_msg.content += chunk
                self.chat_scroll.scroll_end()
                # Yield to the event loop
                await asyncio.sleep(0)
            except StopIteration:
                break
            except Exception as e:
                self.call_from_thread(self.log_scroll.mount, Static(f"[red]Error: {str(e)}[/]"))
                break
        
        self.call_from_thread(self.log_scroll.mount, Static("[yellow]Agent cycle finished.[/]"))
        self.call_from_thread(self.log_scroll.scroll_end)

if __name__ == "__main__":
    app = AgentTUI()
    app.run()
