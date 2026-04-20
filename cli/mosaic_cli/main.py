import os
import re
from typing import Union
import sys
import json
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
from .core.config import ConfigManager
from .core.session import SessionManager
from .core.tools.registry import ToolRegistry
from .core.components import ChatMessage, ToolBlock, HistorySidebar, HistoryItem, MemorySidebar, MemoryItem, ToolsSidebar, TodoItem, FileTreeSidebar

from .framework.llm.openrouter import OpenRouter
from .framework.llm.openai import OpenAiProvider
from .framework.llm.llama_provider import LlamaProvider
from .framework.llm.lmstudio import LmStudioProvider

from rich.markup import escape
from rich.theme import Theme
from rich.style import Style
from rich.console import Console

MOSAIC_THEME = Theme({
    "markdown.h1": Style(color="#a8917d", bold=True),
    "markdown.h2": Style(color="#a8917d", bold=True),
    "markdown.h3": Style(color="#a8917d", bold=True),
    "markdown.code": Style(bgcolor="#26211e", color="#e6dbb2", italic=True),
    "markdown.block_quote": Style(bgcolor="#2b2621", color="#8b7e6f", italic=True),
    "markdown.link": Style(color="#a8917d", underline=True),
})

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


class Mosaic(App):
    CSS_PATH = "styles.css"

    BINDINGS = [
        Binding("ctrl+s", "toggle_settings", "Settings"),
        Binding("ctrl+h", "toggle_history", "History"),
        Binding("ctrl+m", "toggle_memory", "Memory"),
        Binding("ctrl+t", "toggle_tools", "Tools"),
        Binding("ctrl+f", "toggle_file_tree", "File Tree"),
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
        self.console = Console(theme=MOSAIC_THEME)
        self.workspace = os.path.abspath(workspace) if workspace else os.getcwd()
        
        # Initialize Services
        self.config = ConfigManager("~/.mosaic.env")
        self.session = SessionManager(self.workspace)
        
        # Load State from Config
        self.api_key = self.config.api_key
        self.openai_key = self.config.openai_key
        self.lmstudio_url = self.config.lmstudio_url
        self.provider_type = self.config.provider
        self.model = self.config.model
        self.openai_base_url = self.config.get("OPENAI_BASE_URL", "https://api.openai.com/v1")
        
        # App State
        self.current_session_id = self.session.generate_session_id()
        self.history = []
        
        self._init_llm()
        
        # Memory Manager
        self.memory_manager = MemoryManager(self.workspace, self.llm)

        self.tools = ToolRegistry.get_default_tools(self.memory_manager)
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
        with Horizontal(id="main-container"):
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
            yield FileTreeSidebar(self.workspace, id="file-tree-sidebar")
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
                    ("Qwen 3.6 35B A3B", "qwen/qwen3.6-35B-A3B"),
                    ("Qwen 3.6 Plus", "qwen/qwen3.6-plus"),
                    ("Qwen Coder Next", "qwen/qwen3-coder-next"),
                    ("Custom...", "custom")
                ], value=self.model if self.model in ["qwen/qwen3.5-9b", "qwen/qwen3.5-27b", "qwen/qwen3.6-35B-A3B", "qwen/qwen3.6-plus", "qwen/qwen3-coder-next"] else ("custom" if self.model else "qwen/qwen3.5-27b"), id="model-select")
                
                yield Input(placeholder="Enter model name...", value=self.model, id="custom-model-input")

                yield Button("Save & Refresh", variant="primary", id="save-settings")
                yield Static(f"Workspace: {escape(self.workspace)}", id="workspace-info")
        yield Footer()

    def on_mount(self):
        self.update_provider_settings_visibility(self.provider_type)
        self.query_one("#history-sidebar").refresh_history(self.session.chats_dir)
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

    def action_toggle_file_tree(self):
        sidebar = self.query_one("#file-tree-sidebar")
        sidebar.display = not sidebar.display

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
        
        turn_widgets = []
        
        async def on_event(event):
            nonlocal current_assistant_static, assistant_content, raw_assistant_content, current_tool_block
            
            log = self.query_one("#chat-log")
            
            # Remove loading indicator on first relevant event
            if event["type"] in ["token", "tool_started", "error"]:
                try:
                    loading.remove()
                except Exception:
                    pass
            
            if event["type"] == "token":
                if not current_assistant_static:
                    current_assistant_static = Static("")
                    if turn_widgets:
                        log.mount(current_assistant_static, before=turn_widgets[0])
                    else:
                        log.mount(current_assistant_static)
                    turn_widgets.append(current_assistant_static)
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
                if turn_widgets:
                    log.mount(current_tool_block, before=turn_widgets[0])
                else:
                    log.mount(current_tool_block)
                turn_widgets.append(current_tool_block)
                log.scroll_end()
                
            elif event["type"] == "tool_finished":
                res = event['result']
                
                # Check for todo tools
                if event['name'] == "create_todo":
                    try:
                        data = json.loads(res)
                        if data.get("status") == "success":
                            label = Label("[bold gold1]NEW TODO:[/]")
                            item = TodoItem(
                                data["todo"]["title"],
                                data["todo"]["description"],
                                data["todo"].get("id", "0")
                            )
                            if turn_widgets:
                                log.mount(label, before=turn_widgets[0])
                                log.mount(item, before=turn_widgets[0])
                            else:
                                log.mount(label)
                                log.mount(item)
                                turn_widgets.append(label)
                                turn_widgets.append(item)
                    except Exception as e:
                        self.notify(f"UI Error: Failed to show todo - {str(e)}", severity="error")
                
                if event['name'] == "sync_todo_list":
                    try:
                        data = json.loads(res)
                        if data.get("status") == "success":
                            for todo in data["todos"]:
                                item = TodoItem(
                                    todo.get("title", "Task"),
                                    todo.get("description", ""),
                                    todo.get("id", "0"),
                                    completed=todo.get("completed", False)
                                )
                                if todo.get("completed"):
                                    item.add_class("completed")
                                
                                if turn_widgets:
                                    log.mount(item, before=turn_widgets[0])
                                else:
                                    log.mount(item)
                                    turn_widgets.append(item)
                            
                            sync_label = Label("[bold gold1]TODO LIST SYNCED:[/]")
                            if turn_widgets:
                                log.mount(sync_label, before=turn_widgets[0])
                            else:
                                log.mount(sync_label)
                                turn_widgets.append(sync_label)
                    except Exception as e:
                        self.notify(f"UI Error: Failed to sync todo list - {str(e)}", severity="error")

                file_modified = any(x in event['name'] for x in ["edit_file", "write_file", "create_todo", "update_todo"])
                
                # Auto-refresh file tree after file modifications
                if file_modified:
                    try:
                        self.query_one("#file-tree-sidebar").refresh_tree()
                    except Exception:
                        pass
                
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
        self.session.save_chat(self.current_session_id, self.history)
        
        # Refresh the sidebar if it exists
        try:
            self.query_one("#history-sidebar").refresh_history(self.session.chats_dir)
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
        history = self.session.load_chat(session_id)
        if history is None:
            self.notify("Chat file not found", severity="error")
            return

        try:
            self.history = history
            self.current_session_id = session_id
            
            # Refresh UI
            log = self.query_one("#chat-log")
            log.query("*").remove()
            
            last_tool_block = None
            
            for msg in self.history:
                role = msg.get("role")
                content = msg.get("content", "")
                
                if role == "assistant":
                    if "<tool_call>" in content:
                        # Split by tool call tags
                        parts = re.split(r"(<tool_call>.*?</tool_call>)", content, flags=re.DOTALL)
                        for part in parts:
                            if part.startswith("<tool_call>"):
                                # Parse tool call
                                try:
                                    json_str = part.replace("<tool_call>", "").replace("</tool_call>", "").strip()
                                    call_data = json.loads(json_str)
                                    name = call_data.get("name")
                                    params = call_data.get("arguments")
                                    last_tool_block = ToolBlock(name, params)
                                    log.mount(last_tool_block)
                                except Exception:
                                    log.mount(ChatMessage(role, part))
                            elif part.strip():
                                log.mount(ChatMessage(role, part.strip()))
                    else:
                        log.mount(ChatMessage(role, content))
                
                elif role == "user":
                    if "<tool_response>" in content:
                        try:
                            # Extract JSON inside <tool_response>
                            resp_json = content.replace("<tool_response>", "").replace("</tool_response>", "").strip()
                            resp_data = json.loads(resp_json)
                            name = resp_data.get("name")
                            result = resp_data.get("content")
                            
                            # Handle TODO items
                            if name == "create_todo" and isinstance(result, str):
                                try:
                                    todo_data = json.loads(result)
                                    if todo_data.get("status") == "success":
                                        log.mount(Label("[bold gold1]NEW TODO:[/]"))
                                        log.mount(TodoItem(
                                            todo_data["todo"]["title"],
                                            todo_data["todo"]["description"],
                                            todo_data["todo"].get("id", "0")
                                        ))
                                except Exception:
                                    pass

                            if name == "sync_todo_list" and isinstance(result, str):
                                try:
                                    sync_data = json.loads(result)
                                    if sync_data.get("status") == "success":
                                        log.mount(Label("[bold gold1]TODO LIST SYNCED:[/]"))
                                        for todo in sync_data["todos"]:
                                            item = TodoItem(
                                                todo.get("title", "Task"),
                                                todo.get("description", ""),
                                                todo.get("id", "0"),
                                                completed=todo.get("completed", False)
                                            )
                                            if todo.get("completed"):
                                                item.add_class("completed")
                                            log.mount(item)
                                except Exception:
                                    pass

                            # Update the tool block if it matches
                            if last_tool_block and last_tool_block.tool_name == name:
                                file_modified = any(x in name for x in ["edit_file", "write_file", "create_todo", "update_todo"])
                                last_tool_block.set_result(result if isinstance(result, str) else json.dumps(result), file_modified)
                                last_tool_block = None
                            else:
                                # Fallback for orphans or mismatched results
                                log.mount(Static(f"\n[bold gold1]Tool Result ({name}):[/]\n{str(result)}"))
                        except Exception:
                            log.mount(ChatMessage(role, content))
                    else:
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
        self.current_session_id = self.session.generate_session_id()
        self.history = []
        self.query_one("#chat-log").query("*").remove()
        self.add_message("[dim]New chat session started.[/]\n")
        self.query_one("#history-sidebar").refresh_history(self.session.chats_dir)

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
        
        self.config.set("OPENROUTER_API_KEY", self.api_key)
        self.config.set("OPENAI_API_KEY", self.openai_key)
        self.config.set("LM_STUDIO_URL", self.lmstudio_url)
        self.config.set("MOSAIC_MODEL", self.model)
        self.config.set("MOSAIC_PROVIDER", self.provider_type)
        
        self._init_llm()
        self.memory_manager.llm_provider = self.llm
        self.add_message("[yellow]Settings saved and LLM re-initialized.[/]")


def run():
    workspace = sys.argv[1] if len(sys.argv) > 1 else None
    app = Mosaic(workspace=workspace)
    app.run()


if __name__ == "__main__":
    run()
