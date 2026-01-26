from textual.app import ComposeResult
from textual.screen import ModalScreen
from textual.widgets import Label, Button, Static, Input, Select
from textual.containers import Vertical, Center

from src.Core.LLM.Registry.llm_registry import LLMRegistry

class ConfigScreen(ModalScreen):
    """A screen to configure LLM provider and model."""

    def compose(self) -> ComposeResult:
        # Get current LLM info
        llm = self.app.agent.llm
        model_id = llm.model_id
        
        # Identify current provider from the LLM class
        current_provider = None
        for display_name, provider_id in LLMRegistry.get_providers():
            if isinstance(llm, LLMRegistry.get_class(provider_id)):
                current_provider = provider_id
                break

        # Get initial model options
        model_options = LLMRegistry.get_models(current_provider) if current_provider else []
        
        # Get current base url if available
        current_base_url = getattr(llm, "base_url", "http://localhost:1234/v1")

        with Center():
            with Vertical(id="config-modal"):
                yield Label("CONFIGURATION", id="config-title")
                
                yield Label("Provider:")
                yield Select(
                    options=LLMRegistry.get_providers(),
                    value=current_provider,
                    id="provider-select"
                )
                
                yield Label("Model Selection:")
                yield Select(
                    options=model_options,
                    value=model_id if any(m[1] == model_id for m in model_options) else Select.BLANK,
                    id="model-select"
                )

                yield Label("Custom Model ID (Optional):")
                yield Input(value=model_id, placeholder="e.g. meta-llama/llama-3-8b", id="model-id-input")
                
                yield Label("Base URL (LM Studio / External):")
                yield Input(value=current_base_url, placeholder="http://localhost:1234/v1", id="base-url-input")

                yield Label("Press ESC to cancel", id="config-footer")
                
                with Vertical(id="config-buttons"):
                    yield Button("Save & Apply", variant="success", id="save-btn")
                    yield Button("Cancel", variant="error", id="close-btn")

    def on_select_changed(self, event: Select.Changed) -> None:
        """Update model options when provider changes."""
        if event.select.id == "provider-select":
            model_select = self.query_one("#model-select", Select)
            new_options = LLMRegistry.get_models(str(event.value))
            model_select.set_options(new_options)

    def on_button_pressed(self, event: Button.Pressed) -> None:
        if event.button.id == "close-btn":
            self.dismiss(None)
        elif event.button.id == "save-btn":
            provider = self.query_one("#provider-select", Select).value
            model_select_val = self.query_one("#model-select", Select).value
            model_input_val = self.query_one("#model-id-input", Input).value
            base_url = self.query_one("#base-url-input", Input).value
            
            # Prefer dropdown selection if it's not blank, otherwise use input
            model_id = model_select_val if (model_select_val is not Select.BLANK and model_select_val is not None) else model_input_val
            
            if provider and model_id:
                self.dismiss({
                    "provider": provider,
                    "model_id": str(model_id).strip(),
                    "base_url": base_url.strip() if base_url else None
                })
