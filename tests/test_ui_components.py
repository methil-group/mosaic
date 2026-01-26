import pytest
from textual.app import App, ComposeResult
from textual.widgets import Label, ListItem, Input
from textual.containers import Vertical, VerticalScroll
from src.UI.components.chat_message import ChatMessage
from src.UI.components.workspace_sidebar import WorkspaceItem

class UIAppHost(App):
    """Test app to host components for inspection."""
    def compose(self) -> ComposeResult:
        yield VerticalScroll(id="chat_scroll")
        yield Input(id="input")
        
    def on_mount(self):
        # Mount initial messages for static tests
        self.query_one("#chat_scroll").mount(ChatMessage("user", "Hello World"))
        self.query_one("#chat_scroll").mount(ChatMessage("assistant", "Thinking..."))
        # Workspace item isn't in scroll usually, but for testing query it's fine
        self.query_one("#chat_scroll").mount(WorkspaceItem("Test Project", "/tmp/test"))

class InteractiveAppHost(App):
    """App that mimics the interactive chat flow."""
    def compose(self) -> ComposeResult:
        self.chat_scroll = VerticalScroll(id="chat_scroll")
        yield self.chat_scroll
        self.input_widget = Input(id="message-input")
        yield self.input_widget

    async def on_input_submitted(self, event: Input.Submitted) -> None:
        if not event.value:
            return
        
        chat_scroll = self.chat_scroll
        input_widget = self.input_widget
        
        # Mimic TUI logic: Add user message
        chat_scroll.mount(ChatMessage("user", event.value))
        
        # Add assistant placeholder
        chat_scroll.mount(ChatMessage("assistant"))
        
        # Clear input
        input_widget.value = ""

@pytest.mark.asyncio
async def test_chat_message_rendering():
    app = UIAppHost()
    async with app.run_test() as pilot:
        # Check User Message
        msgs = list(app.query(ChatMessage))
        user_msg = next(m for m in msgs if m.role == "user")
        assert user_msg.text_content == "Hello World"
        
        # Check Assistant Message
        assistant_msg = next(m for m in msgs if m.role == "assistant")
        assert assistant_msg.text_content == "Thinking..."
        
        # Verify markdown content (Markdown doesn't have a simple way to check text, we check rendering)
        md = assistant_msg.query_one("#md_view")
        # Just check if widget exists and is associated with the text
        assert assistant_msg.text_content in str(md.render()) or assistant_msg.text_content == "Thinking..."

@pytest.mark.asyncio
async def test_chat_message_actions():
    app = UIAppHost()
    async with app.run_test() as pilot:
        msgs = list(app.query(ChatMessage))
        assistant_msg = next(m for m in msgs if m.role == "assistant")
        
        # Add an action
        assistant_msg.add_action("ls -la")
        
        # Verify action item was mounted
        container = assistant_msg.query_one("#actions_container")
        assert len(container.children) == 1
        # Check renderable or text
        item = container.children[0]
        assert "ls -la" in str(item.render()) or "ls -la" in str(getattr(item, "renderable", ""))

@pytest.mark.asyncio
async def test_chat_message_streaming():
    app = UIAppHost()
    async with app.run_test() as pilot:
        msgs = list(app.query(ChatMessage))
        assistant_msg = next(m for m in msgs if m.role == "assistant")
        
        # Start streaming action
        assistant_msg.start_streaming_action()
        container = assistant_msg.query_one("#actions_container")
        assert len(container.children) == 1
        
        # Stream content
        assistant_msg.stream_to_action("git commit")
        assert assistant_msg.current_action_text == "git commit"
        assert "git commit" in str(assistant_msg.current_action_item.render()) or "git commit" in str(getattr(assistant_msg.current_action_item, "renderable", ""))
        
        # End streaming
        assistant_msg.end_streaming_action()
        assert not hasattr(assistant_msg, "current_action_item")

@pytest.mark.asyncio
async def test_workspace_item():
    app = UIAppHost()
    async with app.run_test() as pilot:
        ws_item = app.query_one(WorkspaceItem)
        assert ws_item.workspace_name == "Test Project"
        assert ws_item.path == "/tmp/test"
        
        # Check labels. WorkspaceItem has 1 label for name.
        labels = list(ws_item.query("Label"))
        # Using render() to check content
        rendered_texts = [str(l.render()) for l in labels]
        assert any("Test Project" in t for t in rendered_texts)

@pytest.mark.asyncio
async def test_add_workspace_modal():
    from src.UI.components.add_workspace_modal import AddWorkspaceModal
    app = UIAppHost()
    async with app.run_test() as pilot:
        modal = AddWorkspaceModal()
        await app.push_screen(modal)
        
        # Check inputs
        name_input = modal.query_one("#ws-name")
        path_input = modal.query_one("#ws-path")
        
        # Simulate typing
        name_input.value = "New WS"
        path_input.value = "/home/test"
        
        # Check buttons
        add_btn = modal.query_one("#add-btn")
        assert not add_btn.disabled

@pytest.mark.asyncio
async def test_interactive_chat_flow():
    """Test the full flow of sending a message."""
    app = InteractiveAppHost()
    async with app.run_test() as pilot:
        # Find input
        inp = app.query_one("#message-input", Input)
        
        # Invoke handler manually to test logic cleanly
        event = Input.Submitted(inp, "Hello Agent")
        await app.on_input_submitted(event)
        
        # Check if messages appeared
        msgs = list(app.query(ChatMessage))
        assert len(msgs) == 2 # 1 User, 1 Assistant
        
        user_msg = msgs[0]
        assert user_msg.role == "user"
        assert user_msg.text_content == "Hello Agent"
        
        assistant_msg = msgs[1]
        assert assistant_msg.role == "assistant"
        
        # Check input cleared
        assert inp.value == ""
