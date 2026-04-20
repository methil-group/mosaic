import os
import pytest
import asyncio
from mosaic_cli.core.tools.write_file import WriteFileTool
from mosaic_cli.core.tools.edit_file import EditFileTool
from mosaic_cli.core.tools.run_command import RunCommandTool

@pytest.fixture
def temp_workspace(tmp_path):
    workspace = tmp_path / "project"
    workspace.mkdir()
    return str(workspace)

@pytest.mark.asyncio
async def test_protection_write_file(temp_workspace):
    tool = WriteFileTool()
    # Try to write to a hidden file
    res = await tool.execute({"path": ".env", "content": "SECRET=123"}, temp_workspace)
    assert "Access denied" in res
    assert not os.path.exists(os.path.join(temp_workspace, ".env"))

@pytest.mark.asyncio
async def test_protection_edit_file(temp_workspace):
    # Setup - normally we can't create it with the tool, so we create it manually
    hidden_file = os.path.join(temp_workspace, ".gitignore")
    with open(hidden_file, "w") as f:
        f.write("node_modules")
    
    tool = EditFileTool()
    res = await tool.execute({"path": ".gitignore", "old_content": "node_modules", "new_content": "dist"}, temp_workspace)
    assert "Access denied" in res
    
    with open(hidden_file, "r") as f:
        assert f.read() == "node_modules"

@pytest.mark.asyncio
async def test_protection_run_command(temp_workspace):
    tool = RunCommandTool()
    
    # Try to delete a dotfile
    res = await tool.execute({"command": "rm .gitignore"}, temp_workspace)
    assert "Command denied" in res
    
    # Try to redirect to a dotfile
    res = await tool.execute({"command": "echo 'test' > .env"}, temp_workspace)
    assert "Command denied" in res
    
    # Try to move .mosaic
    res = await tool.execute({"command": "mv .mosaic backup"}, temp_workspace)
    assert "Command denied" in res
    
    # Normal command should work (ls .)
    res = await tool.execute({"command": "ls ."}, temp_workspace)
    assert "Error" not in res
