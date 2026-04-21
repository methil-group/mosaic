import os
import pytest
from unittest.mock import patch, MagicMock
from mosaic_cli.main import Mosaic
from textual.widgets import Input, Button
from mosaic_cli.core.components.file_tree import FilteredDirectoryTree, FileTreeSidebar

class MockLLM:
    def __init__(self, *args, **kwargs):
        pass
    async def stream_chat(self, *args, **kwargs):
        yield {"type": "token", "data": "test"}

@pytest.mark.asyncio
async def test_ux_double_click_insertion(temp_workspace):
    # Create a dummy file to see in the tree
    dummy_file = os.path.join(temp_workspace, "test_file.py")
    with open(dummy_file, "w") as f:
        f.write("print('hello')")

    with patch("mosaic_cli.main.OpenRouter", MockLLM):
        app = Mosaic(workspace=temp_workspace)
        async with app.run_test() as pilot:
            # 1. Open file tree
            await pilot.press("ctrl+f")
            tree = app.query_one(FilteredDirectoryTree)
            
            # Wait for tree to load
            await pilot.pause()
            
            # Find the node for test_file.py
            # DirectoryTree nodes are identifiable by their data (Path objects)
            node = None
            for leaf in tree.root.children:
                if str(leaf.data.path).endswith("test_file.py"):
                    node = leaf
                    break
            
            assert node is not None, "test_file.py node not found in tree"
            
            # Simulate the selection event from the sidebar
            sidebar = app.query_one(FileTreeSidebar)
            sidebar.post_message(FileTreeSidebar.FileSelected(path=dummy_file))
            
            await pilot.pause()
            
            # Verify input value
            user_input = app.query_one("#user-input", Input)
            assert "@test_file.py" in user_input.value

            await pilot.press("ctrl+q")

@pytest.mark.asyncio
async def test_ux_mutual_exclusion(temp_workspace):
    with patch("mosaic_cli.main.OpenRouter", MockLLM):
        app = Mosaic(workspace=temp_workspace)
        async with app.run_test() as pilot:
            # 1. Open Settings
            await pilot.press("ctrl+s")
            settings = app.query_one("#settings-pane")
            file_tree = app.query_one("#file-tree-sidebar")
            
            assert settings.display is True
            # Mutual exclusion: opening settings should hide file tree
            assert file_tree.display is False
            
            # 2. Open File Tree
            # This should hide settings
            await pilot.press("ctrl+f")
            assert file_tree.display is True
            assert settings.display is False
            
            # 3. Open History
            # This should also hide settings if implemented
            await pilot.press("ctrl+s")
            assert settings.display is True
            await pilot.press("ctrl+h")
            assert app.query_one("#history-sidebar").display is True
            assert settings.display is False

            await pilot.press("ctrl+q")

@pytest.mark.asyncio
async def test_ux_close_buttons(temp_workspace):
    with patch("mosaic_cli.main.OpenRouter", MockLLM):
        app = Mosaic(workspace=temp_workspace)
        async with app.run_test() as pilot:
            # 1. Test Settings Close Button
            await pilot.press("ctrl+s")
            settings = app.query_one("#settings-pane")
            assert settings.display is True
            
            close_btn = app.query_one("#close-settings-btn", Button)
            await pilot.click(close_btn)
            assert settings.display is False
            
            # 2. Test File Tree Close Button
            await pilot.press("ctrl+f")
            tree_sidebar = app.query_one("#file-tree-sidebar")
            assert tree_sidebar.display is True
            
            tree_close = app.query_one("#close-file-tree-btn", Button)
            await pilot.click(tree_close)
            assert tree_sidebar.display is False

            await pilot.press("ctrl+q")
