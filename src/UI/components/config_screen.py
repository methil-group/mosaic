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
        
        # Determine if we have a known model or custom
        is_known_model = any(m[1] == model_id for m in model_options)
        dropdown_value = model_id if is_known_model else "custom"
        
        # Get current base url if available
        current_base_url = getattr(llm, "base_url", "http://localhost:1234/v1")

        
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
                value=dropdown_value,
                id="model-select"
            )

            # Custom Model ID - hidden by default unless custom is selected
            custom_classes = "" if dropdown_value == "custom" else "hidden"
            yield Label("Custom Model ID:", id="lbl-custom-id", classes=custom_classes)
            yield Input(value=model_id, placeholder="e.g. meta-llama/llama-3-8b", id="model-id-input", classes=custom_classes)
            
            # Base URL - hidden by default unless needed (like lmstudio)
            base_url_classes = "" if current_provider == "lmstudio" else "hidden"
            yield Label("Base URL (LM Studio):", id="lbl-base-url", classes=base_url_classes)
            yield Input(value=current_base_url, placeholder="http://localhost:1234/v1", id="base-url-input", classes=base_url_classes)

            yield Label("Press ESC to cancel", id="config-footer")
            
            with Vertical(id="config-buttons"):
                yield Button("Save & Apply", variant="success", id="save-btn")
                yield Button("Cancel", variant="error", id="close-btn")

    def on_select_changed(self, event: Select.Changed) -> None:
        """Update options and visibility when selections change."""
        
        if event.select.id == "provider-select":
            provider = event.value
            model_select = self.query_one("#model-select", Select)
            
            # Update model options
            new_options = LLMRegistry.get_models(str(provider))
            model_select.set_options(new_options)
            model_select.value = Select.BLANK

            # Toggle Base URL visibility
            is_lmstudio = (provider == "lmstudio")
            self.query_one("#lbl-base-url").set_class(not is_lmstudio, "hidden")
            self.query_one("#base-url-input").set_class(not is_lmstudio, "hidden")

        elif event.select.id == "model-select":
            # Toggle Custom Model ID visibility
            is_custom = (event.value == "custom")
            self.query_one("#lbl-custom-id").set_class(not is_custom, "hidden")
            self.query_one("#model-id-input").set_class(not is_custom, "hidden")

    def on_button_pressed(self, event: Button.Pressed) -> None:
        if event.button.id == "close-btn":
            self.dismiss(None)
        elif event.button.id == "save-btn":
            provider = self.query_one("#provider-select", Select).value
            model_select_val = self.query_one("#model-select", Select).value
            model_input_val = self.query_one("#model-id-input", Input).value
            base_url = self.query_one("#base-url-input", Input).value
            
            # Prefer dropdown selection if it's not blank, otherwise use input
            # Determine the final model ID
            if model_select_val == "custom":
                model_id = model_input_val
            elif model_select_val is not Select.BLANK and model_select_val is not None:
                model_id = model_select_val
            else:
                model_id = model_input_val
            
            if provider and model_id:
                self.dismiss({
                    "provider": provider,
                    "model_id": str(model_id).strip(),
                    "base_url": base_url.strip() if base_url else None
                })
