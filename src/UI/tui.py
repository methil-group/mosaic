import os
import sys
import asyncio
from typing import List, Optional

from textual.app import App, ComposeResult
from textual.widgets import Header, Footer, Input, Static, Label, ListItem, ListView, Button
from textual.containers import Vertical, Horizontal, ScrollableContainer
from textual.reactive import reactive
from textual import events
from rich.markdown import Markdown

# Add root project path to sys.path to allow imports from src
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

from src.Framework.Utils.logger import llm_logger, ui_logger

from src.Core.Agent.agent import Agent
from src.Core.LLM.Registry.llm_registry import LLMRegistry
from src.UI.components.chat_message import ChatMessage
from src.UI.components.workspace_sidebar import WorkspaceItem
from src.UI.components.config_screen import ConfigScreen
from src.UI.components.add_workspace_modal import AddWorkspaceModal

class AgentTUI(App):
    """Modern TUI for the Agent with Workspace Sidebar."""
    
    TITLE = "Methil Vibe Agent"
    SUB_TITLE = "Iterative Agentic Workspace"
    CSS_PATH = "styles.css"

    BINDINGS = [
        ("v", "toggle_verbose", "Toggle Logs"),
        ("c", "show_config", "Config"),
        ("a", "add_workspace", "Add Workspace"),
        ("q", "quit", "Quit"),
    ]

    def on_mouse_down(self, event: events.MouseDown) -> None:
        """Global intercept for mouse events to disable 'left button' updates."""
        if event.button == 1:
            event.stop()
            event.prevent_default()

    def on_click(self, event: events.Click) -> None:
        """Fully suppress left-click events."""
        if event.button == 1:
            event.stop()
            event.prevent_default()

    def compose(self) -> ComposeResult:
        yield Header()
        with Horizontal(id="main-layout"):
            with Vertical(id="sidebar"):
                yield Label("WORKSPACES", classes="workspace-header")
                with ListView(id="workspace-list"):
                    # Start empty or pass
                    pass
                yield Button("＋ Add Workspace", id="add-ws-btn", variant="success")
            with Vertical(id="chat-area"):
                # Workspace specific header
                with Horizontal(id="chat-header"):
                    yield Label("No Workspace Selected", id="workspace-status")
                    yield Label("", id="model-indicator")
                
                yield ScrollableContainer(id="chat-scroll")
                # Input starts disabled until a workspace is selected
                yield Input(placeholder="Select a workspace to start chatting...", id="user-input", disabled=True)
            
            with Vertical(id="log-container"):
                with Horizontal(id="log-header"):
                     yield Button("Copy Logs", id="copy-logs-btn", variant="primary")
                yield ScrollableContainer(id="log-scroll")

        yield Footer()

    def on_mount(self) -> None:
        # Initialize our Agent
        try:
            # Default to OpenRouter Mistral
            llm_class = LLMRegistry.get_class("openrouter")
            llm = llm_class("mistralai/devstral-2512")
            self.agent = Agent(llm, verbose=True)
        except Exception as e:
            # Import here to avoid circular or early import issues if needed
            from src.Core.LLM.openrouter_llm import OpenRouterLLM
            llm = OpenRouterLLM("mistralai/devstral-2512")
            self.agent = Agent(llm, verbose=True)
            self.notify(f"Initialization Warn: {str(e)} - Using fallback", severity="warning")
            
        self.input = self.query_one("#user-input")
        self.chat_scroll = self.query_one("#chat-scroll")
        self.log_container = self.query_one("#log-container")
        self.log_scroll = self.query_one("#log-scroll")
        self.workspace_list = self.query_one("#workspace-list")
        
        # Add current directory as default
        self.workspace_list.append(WorkspaceItem("Current Project", os.getcwd()))
        
        # Initialize status bar
        self.query_one("#model-indicator", Label).update(f"Model: {self.agent.llm.model_id}")
        self.query_one("#workspace-status", Label).update(f"Workspace: Current Project")

        # Wire up TodoManager updates
        def update_todos_ui(items):
            # Render items to markdown
            if not items:
                content = "" # Empty content hides the view in ChatMessage
            else:
                lines = []
                for item in items:
                    icon = "- [ ]"
                    if item.status == "completed":
                        icon = "- [x]"
                    elif item.status == "in_progress":
                        icon = "- [>]" # Custom icon, Markdown might treat as list
                    
                    # Use standard markdown checklist syntax where possible, or rich text
                    # Since we are using a Markdown widget, let's use standard markdown
                    # But we want styling. 
                    # The Markdown widget in Textual supports Github flavored markdown.
                    
                    if item.status == "completed":
                        line = f"- [x] ~~{item.content}~~"
                    elif item.status == "in_progress":
                        # Bold for emphasis
                        line = f"- [ ] **{item.content}**"
                        if item.active_form:
                            line += f"\n    *↳ {item.active_form}*"
                    else:
                        line = f"- [ ] {item.content}"
                        
                    lines.append(line)
                content = "\n".join(lines)
            
            # Post to main thread
            # We need to target the CURRENT assistant message if it exists
            if hasattr(self, 'assistant_msg') and self.assistant_msg:
                 self.call_from_thread(self.assistant_msg.update_todos, content)

        self.agent.todo_manager.on_update = update_todos_ui

    def action_toggle_verbose(self) -> None:
        self.log_container.toggle_class("visible")
        
    def action_copy_logs(self) -> None:
        """Copy all logs to clipboard."""
        try:
            # We can read from the persistent file or just grab the text from the UI
            # Reading file is safer/more complete
            log_path = "logs/ui_log.txt"
            if os.path.exists(log_path):
                with open(log_path, "r", encoding="utf-8") as f:
                    content = f.read()
                self.app.copy_to_clipboard(content)
                self.notify("Logs copied to clipboard!")
            else:
                 self.notify("No log file found.", severity="error")
        except Exception as e:
            self.notify(f"Failed to copy logs: {e}", severity="error")

    def action_show_config(self) -> None:
        def handle_config(data):
            if data:
                self.update_llm_config(data["provider"], data["model_id"], data.get("base_url"))

        self.push_screen(ConfigScreen(), handle_config)

    def update_llm_config(self, provider: str, model_id: str, base_url: Optional[str] = None) -> None:
        """Swap the LLM driver and update the UI."""
        try:
            llm_class = LLMRegistry.get_class(provider)
            if not llm_class:
                raise ValueError(f"Unknown provider: {provider}")
            
            # Instantiate with base_url if provided and supported (using keyword args)
            # Instantiate with base_url only for providers that support it (like lmstudio)
            if provider == "lmstudio" and base_url:
                new_llm = llm_class(model_id, base_url=base_url)
            else:
                new_llm = llm_class(model_id)

            # Update agent's LLM
            self.agent.llm = new_llm
            
            # Update UI indicators
            self.query_one("#model-indicator", Label).update(f"Model: {model_id}")
            self.notify(f"Updated LLM to {model_id} ({provider})")
            
            self.log_scroll.mount(Static(f"[bold green]LLM UPDATED:[/] {model_id} via {provider}", classes="tool-log"))
            self.log_scroll.scroll_end()
            
        except Exception as e:
            self.notify(f"Failed to update LLM: {str(e)}", severity="error")

    def action_add_workspace(self) -> None:
        def handle_added(data):
            if data:
                self.workspace_list.append(WorkspaceItem(data["name"], data["path"]))
                self.notify(f"Added workspace: {data['name']}")

        self.push_screen(AddWorkspaceModal(), handle_added)

    def on_button_pressed(self, event: Button.Pressed) -> None:
        if event.button.id == "add-ws-btn":
            self.action_add_workspace()
        elif event.button.id == "copy-logs-btn":
            self.action_copy_logs()

    def on_list_view_selected(self, event: ListView.Selected) -> None:
        if isinstance(event.item, WorkspaceItem):
            workspace = event.item
            # Change directory to the workspace path
            try:
                os.chdir(workspace.path)
                self.input.disabled = False
                self.input.placeholder = f"Chatting in {workspace.workspace_name}..."
                self.input.focus()
                self.notify(f"Switched to workspace: {workspace.workspace_name}")
                self.log_scroll.mount(Static(f"[bold blue]WORKSPACE CHANGED:[/] {workspace.path}", classes="tool-log"))
                self.log_scroll.scroll_end()
            except Exception as e:
                self.notify(f"Error accessing path: {str(e)}", severity="error")

    async def on_input_submitted(self, event: Input.Submitted) -> None:
        prompt = event.value.strip()
        if not prompt:
            return
            
        self.input.value = ""
        self.input.disabled = True
        self.input.placeholder = "Agent is thinking..."
        
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
        self.assistant_msg = assistant_msg 
        ui_logger.log(f"[TUI] run_agent_loop entry with prompt: {prompt[:50]}...")
        
        # 1. UI Setup
        main_layout = self.query_one("#main-layout")
        workspace_list = self.query_one("#workspace-list")
        add_btn = self.query_one("#add-ws-btn")
        
        main_layout.add_class("processing")
        workspace_list.disabled = True
        add_btn.disabled = True

        # 2. Callbacks
        def on_token(text: str):
            # Already on main thread via run_async await
            assistant_msg.text_content += text
            assistant_msg.update_text(assistant_msg.text_content)
            self.chat_scroll.scroll_end()

        def on_tool_start(tag: str):
            # Already on main thread
            assistant_msg.start_streaming_action(tag)

        def on_tool_output(content: str):
            # Already on main thread
            assistant_msg.stream_to_action(content)

        def on_tool_end(result: str = ""):
            # Already on main thread
            assistant_msg.end_streaming_action()

        import threading
        def on_log(msg: str, level: str = "INFO"):
            msg_text = str(msg).strip()
            # Persistent file log
            llm_logger.log(msg_text, level=level)

            def _update():
                 # Format sidebar log
                if "[TOOL RESULT]" in msg_text:
                    style = "tool-result"
                    self.log_scroll.mount(Static(f"\n{msg_text}", classes=style, markup=False))
                elif "[EXECUTING TOOL]" in msg_text:
                    style = "tool-log"
                    self.log_scroll.mount(Static(msg_text, classes=style, markup=False))
                else:
                    self.log_scroll.mount(Static(f"[blue]{level}:[/] {msg_text}"))
                
                # Add to message actions panel if it's a tool-related log
                if "[EXECUTING TOOL]" in msg_text or "[TOOL RESULT]" in msg_text:
                     assistant_msg.add_action(msg_text)
                
                self.log_scroll.scroll_end()
            
            # Handle both main thread (async loop) and worker thread (LLM generator) calls
            if threading.current_thread() is threading.main_thread():
                _update()
            else:
                self.call_from_thread(_update)
            
        def on_error(e: Exception):
             ui_logger.log(f"[TUI] Agent Error: {e}", level="ERROR")
             def _update():
                 self.log_scroll.mount(Static(f"[red]Error: {str(e)}[/]"))
             
             if threading.current_thread() is threading.main_thread():
                _update()
             else:
                self.call_from_thread(_update)

        # 3. Execution
        try:
            ui_logger.log("[TUI] Calling agent.run_async")
            await self.agent.run_async(
                prompt,
                on_token=on_token,
                on_tool_start=on_tool_start,
                on_tool_output=on_tool_output,
                on_tool_end=on_tool_end,
                on_log=on_log,
                on_error=on_error
            )
            
        except Exception as outer_e:
            import traceback
            outer_tb = traceback.format_exc()
            ui_logger.log(f"[TUI] CRITICAL ERROR IN run_agent_loop: {outer_e}\n{outer_tb}", level="ERROR")
            self.log_scroll.mount(Static(f"[red]CRITICAL ERROR: {str(outer_e)}[/]"))
            
        finally:
            ui_logger.log("[TUI] run_agent_loop finally block")
            self.log_scroll.mount(Static("[yellow]Agent cycle finished.[/]"))
            self.log_scroll.scroll_end()
            
            # Unlock UI components directly (we are on main thread)
            self.reset_ui_state()
            
    def reset_ui_state(self) -> None:
        """Reset UI state after agent loop finishes."""
        try:
            ui_logger.log("[TUI] Resetting UI state...")
            # Unlock UI components
            self.query_one("#main-layout").remove_class("processing")
            self.query_one("#workspace-list").disabled = False
            self.query_one("#add-ws-btn").disabled = False
            
            # Restore input
            self.restore_input()
            ui_logger.log("[TUI] UI state reset successfully")
        except Exception as e:
            ui_logger.log(f"[TUI] Error resetting UI state: {e}", level="ERROR")
            import traceback
            ui_logger.log(traceback.format_exc(), level="ERROR")

    def restore_input(self) -> None:
        """Restore input field state."""
        self.input.disabled = False
        try:
            cwd_name = os.path.basename(os.getcwd())
        except:
            cwd_name = "Workspace"
        self.input.placeholder = f"Chatting in {cwd_name}..."
        self.input.focus()
        self.input.value = "" # Ensure it's empty
        self.input.refresh()

if __name__ == "__main__":
    app = AgentTUI()
    app.run()
