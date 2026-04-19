import os
from typing import Union
import asyncio
import sys
import json
from dotenv import load_dotenv, set_key
from textual.app import App, ComposeResult
from textual.containers import Container, Vertical, Horizontal
from textual.widgets import Header, Footer, Input, RichLog, Static, Button, Select, Label, LoadingIndicator, Markdown
from textual.widget import Widget
from textual.suggester import Suggester
from textual.binding import Binding
from textual import on, work
from textual.message import Message

from .core.agent import Agent
from .core.components import ChatMessage, ToolExecution, ToolResult, ToolBlock, TodoSidebar, TodoItem
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
from .framework.llm.lmstudio import LmStudioProvider

from rich.panel import Panel
from rich.text import Text
from rich.box import ROUNDED
from rich.console import Group
from rich.markup import escape

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
    def __init__(self, **kwargs):
        super().__init__("", **kwargs)
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
        margin: 0 1 1 1;
        padding: 0 1;
        overflow-y: scroll;
        scrollbar-gutter: stable;
    }
    #sidebar-resizer {
        width: 1;
        background: #1e293b;
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
        padding: 0 1;
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
    TodoItem {
        height: auto;
    }
    TodoItem Vertical {
        width: 1fr;
        height: auto;
    }
    TodoItem Label, TodoItem Static {
        width: 100%;
        height: auto;
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
        background: #1e293b;
        border: solid #334155;
        border-left: solid #8b5cf6;
        margin: 0 0 1 0;
        padding: 0;
        height: auto;
    }
    .tool-header {
        padding: 0 1;
        background: #334155 40%;
        height: 1;
    }
    .tool-header:hover {
        background: #8b5cf6 30%;
        /* cursor: pointer; (Not supported in Textual) */
    }
    .tool-header #tool-title {
        width: 1fr;
        color: #c084fc;
    }
    .tool-header #tool-chevron {
        width: 3;
        text-align: right;
        color: #64748b;
    }
    #tool-details {
        padding: 1 2;
        background: #0f172a 50%;
        height: auto;
    }
    .tool-block.collapsed #tool-details {
        display: none;
    }
    .tool-params {
        color: #94a3b8;
        margin-bottom: 1;
        height: auto;
    }
    #tool-result-static {
        border-top: dashed #334155;
        padding-top: 1;
        height: auto;
    }
    .tool-header.has-result #tool-title {
        color: #4ade80;
    }
    LoadingIndicator {
        height: 3;
        color: #8b5cf6;
        background: transparent;
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
        self.openai_key = os.getenv("OPENAI_API_KEY", "")
        self.openai_base_url = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
        self.lmstudio_url = os.getenv("LM_STUDIO_URL", "http://localhost:1234/v1")
        self.provider_type = os.getenv("MOSAIC_PROVIDER", "openrouter")
        
        self.workspace = os.path.abspath(workspace) if workspace else os.getcwd()
        self.model = os.getenv("MOSAIC_MODEL", "qwen/qwen3.5-27b")
        
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
        elif self.provider_type == "lmstudio":
            self.llm = LmStudioProvider(self.lmstudio_url)
        elif self.provider_type == "gguf":
            self.llm = LlamaProvider(self.gguf_path)
        else:
            self._log(f"Unknown provider type: {self.provider_type}. Falling back to OpenRouter.", "WARNING")
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
            yield SidebarResizer(id="sidebar-resizer")
            yield TodoSidebar(id="todo-sidebar")
            with Vertical(id="settings-pane"):
                yield Label("SETTINGS")
                yield Label("Provider")
                yield Select([
                    ("OpenRouter", "openrouter"),
                    ("OpenAI", "openai"),
                    ("LM Studio", "lmstudio")
                ], value=self.provider_type, id="provider-select")

                yield Label("OpenRouter API Key")
                yield Input(placeholder="sk-or-v1-...", value=self.api_key, id="api-key-input", password=True)
                
                yield Label("OpenAI API Key")
                yield Input(placeholder="sk-...", value=self.openai_key, id="openai-key-input", password=True)

                yield Label("LM Studio URL")
                yield Input(placeholder="http://localhost:1234/v1", value=self.lmstudio_url, id="lmstudio-url-input")

                yield Label("Model")
                yield Select([
                    ("Qwen 3.5 9b", "qwen/qwen3.5-9b"),
                    ("Qwen 3.5 27b", "qwen/qwen3.5-27b"),
                    ("Qwen 3.6 Plus", "qwen/qwen3.6-plus"),
                    ("Qwen Coder Next", "qwen/qwen3-coder-next"),
                    ("Custom...", "custom")
                ], value=self.model if self.model in ["qwen/qwen3.5-9b", "qwen/qwen3.5-27b", "qwen/qwen3.6-plus", "qwen/qwen3-coder-next"] else ("custom" if self.model else "qwen/qwen3.5-27b"), id="model-select")
                
                yield Input(placeholder="Enter model name...", value=self.model, id="custom-model-input")

                yield Button("Save & Refresh", variant="primary", id="save-settings")
                yield Static(f"Workspace: {escape(self.workspace)}", id="workspace-info")
        yield Footer()

    def on_mount(self):
        self.add_message("[bold gold1]Welcome to Mosaic[/]")
        self.add_message("[dim]Press Ctrl+S for settings, Ctrl+Q to quit[/]\n")
        if self.provider_type == "openrouter" and not self.api_key:
            self.add_message("[red]Warning: OpenRouter API Key not set. Use Ctrl+S to enter it.[/]")
        elif self.provider_type == "openai" and not self.openai_key:
            self.add_message("[red]Warning: OpenAI API Key not set. Use Ctrl+S to enter it.[/]")

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
        
        if self.provider_type == "openrouter" and not self.api_key:
            self.query_one("#chat-log").write("[red]Error: Please set your OpenRouter API Key in settings (Ctrl+S)[/]")
            return
        
        if self.provider_type == "openai" and not self.openai_key:
            self.query_one("#chat-log").write("[red]Error: Please set your OpenAI API Key in settings (Ctrl+S)[/]")
            return

        event.input.value = ""
        self.add_message(f"\n[bold sky_blue1]USER:[/]\n{escape(prompt)}\n")

        self.run_agent(prompt)
    @work(description="Agent processing")
    async def run_agent(self, prompt: str):
        log = self.query_one("#chat-log")
        agent = Agent(self.llm, self.model, self.workspace, "User", self.tools)
        
        current_assistant_static = None
        assistant_content = "" # Rich-formatted content for streaming
        raw_assistant_content = "" # Raw text content for Markdown
        current_tool_block = None
        
        # Add loading indicator
        loading = LoadingIndicator()
        log.mount(loading)
        log.scroll_end()
        
        def on_event(event):
            nonlocal current_assistant_static, assistant_content, current_tool_block, raw_assistant_content
            
            # Remove loading indicator on first relevant event
            if event["type"] in ["token", "tool_started", "error"]:
                try:
                    loading.remove()
                except:
                    pass
            
            if event["type"] == "token":
                if not current_assistant_static:
                    current_assistant_static = Static("")
                    log.mount(current_assistant_static)
                    assistant_content = "[bold spring_green3]ASSISTANT:[/]\n"
                
                raw_assistant_content += event["data"]
                assistant_content += escape(event["data"])
                current_assistant_static.update(assistant_content)
                log.scroll_end()
            elif event["type"] == "tool_started":
                # Finish current snippet
                current_assistant_static = None
                assistant_content = ""
                raw_assistant_content = ""
                
                # Create the collapsible tool block
                current_tool_block = ToolBlock(event['name'], event['parameters'])
                log.mount(current_tool_block)
                log.scroll_end()
                
            elif event["type"] == "tool_finished":
                res = event['result']
                
                # Check for todo tools
                if event['name'] == "create_todo":
                    try:
                        data = json.loads(res)
                        if data.get("status") == "success":
                            self.query_one("#todo-sidebar").add_todo(
                                data["todo"]["title"],
                                data["todo"]["description"],
                                data["todo"].get("id", str(len(self.query_one("#todo-list").children)))
                            )
                    except Exception as e:
                        self.notify(f"UI Error: Failed to add todo - {str(e)}", severity="error")
                
                if event['name'] == "update_todo":
                    try:
                        data = json.loads(res)
                        if data.get("status") == "success":
                            self.query_one("#todo-sidebar").update_todo(
                                data["todo"]["id"],
                                data["todo"]["completed"]
                            )
                    except Exception as e:
                        self.notify(f"UI Error: Failed to update todo - {str(e)}", severity="error")
                
                if event['name'] == "sync_todo_list":
                    try:
                        data = json.loads(res)
                        if data.get("status") == "success":
                            self.query_one("#todo-sidebar").sync_todos(data["todos"])
                    except Exception as e:
                        self.notify(f"UI Error: Failed to sync todo list - {str(e)}", severity="error")

                file_modified = any(x in event['name'] for x in ["edit_file", "write_file", "create_todo", "update_todo"])
                
                # Update the tool block with results
                if 'current_tool_block' in locals() and current_tool_block:
                    current_tool_block.set_result(res, file_modified)
                
                log.scroll_end()
                current_assistant_static = None
                assistant_content = ""
                raw_assistant_content = ""
                current_tool_block = None

            elif event["type"] == "error":
                log.mount(Static(f"\n[bold red]ERROR: {escape(event['message'])}[/]"))
                log.scroll_end()
            elif event["type"] == "final_answer":
                # Replace the last streaming snippet with a proper Markdown widget
                # only if we have raw content (not just whitespace)
                if current_assistant_static and raw_assistant_content.strip():
                    try:
                        current_assistant_static.remove()
                        log.mount(Label("[bold spring_green3]ASSISTANT:[/]\n"))
                        log.mount(Markdown(raw_assistant_content))
                        log.scroll_end()
                    except:
                        pass

        await agent.run(prompt, self.history, on_event)
        self.history.extend(agent.messages[1:]) # Skip system prompt in history


    @on(Button.Pressed, "#save-settings")
    async def save_settings(self):
        self.api_key = self.query_one("#api-key-input").value
        self.openai_key = self.query_one("#openai-key-input").value
        self.lmstudio_url = self.query_one("#lmstudio-url-input").value
        self.provider_type = self.query_one("#provider-select").value
        
        model_selection = self.query_one("#model-select").value
        if model_selection == "custom":
            self.model = self.query_one("#custom-model-input").value
        else:
            self.model = model_selection
        
        set_key(self.config_path, "OPENROUTER_API_KEY", self.api_key)
        set_key(self.config_path, "OPENAI_API_KEY", self.openai_key)
        set_key(self.config_path, "LM_STUDIO_URL", self.lmstudio_url)
        set_key(self.config_path, "MOSAIC_MODEL", self.model)
        set_key(self.config_path, "MOSAIC_PROVIDER", self.provider_type)
        
        self._init_llm()
        self.add_message("[yellow]Settings saved and LLM re-initialized.[/]")


def run():
    workspace = sys.argv[1] if len(sys.argv) > 1 else None
    app = Mosaic(workspace=workspace)
    app.run()


if __name__ == "__main__":
    run()
