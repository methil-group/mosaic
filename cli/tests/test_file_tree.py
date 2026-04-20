import os
import pytest
from mosaic_cli.core.components.file_tree import FileTreeSidebar, FilteredDirectoryTree

@pytest.fixture
def temp_workspace(tmp_path):
    workspace = tmp_path / "project"
    workspace.mkdir()
    # Visible files
    (workspace / "main.py").write_text("print('hello')")
    (workspace / "README.md").write_text("# Test")
    (workspace / "src").mkdir()
    (workspace / "src" / "app.py").write_text("x = 1")
    # Hidden files - should be filtered
    (workspace / ".env").write_text("SECRET=oops")
    (workspace / ".mosaic").mkdir()
    (workspace / ".mosaic" / "config.json").write_text("{}")
    return str(workspace)

@pytest.mark.asyncio
async def test_file_tree_mounts(temp_workspace):
    """Test that FileTreeSidebar mounts correctly."""
    sidebar = FileTreeSidebar(workspace=temp_workspace, id="file-tree-sidebar")
    assert sidebar.workspace == temp_workspace

def test_filter_excludes_hidden_files(temp_workspace):
    """Test that FilteredDirectoryTree excludes hidden paths."""
    from pathlib import Path
    
    tree = FilteredDirectoryTree(temp_workspace)
    all_paths = list(Path(temp_workspace).iterdir())
    
    visible = tree.filter_paths(all_paths)
    visible_names = {p.name for p in visible}
    
    assert "main.py" in visible_names
    assert "README.md" in visible_names
    assert "src" in visible_names
    assert ".env" not in visible_names
    assert ".mosaic" not in visible_names

def test_filter_allows_normal_directories(temp_workspace):
    """Test that normal directories are not filtered out."""
    from pathlib import Path
    
    tree = FilteredDirectoryTree(temp_workspace)
    all_paths = list(Path(temp_workspace).iterdir())
    
    visible = tree.filter_paths(all_paths)
    visible_names = {p.name for p in visible}
    
    assert "src" in visible_names
