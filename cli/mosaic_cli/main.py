import os
import asyncio
import sys
import json
from dotenv import load_dotenv, set_key
from textual.app import App, ComposeResult
from textual.containers import Container, Vertical, Horizontal
from textual.widgets import Header, Footer, Input, RichLog, Static, Button, Select, Label
from textual.binding import Binding
from textual import on, work

from .core.agent import Agent
from .core.components import ChatMessage, ToolExecution, ToolResult, TodoSidebar, TodoItem
from .core.tools.read_file import ReadFileTool
from .core.tools.write_file import WriteFileTool
from .core.tools.edit_file import EditFileTool
from .core.tools.list_directory import ListDirectoryTool
from .core.tools.run_command import RunCommandTool
from .core.tools.create_todo import CreateTodoTool

from .framework.llm.openrouter import OpenRouter
from .framework.llm.openai import OpenAiProvider
from .framework.llm.llama_provider import LlamaProvider

from rich.panel import Panel
from rich.text import Text
from rich.box import ROUNDED
from rich.console import Group

class Mosaic(App):
    CSS = """
    Screen {
        background: #0f172a;
    }
    #chat-log {
        height: 1fr;
        border: tall #1e293b;
        background: #1e293b 10%;
        margin: 1 2;
        padding: 1 2;
        scrollbar-gutter: stable;
    }
    #input-area {
        height: auto;
        dock: bottom;
        padding: 0 2 1 2;
    }
    #user-input {
        border: tall #334155;
        background: #1e293b;
    }
    #user-input:focus {
        border: tall $accent;
    }
    .status-bar {
        background: $accent;
        color: white;
        padding: 0 1;
    }
    #settings-pane {
        width: 40;
        dock: right;
        border-left: tall #334155;
        background: #0f172a;
        display: none;
        padding: 1 2;
        z-index: 100;
    }
    #todo-sidebar {
        width: 35;
        dock: right;
        border-left: tall #1e293b;
        background: #0f172a;
        padding: 1 1;
    }
    #todo-sidebar-title {
        text-style: bold;
        color: #8b5cf6;
        margin-bottom: 1;
        padding: 0 1;
    }
    #todo-list {
        height: 1fr;
    }
    #settings-pane Label {
        margin-top: 1;
        text-style: bold;
        color: #94a3b8;
    }
    #save-settings {
        margin-top: 2;
        width: 100%;
    }
    #workspace-info {
        margin-top: 1;
        color: #64748b;
        text-style: italic;
    }
    .tool-block {
        background: #334155 20%;
        border-left: solid #8b5cf6;
        padding: 0 1;
        margin: 1 0;
    }
    .tool-result {
        color: #94a3b8;
        text-style: italic;
    }
    """

    BINDINGS = [
        Binding("ctrl+s", "toggle_settings", "Settings"),
        Binding("ctrl+q", "quit", "Quit"),
        Binding("ctrl+c", "clear_log", "Clear"),
    ]

    def __init__(self, workspace: str = None):
        super().__init__()
        self.config_path = os.path.expanduser("~/.mosaic.env")
        if os.path.exists(self.config_path):
            load_dotenv(self.config_path)
        else:
            open(self.config_path, 'a').close()

        self.api_key = os.getenv("OPENROUTER_API_KEY", "")
        self.provider_type = "openrouter"
        
        self.workspace = os.path.abspath(workspace) if workspace else os.getcwd()
        self.model = os.getenv("MOSAIC_MODEL", "deepseek/deepseek-v3.2")
        
        self._init_llm()

        self.tools = [
            ReadFileTool(),
            WriteFileTool(),
            EditFileTool(),
            ListDirectoryTool(),
            RunCommandTool(),
            CreateTodoTool()
        ]
        self.history = []

    def _init_llm(self):
        if self.provider_type == "openrouter":
            self.llm = OpenRouter(self.api_key)
        elif self.provider_type == "openai":
            self.llm = OpenAiProvider(self.openai_key, self.openai_base_url)
        elif self.provider_type == "gguf":
            self.llm = LlamaProvider(self.gguf_path)
        else:
            self.llm = OpenRouter(self.api_key)

    def compose(self) -> ComposeResult:
        yield Header()
        with Horizontal():
            with Vertical():
                yield RichLog(id="chat-log", highlight=True, markup=True)
                with Horizontal(id="input-area"):
                    yield Input(placeholder="Ask anything...", id="user-input")
            yield TodoSidebar(id="todo-sidebar")
            with Vertical(id="settings-pane"):
                yield Label("SETTINGS")
                yield Label("OpenRouter API Key")
                yield Input(placeholder="sk-or-v1-...", value=self.api_key, id="api-key-input", password=True)
                
                yield Label("Model")
                yield Select([
                    ("Qwen Coder Next", "qwen/qwen3-coder-next"),
                    ("DeepSeek v3.2", "deepseek/deepseek-v3.2")
                ], value=self.model if self.model in ["qwen/qwen3-coder-next", "deepseek/deepseek-v3.2"] else "deepseek/deepseek-v3.2", id="model-select")
                
                yield Button("Save & Refresh", variant="primary", id="save-settings")
                yield Static(f"Workspace: {self.workspace}", id="workspace-info")
        yield Footer()

    def on_mount(self):
        self.query_one("#chat-log").write("[bold gold1]Welcome to Mosaic[/]")
        self.query_one("#chat-log").write("[dim]Press Ctrl+S for settings, Ctrl+Q to quit[/]\n")
        if not self.api_key:
            self.query_one("#chat-log").write("[red]Warning: API Key not set. Use Ctrl+S to enter it.[/]")

    @work
    async def refresh_models(self):
        # We now use a hardcoded list of models as requested
        pass

    def action_toggle_settings(self):
        pane = self.query_one("#settings-pane")
        pane.display = not pane.display

    def action_clear_log(self):
        self.query_one("#chat-log").clear()

    @on(Input.Submitted, "#user-input")
    async def on_input_submitted(self, event: Input.Submitted):
        prompt = event.value
        if not prompt:
            return
        
        if not self.api_key:
            self.query_one("#chat-log").write("[red]Error: Please set your OpenRouter API Key in settings (Ctrl+S)[/]")
            return

        event.input.value = ""
        log = self.query_one("#chat-log")
        log.write(f"\n[bold sky_blue1]USER:[/]\n{prompt}\n")
        
        self.run_agent(prompt)

    @work
    async def run_agent(self, prompt: str):
        log = self.query_one("#chat-log")
        agent = Agent(self.llm, self.model, self.workspace, "User", self.tools)
        
        assistant_header_written = False
        
        def on_event(event):
            nonlocal assistant_header_written
            should_scroll = log.scroll_y >= log.max_scroll_y
            
            if event["type"] == "token":
                if not assistant_header_written:
                    log.write("\n[bold spring_green3]ASSISTANT:[/]")
                    assistant_header_written = True
                log.write(event["data"], scroll_end=should_scroll)
            elif event["type"] == "tool_started":
                # Create a group or panel for the tool call
                params_str = ", ".join([f"{k}={v}" for k,v in event['parameters'].items()])
                call_panel = Panel(
                    Text.from_markup(f"[bold]Parameters:[/] [dim]{params_str}[/]"),
                    title=f"[bold medium_purple3]🛠️ {event['name']}[/]",
                    title_align="left",
                    border_style="medium_purple3",
                    box=ROUNDED,
                    expand=False,
                    padding=(0, 1)
                )
                log.write(call_panel, scroll_end=should_scroll)
                assistant_header_written = False
            elif event["type"] == "tool_finished":
                res = event['result']
                
                # Check for create_todo and update the side bar
                if event['name'] == "create_todo":
                    try:
                        data = json.loads(res)
                        if data.get("status") == "success":
                            self.query_one("#todo-sidebar").add_todo(
                                data["todo"]["title"],
                                data["todo"]["description"]
                            )
                    except:
                        pass
                
                file_status = " ✓ File modified" if any(x in event['name'] for x in ["edit_file", "write_file"]) else ""
                
                truncated = res[:500] + "..." if len(res) > 500 else res
                result_panel = Panel(
                    Text.from_markup(f"[dim]{truncated}[/]"),
                    title=f"[bold spring_green3]↳ Result{file_status}[/]",
                    title_align="left",
                    border_style="spring_green3",
                    box=ROUNDED,
                    expand=False,
                    padding=(0, 1)
                )
                log.write(result_panel, scroll_end=should_scroll)
                assistant_header_written = False
            elif event["type"] == "error":
                log.write(f"\n[bold red]ERROR: {event['message']}[/]", scroll_end=should_scroll)

        await agent.run(prompt, self.history, on_event)
        self.history.extend(agent.messages[1:]) # Skip system prompt in history


    @on(Button.Pressed, "#save-settings")
    async def save_settings(self):
        self.api_key = self.query_one("#api-key-input").value
        self.model = self.query_one("#model-select").value
        
        set_key(self.config_path, "OPENROUTER_API_KEY", self.api_key)
        set_key(self.config_path, "MOSAIC_MODEL", self.model)
        set_key(self.config_path, "MOSAIC_PROVIDER", "openrouter")
        
        self.provider_type = "openrouter"
        self._init_llm()
        self.query_one("#chat-log").write("[yellow]Settings saved and LLM re-initialized.[/]")


def run():
    workspace = sys.argv[1] if len(sys.argv) > 1 else None
    app = Mosaic(workspace=workspace)
    app.run()


if __name__ == "__main__":
    run()
