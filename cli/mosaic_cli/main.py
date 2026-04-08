import os
import asyncio
import sys
from dotenv import load_dotenv, set_key
from textual.app import App, ComposeResult
from textual.containers import Container, Vertical, Horizontal
from textual.widgets import Header, Footer, Input, RichLog, Static, Button, Select, Label
from textual.binding import Binding
from textual import on, work

from .core.agent import Agent
from .core.tools.read_file import ReadFileTool
from .core.tools.write_file import WriteFileTool
from .core.tools.edit_file import EditFileTool
from .core.tools.list_directory import ListDirectoryTool
from .core.tools.run_command import RunCommandTool
from .framework.llm.openrouter import OpenRouter

class ChatMessage(Static):
    def __init__(self, role: str, content: str):
        super().__init__()
        self.role = role
        self.content = content

    def render(self) -> str:
        color = "cyan" if self.role == "user" else "green"
        if self.role == "system": color = "yellow"
        if self.role == "assistant": color = "green"
        return f"[{color} bold]{self.role.upper()}:[/] {self.content}"

class ToolExecution(Static):
    def __init__(self, name: str, params: dict):
        super().__init__()
        self.name = name
        self.params = params

    def render(self) -> str:
        return f"[magenta bold]TOOL CALL: {self.name}[/] ({self.params})"

class ToolResult(Static):
    def __init__(self, name: str, result: str):
        super().__init__()
        self.name = name
        self.result = result

    def render(self) -> str:
        # Show modified files if it was an edit or write
        output = f"[magenta]TOOL RESULT: {self.name}[/]\n"
        if "edit_file" in self.name or "write_file" in self.name:
            output += f"[bold green]Modified file mentioned in result[/]\n"
        
        # Truncate result for display
        truncated = self.result[:200] + "..." if len(self.result) > 200 else self.result
        output += f"[dim]{truncated}[/]"
        return output

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
        margin-top: 2;
        color: #64748b;
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
            # Create the file if it doesn't exist to ensure set_key works later
            open(self.config_path, 'a').close()

        self.api_key = os.getenv("OPENROUTER_API_KEY", "")
        self.workspace = os.path.abspath(workspace) if workspace else os.getcwd()
        self.model = os.getenv("MOSAIC_MODEL", "deepseek/deepseek-v3.2")
        self.llm = OpenRouter(self.api_key)
        self.available_models = [
            "deepseek/deepseek-v3.2",
            "qwen/qwen3-coder-next"
        ]
        self.tools = [
            ReadFileTool(),
            WriteFileTool(),
            EditFileTool(),
            ListDirectoryTool(),
            RunCommandTool()
        ]
        self.history = []

    def compose(self) -> ComposeResult:
        yield Header()
        with Horizontal():
            with Vertical():
                yield RichLog(id="chat-log", highlight=True, markup=True)
                with Horizontal(id="input-area"):
                    yield Input(placeholder="Ask anything...", id="user-input")
            with Vertical(id="settings-pane"):
                yield Label("SETTINGS")
                yield Label("OpenRouter API Key")
                yield Input(placeholder="sk-or-v1-...", value=self.api_key, id="api-key-input", password=True)
                yield Label("Model")
                yield Select([(m, m) for m in self.available_models], value=self.model, id="model-select")
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
            if event["type"] == "token":
                if not assistant_header_written:
                    log.write("\n[bold spring_green3]ASSISTANT:[/]")
                    assistant_header_written = True
                log.write(event["data"], scroll_end=True)
            elif event["type"] == "tool_started":
                log.write(f"\n[italic medium_purple3]→ Calling {event['name']}...[/] [dim]({event['parameters']})[/]")
                assistant_header_written = False
            elif event["type"] == "tool_finished":
                res = event['result']
                # Highlight if file was touched
                if "edit_file" in event['name'] or "write_file" in event['name']:
                    log.write(f" [bold spring_green3]✓ File modified[/]")
                
                truncated = res[:500] + "..." if len(res) > 500 else res
                log.write(f"\n[dim]Result: {truncated}[/]")
                assistant_header_written = False
            elif event["type"] == "error":
                log.write(f"\n[bold red]ERROR: {event['message']}[/]")

        await agent.run(prompt, self.history, on_event)
        self.history.extend(agent.messages[1:]) # Skip system prompt in history


    @on(Button.Pressed, "#save-settings")
    async def save_settings(self):
        self.api_key = self.query_one("#api-key-input").value
        self.model = self.query_one("#model-select").value
        
        # Save to global config
        set_key(self.config_path, "OPENROUTER_API_KEY", self.api_key)
        set_key(self.config_path, "MOSAIC_MODEL", self.model)
        
        self.llm = OpenRouter(self.api_key)
        self.query_one("#chat-log").write("[yellow]Settings saved globally and LLM re-initialized.[/]")


def run():
    workspace = sys.argv[1] if len(sys.argv) > 1 else None
    app = Mosaic(workspace=workspace)
    app.run()


if __name__ == "__main__":
    run()
