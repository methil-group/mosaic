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

from src.Framework.Utils.stream_processor import StreamProcessor
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
                    # Start empty or with current dir? 
                    # User said "If I'm not in a workspace...", implying they might not be.
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
        self.log_scroll = self.query_one("#log-scroll")
        self.workspace_list = self.query_one("#workspace-list")
        
        # Add current directory as default
        self.workspace_list.append(WorkspaceItem("Current Project", os.getcwd()))
        
        # Initialize status bar
        self.query_one("#model-indicator", Label).update(f"Model: {self.agent.llm.model_id}")
        self.query_one("#workspace-status", Label).update(f"Workspace: Current Project")

    def action_toggle_verbose(self) -> None:
        self.log_scroll.toggle_class("visible")

    def action_show_config(self) -> None:
        def handle_config(data):
            if data:
                self.update_llm_config(data["provider"], data["model_id"])

        self.push_screen(ConfigScreen(), handle_config)

    def update_llm_config(self, provider: str, model_id: str) -> None:
        """Swap the LLM driver and update the UI."""
        try:
            llm_class = LLMRegistry.get_class(provider)
            if not llm_class:
                raise ValueError(f"Unknown provider: {provider}")
            
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
        loop = asyncio.get_event_loop()
        self.assistant_msg = assistant_msg 
        
        ui_logger.log(f"[TUI] run_agent_loop entry with prompt: {prompt[:50]}...")
        try:
            import time
            stream_processor = StreamProcessor()
            
            import threading
            def log_to_tui(message: str, level: str = "INFO"):
                """Unified callback for all logging from the agent thread."""
                msg_text = str(message).strip()
                
                # Persistent file log
                llm_logger.log(msg_text, level=level) 

                def do_log_update():
                    # Check for end of stream signal
                    if "[MODEL RESPONSE STREAMING END]" in msg_text:
                        if stream_processor.in_block:
                            # Force close the block
                            self.log_scroll.mount(Static("[yellow]Warning: Force closing unclosed action block[/]", classes="tool-log"))
                            stream_processor.in_block = False
                            stream_processor.buffer = "" # Clear buffer
                            assistant_msg.end_streaming_action()
                    
                    # Format sidebar log
                    if "[TOOL RESULT]" in msg_text:
                        style = "tool-result"
                        self.log_scroll.mount(Static(f"\n{msg_text}", classes=style, markup=False))
                    elif "[EXECUTING TOOL]" in msg_text:
                        style = "tool-log"
                        self.log_scroll.mount(Static(msg_text, classes=style, markup=False))
                    else:
                        self.log_scroll.mount(Static(f"[blue]{level}:[/] {msg_text}"))
                    
                    # Add to message actions panel
                    assistant_msg.add_action(msg_text)
                    self.log_scroll.scroll_end()

                if threading.current_thread() is threading.main_thread():
                    do_log_update()
                else:
                    self.call_from_thread(do_log_update)

            # Lock UI components
            main_layout = self.query_one("#main-layout")
            workspace_list = self.query_one("#workspace-list")
            add_btn = self.query_one("#add-ws-btn")
            
            main_layout.add_class("processing")
            workspace_list.disabled = True
            add_btn.disabled = True

            buffer_main = ""
            buffer_action = ""
            last_update = time.time()
            chunk_count = 0

            ui_logger.log("[TUI] Calling agent.run_stream")
            # Start the generator with our TUI logger
            gen = self.agent.run_stream(prompt, log_callback=log_to_tui)
            ui_logger.log("[TUI] Generator obtained. Starting loop.")
            
            while True:
                try:
                    ui_logger.log("[TUI] Awaiting next(gen) in executor")
                    # Iterate through the generator in a way that doesn't block the event loop
                    chunk = await loop.run_in_executor(None, next, gen, None)
                    ui_logger.log(f"[TUI] Received chunk: {repr(chunk)}")
                    if chunk is None:
                        log_to_tui("Stream generator returned None (finished)", level="DEBUG")
                        break
                    
                    chunk_count += 1
                    # HEARTBEAT
                    if chunk_count % 10 == 0:
                        # log_to_tui(f"[DEBUG] Received {chunk_count} chunks...")
                        pass
                    
                    ui_logger.log(f"[TUI] Stream Generator yielded chunk")
                    try:
                        events = stream_processor.process(chunk)
                        ui_logger.log(f"[TUI] StreamProcessor returned {len(events)} events")
                        # log_to_tui(f"[DEBUG] Process returned {len(events)} events")
                    except Exception as error:
                        log_to_tui(f"[ERROR] Failed to process chunk: {error}", level="ERROR")
                        break
                    
                    for event_type, content in events:
                        if event_type == 'main':
                            buffer_main += content
                        elif event_type == 'start_block':
                            # log_to_tui(f"[DEBUG] Tag started: {content}")
                            assistant_msg.start_streaming_action(content)
                        elif event_type == 'block_content':
                            llm_logger.log(f"[DEBUG] Action content: {content}")
                            buffer_action += content
                        elif event_type == 'end_block':
                            # log_to_tui(f"[DEBUG] Block ended")
                            # Flush action buffer immediately on block end
                            if buffer_action:
                                assistant_msg.stream_to_action(buffer_action)
                                buffer_action = ""
                            assistant_msg.end_streaming_action()
                    
                    current_time = time.time()
                    
                    # Update UI at most every 50ms (20fps) to prevent lag
                    if current_time - last_update > 0.05:
                        if buffer_main:
                            assistant_msg.text_content += buffer_main
                            assistant_msg.update_text(assistant_msg.text_content)
                            buffer_main = ""
                            self.chat_scroll.scroll_end()
                        
                        if buffer_action:
                            assistant_msg.stream_to_action(buffer_action)
                            buffer_action = ""
                            
                        last_update = current_time
                    
                    # Yield to the event loop
                    await asyncio.sleep(0)
                except StopIteration:
                    break
                except Exception as e:
                    import traceback
                    tb = traceback.format_exc()
                    ui_logger.log(f"[TUI] Error during stream: {str(e)}\n{tb}", level="ERROR")
                    log_to_tui(f"[ERROR] Error during stream: {str(e)}", level="ERROR")
                    break
            
            # Flush remaining buffers
            # First check if processor has leftovers
            if stream_processor.buffer:
                 # Treat leftover as main text
                 buffer_main += stream_processor.buffer
            
            if buffer_main:
                assistant_msg.text_content += buffer_main
                assistant_msg.update_text(assistant_msg.text_content)
                self.chat_scroll.scroll_end()
                
            if buffer_action:
                assistant_msg.stream_to_action(buffer_action)
                
        except Exception as outer_e:
            import traceback
            outer_tb = traceback.format_exc()
            ui_logger.log(f"[TUI] CRITICAL ERROR IN run_agent_loop: {outer_e}\n{outer_tb}", level="ERROR")
            self.call_from_thread(self.log_scroll.mount, Static(f"[red]CRITICAL ERROR: {str(outer_e)}[/]"))
        finally:
            ui_logger.log("[TUI] run_agent_loop finally block")
            self.call_from_thread(self.log_scroll.mount, Static("[yellow]Agent cycle finished.[/]"))
            self.call_from_thread(self.log_scroll.scroll_end)
            
            # Unlock UI components
            main_layout.remove_class("processing")
            workspace_list.disabled = False
            add_btn.disabled = False
            
            # Re-enable input slightly later to ensure UI is ready
            self.call_later(self.restore_input)

    def restore_input(self) -> None:
        """Restore input field state."""
        self.input.disabled = False
        try:
            cwd_name = os.path.basename(os.getcwd())
        except:
            cwd_name = "Workspace"
        self.input.placeholder = f"Chatting in {cwd_name}..."
        self.input.focus()
        self.input.refresh()

if __name__ == "__main__":
    app = AgentTUI()
    app.run()
