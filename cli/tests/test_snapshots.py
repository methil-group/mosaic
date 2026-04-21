import os
import pytest
from unittest.mock import patch
from mosaic_cli.main import Mosaic

class MockLLM:
    def __init__(self, *args, **kwargs):
        pass
    async def stream_chat(self, model, messages):
        yield {"type": "token", "data": "Snapshot test response"}
    async def fetch_models(self):
        return ["mock-v1"]
    async def get_embedding(self, text: str):
        return [0.1] * 1536

@pytest.fixture
def workspace_setup(temp_workspace):
    # Setup a clean workspace
    os.makedirs(os.path.join(temp_workspace, "src"), exist_ok=True)
    with open(os.path.join(temp_workspace, "test.py"), "w") as f:
        f.write("print('hello')")
    return temp_workspace

def test_main_layout_snapshot(workspace_setup, snap_compare):
    """Capture the default main layout with sidebar closed."""
    with patch("mosaic_cli.main.OpenRouter", MockLLM), \
         patch("mosaic_cli.main.OpenAiProvider", MockLLM):
        
        app = Mosaic(workspace=workspace_setup)
        assert snap_compare(app)

def test_settings_pane_snapshot(workspace_setup, snap_compare):
    """Capture the settings pane overlay."""
    with patch("mosaic_cli.main.OpenRouter", MockLLM), \
         patch("mosaic_cli.main.OpenAiProvider", MockLLM):
        
        app = Mosaic(workspace=workspace_setup)
        assert snap_compare(app, press=["ctrl+s"])

def test_all_sidebars_snapshot(workspace_setup, snap_compare):
    """Capture the layout with file tree and history sidebar open."""
    with patch("mosaic_cli.main.OpenRouter", MockLLM), \
         patch("mosaic_cli.main.OpenAiProvider", MockLLM):
        
        app = Mosaic(workspace=workspace_setup)
        # We can use multiple presses to set state
        assert snap_compare(app, press=["ctrl+h", "ctrl+f"])

def test_chat_message_snapshot(workspace_setup, snap_compare):
    """Capture how chat messages are rendered."""
    with patch("mosaic_cli.main.OpenRouter", MockLLM), \
         patch("mosaic_cli.main.OpenAiProvider", MockLLM):
        
        app = Mosaic(workspace=workspace_setup)
        assert snap_compare(app)
