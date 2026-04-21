import pytest
from textual.widgets import Select, Input
from mosaic_cli.main import Mosaic
from unittest.mock import MagicMock, AsyncMock

class MockLlm:
    def __init__(self, *args, **kwargs):
        self.fetch_models = AsyncMock(return_value=["model-1", "model-2"])

@pytest.mark.asyncio
async def test_lmstudio_model_refresh():
    app = Mosaic()
    # Mock the session to avoid file operations, but provide real paths for sidebars
    app.session = MagicMock()
    app.session.generate_session_id.return_value = "test-session"
    app.session.load_chat.return_value = []
    app.session.chats_dir = "/tmp" 
    
    async with app.run_test() as pilot:
        # Mocking sidebars to avoid file operations
        app.query_one("#history-sidebar").refresh_history = MagicMock()
        app.query_one("#memory-sidebar").refresh_memories = MagicMock()
        
        # 1. Open settings
        await pilot.press("ctrl+s")
        
        # 2. Select LM Studio
        provider_select = app.query_one("#provider-select", Select)
        
        # Mock the LLM initialization to use our mock with fetch_models
        mock_llm = MockLlm()
        app._init_llm = MagicMock()
        app.llm = mock_llm
        
        # Trigger provider change
        provider_select.value = "lmstudio"
        
        # Wait for the @work task to complete
        await pilot.pause()
        
        # 3. Check if model-select has new options
        model_select = app.query_one("#model-select", Select)
        # Expected label is 'model-1' since it's the basename of 'model-1' (in our mock)
        assert ("model-1", "model-1") in model_select._options
        assert ("model-2", "model-2") in model_select._options
        assert ("Custom...", "custom") in model_select._options

@pytest.mark.asyncio
async def test_lmstudio_url_change_refresh():
    app = Mosaic()
    app.session = MagicMock()
    app.session.generate_session_id.return_value = "test-session"
    app.session.chats_dir = "/tmp"
    
    async with app.run_test() as pilot:
        # Mocking sidebars to avoid file operations
        app.query_one("#history-sidebar").refresh_history = MagicMock()
        app.query_one("#memory-sidebar").refresh_memories = MagicMock()
        
        await pilot.press("ctrl+s")
        
        # Set provider to lmstudio
        app.provider_type = "lmstudio"
        mock_llm = MockLlm()
        mock_llm.fetch_models = AsyncMock(return_value=["new-model"])
        app.llm = mock_llm
        
        # Change URL
        url_input = app.query_one("#lmstudio-url-input", Input)
        await pilot.click("#lmstudio-url-input")
        await pilot.press("a", "p", "i", "/", "v", "2") # Typing something
        
        # Wait for debounce (1s) + execution
        await pilot.pause(1.5)
        
        model_select = app.query_one("#model-select", Select)
        assert ("new-model", "new-model") in model_select._options
