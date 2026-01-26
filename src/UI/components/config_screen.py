from textual.app import ComposeResult
from textual.screen import ModalScreen
from textual.widgets import Label, Button, Static
from textual.containers import Vertical, Center

class ConfigScreen(ModalScreen):
    """A screen to display the current LLM configuration."""

    def compose(self) -> ComposeResult:
        # Get LLM info from the app's agent
        llm = self.app.agent.llm
        model_id = llm.model_id
        llm_type = llm.__class__.__name__

        with Center():
            with Vertical(id="config-modal"):
                yield Label("CONFIGURATION", id="config-title")
                yield Static(f"Active LLM: [bold green]{model_id}[/]", classes="config-info")
                yield Static(f"Driver: [bold blue]{llm_type}[/]", classes="config-info")
                yield Label("Press ESC or click below to close", id="config-footer")
                yield Button("Close", variant="primary", id="close-btn")

    def on_button_pressed(self, event: Button.Pressed) -> None:
        if event.button.id == "close-btn":
            self.app.pop_screen()
