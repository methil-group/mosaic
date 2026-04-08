import os
from typing import Union
import asyncio
import sys
import json
from dotenv import load_dotenv, set_key
from textual.app import App, ComposeResult
from textual.containers import Container, Vertical, Horizontal
from textual.widgets import Header, Footer, Input, RichLog, Static, Button, Select, Label
from textual.widget import Widget
from textual.suggester import Suggester
from textual.binding import Binding
from textual import on, work
from textual.message import Message

from .core.agent import Agent
from .core.components import ChatMessage, ToolExecution, ToolResult, TodoSidebar, TodoItem
from .core.tools.read_file import ReadFileTool
from .core.tools.write_file import WriteFileTool
from .core.tools.edit_file import EditFileTool
from .core.tools.list_directory import ListDirectoryTool
from .core.tools.run_command import RunCommandTool
from .core.tools.create_todo import CreateTodoTool
from .core.tools.update_todo import UpdateTodoTool
from .core.tools.sync_todo_list import SyncTodoListTool

from .framework.llm.openrouter import OpenRouter
from .framework.llm.openai import OpenAiProvider
from .framework.llm.llama_provider import LlamaProvider

from rich.panel import Panel
from rich.text import Text
from rich.box import ROUNDED
from rich.console import Group

class FileSuggester(Suggester):
    def __init__(self, workspace: str):
        super().__init__(use_cache=False)
        self.workspace = workspace

    async def get_suggestion(self, value: str) -> str | None:
        if "@" not in value:
            return None
        
        parts = value.rsplit("@", 1)
        prefix = parts[0]
        to_complete = parts[1]
        
        # Get all files in workspace
        matches = []
        try:
            for root, dirs, files in os.walk(self.workspace):
                # Skip hidden dirs
                dirs[:] = [d for d in dirs if not d.startswith('.')]
                for f in files:
                    rel_path = os.path.relpath(os.path.join(root, f), self.workspace)
                    if rel_path.startswith(to_complete):
                        matches.append(rel_path)
        except:
            return None
            
        if not matches:
            return None
            
        # Return first match
        return prefix + "@" + matches[0]

class SidebarResizer(Static):
    def __init__(self):
        super().__init__("")
        self.dragging = False

    def on_mouse_down(self, event):
        self.dragging = True
        self.capture_mouse()
        self.add_class("dragging")

    def on_mouse_move(self, event):
        if self.dragging:
            self.post_message(self.Resized(event.screen_x))

    def on_mouse_up(self, event):
        self.dragging = False
        self.release_mouse()
        self.remove_class("dragging")

    class Resized(Message):
        def __init__(self, screen_x: int):
            self.screen_x = screen_x
            super().__init__()

class Mosaic(App):
    CSS = """
    Screen {
        background: #0f172a;
    }
    #chat-area {
        width: 1fr;
    }
    #chat-log {
        height: 1fr;
        border: tall #1e293b;
        background: #1e293b 10%;
        margin: 1 0 1 2;
        padding: 1 2;
        overflow-y: scroll;
        scrollbar-gutter: stable;
        can-focus: true;
    }
    #sidebar-resizer {
        width: 1;
        background: #1e293b;
        cursor: ew-resize;
    }
    #sidebar-resizer:hover, #sidebar-resizer.dragging {
        background: $accent;
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
        Binding("ctrl+c", "copy_last_message", "Copy Last", show=True),
        Binding("ctrl+l", "clear_log", "Clear"),
    ]

    def action_copy_last_message(self):
        # Find latest assistant message
        if hasattr(self, 'history') and self.history:
            # We want the last assistant message
            assistant_msgs = [m for m in self.history if m.get('role') == 'assistant']
            if assistant_msgs:
                last_msg = assistant_msgs[-1].get('content', '')
                self.copy_to_clipboard(last_msg)
                self.notify("Last assistant message copied!")
            else:
                self.notify("No assistant message to copy.", severity="error")
        else:
            self.notify("History is empty.", severity="error")

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
            CreateTodoTool(),
            UpdateTodoTool(),
            SyncTodoListTool()
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
            with Vertical(id="chat-area"):
                yield Vertical(id="chat-log")
                with Horizontal(id="input-area"):
                    yield Input(
                        placeholder="Ask anything... (@ to autocomplete files)", 
                        id="user-input",
                        suggester=FileSuggester(self.workspace)
                    )
            yield SidebarResizer().set_id("sidebar-resizer")
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
        self.add_message("[bold gold1]Welcome to Mosaic[/]")
        self.add_message("[dim]Press Ctrl+S for settings, Ctrl+Q to quit[/]\n")
        if not self.api_key:
            self.add_message("[red]Warning: API Key not set. Use Ctrl+S to enter it.[/]")

    def add_message(self, content: Union[str, Widget]):
        log = self.query_one("#chat-log")
        if isinstance(content, str):
            log.mount(Static(content))
        else:
            log.mount(content)
        log.scroll_end()

    @work
    async def refresh_models(self):
        # We now use a hardcoded list of models as requested
        pass

    def action_toggle_settings(self):
        pane = self.query_one("#settings-pane")
        pane.display = not pane.display

    def action_clear_log(self):
        self.query_one("#chat-log").clear()

    @on(SidebarResizer.Resized)
    def handle_sidebar_resize(self, message: SidebarResizer.Resized):
        sidebar = self.query_one("#todo-sidebar")
        new_width = self.size.width - message.screen_x
        if 15 < new_width < self.size.width - 20:
            sidebar.styles.width = new_width

    @on(Input.Submitted, "#user-input")
    async def on_input_submitted(self, event: Input.Submitted):
        prompt = event.value
        if not prompt:
            return
        
        if not self.api_key:
            self.query_one("#chat-log").write("[red]Error: Please set your OpenRouter API Key in settings (Ctrl+S)[/]")
            return

        event.input.value = ""
        self.add_message(f"\n[bold sky_blue1]USER:[/]\n{prompt}\n")
        
        self.run_agent(prompt)

    @work
    async def run_agent(self, prompt: str):
        log = self.query_one("#chat-log")
        agent = Agent(self.llm, self.model, self.workspace, "User", self.tools)
        
        current_assistant_static = None
        assistant_content = ""
        
        def on_event(event):
            nonlocal current_assistant_static, assistant_content
            
            if event["type"] == "token":
                if not current_assistant_static:
                    current_assistant_static = Static("")
                    log.mount(current_assistant_static)
                    assistant_content = "[bold spring_green3]ASSISTANT:[/]\n"
                
                assistant_content += event["data"]
                current_assistant_static.update(assistant_content)
                log.scroll_end()
            elif event["type"] == "tool_started":
                # Finish current snippet
                current_assistant_static = None
                assistant_content = ""
                
                # Create a group or panel for the tool call
                params_str = ", ".join([f"{k}={v}" for k,v in event['parameters'].items()])
                call_panel = Static(Panel(
                    Text.from_markup(f"[bold]Parameters:[/] [dim]{params_str}[/]"),
                    title=f"[bold medium_purple3]🛠️ {event['name']}[/]",
                    title_align="left",
                    border_style="medium_purple3",
                    box=ROUNDED,
                    expand=False,
                    padding=(0, 1)
                ))
                log.mount(call_panel)
                log.scroll_end()
            elif event["type"] == "tool_finished":
                res = event['result']
                
                # Check for create_todo and update the side bar
                if event['name'] == "create_todo":
                    try:
                        data = json.loads(res)
                        if data.get("status") == "success":
                            self.query_one("#todo-sidebar").add_todo(
                                data["todo"]["title"],
                                data["todo"]["description"],
                                data["todo"].get("id", str(len(self.query_one("#todo-list").children)))
                            )
                    except:
                        pass
                
                if event['name'] == "update_todo":
                    try:
                        data = json.loads(res)
                        if data.get("status") == "success":
                            self.query_one("#todo-sidebar").update_todo(
                                data["todo"]["id"],
                                data["todo"]["completed"]
                            )
                    except:
                        pass
                
                if event['name'] == "sync_todo_list":
                    try:
                        data = json.loads(res)
                        if data.get("status") == "success":
                            self.query_one("#todo-sidebar").sync_todos(data["todos"])
                    except:
                        pass

                file_status = " ✓ File modified" if any(x in event['name'] for x in ["edit_file", "write_file"]) else ""
                
                truncated = res[:500] + "..." if len(res) > 500 else res
                result_panel = Static(Panel(
                    Text.from_markup(f"[dim]{truncated}[/]"),
                    title=f"[bold spring_green3]↳ Result{file_status}[/]",
                    title_align="left",
                    border_style="spring_green3",
                    box=ROUNDED,
                    expand=False,
                    padding=(0, 1)
                ))
                log.mount(result_panel)
                log.scroll_end()
                current_assistant_static = None
                assistant_content = ""
            elif event["type"] == "error":
                log.mount(Static(f"\n[bold red]ERROR: {event['message']}[/]"))
                log.scroll_end()

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
