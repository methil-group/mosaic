import os
from typing import Union
import sys
import json
from datetime import datetime
from dotenv import load_dotenv, set_key
from textual.app import App, ComposeResult
from textual.containers import Vertical, Horizontal
from textual.widgets import Header, Footer, Input, Static, Button, Select, Label, LoadingIndicator, Markdown
from textual.widget import Widget
from textual.suggester import Suggester
from textual.binding import Binding
from textual import on, work
from textual.message import Message

from .core.agent import Agent
from .core.memory import MemoryManager
from .core.components import ChatMessage, ToolBlock, TodoSidebar, HistorySidebar, HistoryItem, MemorySidebar, MemoryItem, ToolsSidebar
from .core.tools.read_file import ReadFileTool
from .core.tools.write_file import WriteFileTool
from .core.tools.edit_file import EditFileTool
from .core.tools.list_directory import ListDirectoryTool
from .core.tools.run_command import RunCommandTool
from .core.tools.create_todo import CreateTodoTool
from .core.tools.update_todo import UpdateTodoTool
from .core.tools.sync_todo_list import SyncTodoListTool
from .core.tools.store_memory import StoreMemoryTool
from .core.tools.recall_memories import RecallMemoriesTool

from .framework.llm.openrouter import OpenRouter
from .framework.llm.openai import OpenAiProvider
from .framework.llm.llama_provider import LlamaProvider
from .framework.llm.lmstudio import LmStudioProvider

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
        except Exception:
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
        background: #1c1917;
    }
    #chat-area {
        width: 1fr;
    }
    #chat-log {
        height: 1fr;
        border: tall #2b2621;
        background: #2b2621 10%;
        margin: 0 1 1 1;
        padding: 0 1;
        overflow-y: scroll;
        scrollbar-gutter: stable;
    }
    #sidebar-resizer {
        width: 1;
        background: #2b2621;
    }
    #sidebar-resizer:hover, #sidebar-resizer.dragging {
        background: #a8917d;
    }
    #input-area {
        height: auto;
        dock: bottom;
        padding: 0 2 1 2;
    }
    #user-input {
        border: tall #453c35;
        background: #26211e;
        color: #d1bda2;
    }
    #user-input:focus {
        border: tall #a8917d;
    }
    .status-bar {
        background: #a8917d;
        color: #1c1917;
        padding: 0 1;
    }
    #settings-pane {
        width: 40;
        dock: right;
        border-left: tall #453c35;
        background: #1c1917;
        display: none;
        padding: 1 2;
    }
    #todo-sidebar {
        width: 35;
        dock: right;
        border-left: tall #2b2621;
        background: #1c1917;
        padding: 0 1;
    }
    #todo-sidebar-title {
        text-style: bold;
        color: #a8917d;
        margin-bottom: 1;
        padding: 1 1;
        border-bottom: dashed #453c35;
    }
    #todo-list {
        height: 1fr;
        padding: 0 1;
    }
    
    TodoItem {
        height: auto;
        margin-bottom: 1;
        background: #26211e 20%;
        border-left: solid #453c35;
        padding: 0 1;
    }
    TodoItem:hover {
        background: #3d352e 30%;
        border-left: solid #a8917d;
    }
    TodoItem.completed {
        opacity: 0.6;
    }
    TodoItem.completed Label {
        text-style: strike;
        color: #7d6e5e;
    }
    
    TodoItem Vertical {
        width: 1fr;
        height: auto;
        padding-left: 1;
    }
    .todo-item-title {
        color: #d1bda2;
        text-style: bold;
    }
    .todo-item-desc {
        color: #8b7e6f;
    }
    
    #settings-pane Label {
        margin-top: 1;
        text-style: bold;
        color: #a68f78;
    }
    #save-settings {
        margin-top: 2;
        width: 100%;
        background: #a8917d;
        color: #1c1917;
    }
    #workspace-info {
        margin-top: 1;
        color: #7d6e5e;
        text-style: italic;
    }
    .tool-block {
        background: #26211e;
        border: solid #453c35;
        border-left: solid #a8917d;
        margin: 0 0 1 0;
        padding: 0;
        height: auto;
    }
    .tool-header {
        padding: 0 1;
        background: #3d352e 60%;
        height: 1;
    }
    .tool-header:hover {
        background: #a8917d 20%;
    }
    .tool-header #tool-title {
        width: 1fr;
        color: #d1bda2;
    }
    .tool-header #tool-chevron {
        width: 3;
        text-align: right;
        color: #8b7e6f;
    }
    #tool-details {
        padding: 1 2;
        background: #1c1917 50%;
        height: auto;
    }
    .tool-block.collapsed #tool-details {
        display: none;
    }
    .tool-params {
        color: #8b7e6f;
        margin-bottom: 1;
        height: auto;
    }
    #tool-result-static {
        border-top: dashed #453c35;
        padding-top: 1;
        height: auto;
    }
    .tool-header.has-result #tool-title {
        color: #d1bda2;
        text-style: italic;
    }
    LoadingIndicator {
        height: 3;
        color: #a8917d;
        background: transparent;
    }
    .provider-settings {
        height: auto;
        display: none;
    }
    #history-sidebar {
        width: 30;
        dock: left;
        border-right: tall #2b2621;
        background: #1c1917;
        padding: 0 1;
        display: none;
    }
    #history-sidebar-title {
        text-style: bold;
        color: #a8917d;
        margin-bottom: 1;
        padding: 1 1;
        border-bottom: dashed #453c35;
    }
    #new-chat-btn {
        width: 100%;
        margin-bottom: 1;
        background: #a8917d;
        color: #1c1917;
        margin-top: 1;
    }
    #history-list {
        height: 1fr;
    }
    HistoryItem {
        height: auto;
        margin-bottom: 1;
        padding: 1 1;
        background: #26211e 20%;
        border-left: solid #453c35;
    }
    HistoryItem:hover {
        background: #3d352e 30%;
        border-left: solid #a8917d;
    }
    .history-item-title {
        color: #d1bda2;
        text-style: bold;
    }
    .history-item-date {
        color: #8b7e6f;
    }
    #memory-sidebar {
        width: 35;
        dock: left;
        border-right: tall #2b2621;
        background: #1c1917;
        padding: 0 1;
        display: none;
    }
    #memory-sidebar-title {
        text-style: bold;
        color: #a8917d;
        margin-bottom: 1;
        padding: 1 1;
        border-bottom: dashed #453c35;
    }
    #memory-list {
        height: 1fr;
    }
    MemoryItem {
        height: auto;
        margin-bottom: 1;
        background: #26211e 20%;
        border-left: solid #453c35;
        padding: 0;
    }
    MemoryItem:hover {
        background: #3d352e 30%;
        border-left: solid #a8917d;
    }
    .memory-item-content {
        width: 1fr;
        padding: 0 1;
    }
    .memory-text {
        color: #d1bda2;
    }
    .memory-footer {
        height: 1;
    }
    .memory-date {
        color: #7d6e5e;
    }
    .memory-tags {
        color: #a8917d;
    }
    .delete-mem-btn {
        min-width: 3;
        width: 3;
        height: 100%;
        background: #451a1a;
        color: #ff6b6b;
        border: none;
    }
    #memory-input-area {
        height: auto;
        border-top: dashed #453c35;
        padding: 1 0;
    }
    #memory-manual-input {
        background: #26211e;
        border: tall #453c35;
    }
    #tools-sidebar {
        width: 35;
        dock: left;
        border-right: tall #2b2621;
        background: #1c1917;
        padding: 0 1;
        display: none;
    }
    #tools-sidebar-title {
        text-style: bold;
        color: #a8917d;
        margin-bottom: 1;
        padding: 1 1;
        border-bottom: dashed #453c35;
    }
    #tools-list {
        height: 1fr;
        padding: 0 1;
    }
    ToolItem {
        height: auto;
        margin-bottom: 1;
        padding: 1 1;
        background: #26211e 40%;
        border-left: solid #453c35;
    }
    ToolItem:hover {
        background: #3d352e 50%;
        border-left: solid #a8917d;
    }
    .tool-item-name {
        color: #a8917d;
        text-style: bold;
    }
    .tool-item-desc {
        color: #8b7e6f;
    }
    """

    BINDINGS = [
        Binding("ctrl+s", "toggle_settings", "Settings"),
        Binding("ctrl+h", "toggle_history", "History"),
        Binding("ctrl+m", "toggle_memory", "Memory"),
        Binding("ctrl+t", "toggle_tools", "Tools"),
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
        
        # Session & Storage
        self.chats_dir = os.path.join(self.workspace, ".mosaic", "chats")
        os.makedirs(self.chats_dir, exist_ok=True)
        self.current_session_id = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        self._init_llm()
        
        # Memory Manager
        self.memory_manager = MemoryManager(self.workspace, self.llm)

        self.tools = [
            ReadFileTool(),
            WriteFileTool(),
            EditFileTool(),
            ListDirectoryTool(),
            RunCommandTool(),
            CreateTodoTool(),
            UpdateTodoTool(),
            SyncTodoListTool(),
            StoreMemoryTool(self.memory_manager),
            RecallMemoriesTool(self.memory_manager)
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
            yield HistorySidebar(id="history-sidebar")
            yield MemorySidebar(id="memory-sidebar")
            yield ToolsSidebar(id="tools-sidebar")
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

                with Vertical(id="openrouter-settings", classes="provider-settings"):
                    yield Label("OpenRouter API Key")
                    yield Input(placeholder="sk-or-v1-...", value=self.api_key, id="api-key-input", password=True)
                
                with Vertical(id="openai-settings", classes="provider-settings"):
                    yield Label("OpenAI API Key")
                    yield Input(placeholder="sk-...", value=self.openai_key, id="openai-key-input", password=True)

                with Vertical(id="lmstudio-settings", classes="provider-settings"):
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
        self.update_provider_settings_visibility(self.provider_type)
        self.query_one("#history-sidebar").refresh_history(self.chats_dir)
        self.query_one("#memory-sidebar").refresh_memories(self.memory_manager.memories)
        self.query_one("#tools-sidebar").refresh_tools(self.tools)
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

    def action_toggle_history(self):
        sidebar = self.query_one("#history-sidebar")
        memory = self.query_one("#memory-sidebar")
        tools = self.query_one("#tools-sidebar")
        if not sidebar.display:
            memory.display = False 
            tools.display = False
        sidebar.display = not sidebar.display

    def action_toggle_memory(self):
        sidebar = self.query_one("#history-sidebar")
        memory = self.query_one("#memory-sidebar")
        tools = self.query_one("#tools-sidebar")
        if not memory.display:
            sidebar.display = False
            tools.display = False
        memory.display = not memory.display
        if memory.display:
            memory.refresh_memories(self.memory_manager.memories)

    def action_toggle_tools(self):
        sidebar = self.query_one("#history-sidebar")
        memory = self.query_one("#memory-sidebar")
        tools = self.query_one("#tools-sidebar")
        if not tools.display:
            sidebar.display = False
            memory.display = False
        tools.display = not tools.display
        if tools.display:
            tools.refresh_tools(self.tools)

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
            self.add_message("[red]Error: Please set your OpenRouter API Key in settings (Ctrl+S)[/]")
            return
        
        if self.provider_type == "openai" and not self.openai_key:
            self.add_message("[red]Error: Please set your OpenAI API Key in settings (Ctrl+S)[/]")
            return

        event.input.value = ""
        self.add_message(f"\n[bold sky_blue1]USER:[/]\n{escape(prompt)}\n")

        self.run_agent(prompt)
    @work(description="Agent processing")
    async def run_agent(self, prompt: str):
        log = self.query_one("#chat-log")
        agent = Agent(self.llm, self.model, self.workspace, "User", self.tools, memory_manager=self.memory_manager)
        
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
                except Exception:
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
                    except Exception:
                        pass
                
                # Save chat to history
                self.save_chat()

        await agent.run(prompt, self.history, on_event)
        self.history.extend(agent.messages[1:]) # Skip system prompt in history
        self.save_chat() # Final save to be sure

    def save_chat(self):
        if not self.history:
            return
        
        filename = f"chat_{self.current_session_id}.json"
        path = os.path.join(self.chats_dir, filename)
        data = {
            "session_id": self.current_session_id,
            "last_updated": datetime.now().isoformat(),
            "history": self.history
        }
        with open(path, "w") as f:
            json.dump(data, f, indent=2)
        
        # Refresh the sidebar if it exists
        try:
            self.query_one("#history-sidebar").refresh_history(self.chats_dir)
            self.query_one("#memory-sidebar").refresh_memories(self.memory_manager.memories)
        except Exception:
            pass

    @on(MemorySidebar.AddRequested)
    async def handle_memory_add(self, message: MemorySidebar.AddRequested):
        self.notify("Generating embedding for memory...")
        success = await self.memory_manager.store(message.text, tags=["manual"])
        if success:
            self.notify("Memory stored!")
            self.query_one("#memory-sidebar").refresh_memories(self.memory_manager.memories)
        else:
            self.notify("Failed to store memory", severity="error")

    @on(MemoryItem.DeleteRequested)
    def handle_memory_delete(self, message: MemoryItem.DeleteRequested):
        if self.memory_manager.delete(message.index):
            self.notify("Memory deleted")
            self.query_one("#memory-sidebar").refresh_memories(self.memory_manager.memories)
        else:
            self.notify("Failed to delete memory", severity="error")


    @on(HistoryItem.Selected)
    def handle_chat_selected(self, message: HistoryItem.Selected):
        self.load_chat(message.session_id)

    def load_chat(self, session_id: str):
        path = os.path.join(self.chats_dir, f"chat_{session_id}.json")
        if not os.path.exists(path):
            self.notify("Chat file not found", severity="error")
            return

        try:
            with open(path, "r") as f:
                data = json.load(f)
                self.history = data.get("history", [])
                self.current_session_id = session_id
                
                # Refresh UI
                log = self.query_one("#chat-log")
                log.query("*").remove()
                
                for msg in self.history:
                    # Filter out tool calls/results from view if they are too noisy?
                    # For now, let's just show standard messages
                    role = msg.get("role")
                    content = msg.get("content", "")
                    if role in ["user", "assistant"]:
                        log.mount(ChatMessage(role, content))
                
                log.scroll_end()
                self.notify(f"Loaded chat session: {session_id}")
        except Exception as e:
            self.notify(f"Failed to load chat: {str(e)}", severity="error")

    @on(HistorySidebar.NewChatRequested)
    def handle_new_chat(self):
        # Save current before clearing
        self.save_chat()
        
        # Reset
        self.current_session_id = datetime.now().strftime("%Y%m%d_%H%M%S")
        self.history = []
        self.query_one("#chat-log").query("*").remove()
        self.add_message("[dim]New chat session started.[/]\n")
        self.query_one("#history-sidebar").refresh_history(self.chats_dir)

    @on(Select.Changed, "#provider-select")
    def on_provider_changed(self, event: Select.Changed):
        self.update_provider_settings_visibility(event.value)

    def update_provider_settings_visibility(self, provider: str):
        try:
            self.query_one("#openrouter-settings").display = provider == "openrouter"
            self.query_one("#openai-settings").display = provider == "openai"
            self.query_one("#lmstudio-settings").display = provider == "lmstudio"
        except Exception:
            pass

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
        self.memory_manager.llm_provider = self.llm
        self.add_message("[yellow]Settings saved and LLM re-initialized.[/]")


def run():
    workspace = sys.argv[1] if len(sys.argv) > 1 else None
    app = Mosaic(workspace=workspace)
    app.run()


if __name__ == "__main__":
    run()
