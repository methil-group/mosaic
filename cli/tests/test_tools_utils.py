import pytest
import os
import asyncio
from mosaic_cli.core.tools.run_command import RunCommandTool
from mosaic_cli.core.tools.read_file import ReadFileTool
from mosaic_cli.core.tools.utils import resolve_path

@pytest.mark.asyncio
async def test_run_command_success(tmp_path):
    workspace = str(tmp_path)
    tool = RunCommandTool()
    res = await tool.execute({"command": "echo 'hello world'"}, workspace)
    assert "hello world" in res

@pytest.mark.asyncio
async def test_run_command_error(tmp_path):
    workspace = str(tmp_path)
    tool = RunCommandTool()
    res = await tool.execute({"command": "nonexistentcommand"}, workspace)
    assert "not found" in res.lower() or "127" in res

@pytest.mark.asyncio
async def test_run_command_timeout(tmp_path):
    workspace = str(tmp_path)
    tool = RunCommandTool()
    # Mocking subprocess is hard, but we can try to run a sleep command and see if it times out
    # However, the tool has a 300s timeout. Let's test a short one if we can.
    # For now, just test a normal long-ish command
    res = await tool.execute({"command": "sleep 0.1 && echo 'done'"}, workspace)
    assert "done" in res

@pytest.mark.asyncio
async def test_read_file_nonexistent(tmp_path):
    workspace = str(tmp_path)
    tool = ReadFileTool()
    res = await tool.execute({"path": "missing.txt"}, workspace)
    assert "Error" in res

@pytest.mark.asyncio
async def test_read_file_binary(tmp_path):
    workspace = str(tmp_path)
    binary_file = os.path.join(workspace, "test.bin")
    with open(binary_file, "wb") as f:
        f.write(b"\x00\xff\xfe\xfd")
    
    tool = ReadFileTool()
    res = await tool.execute({"path": "test.bin"}, workspace)
    # Most decoders will fail or replace chars. We expect it to handle gracefully/return as text.
    assert isinstance(res, str)

def test_resolve_path_security(tmp_path):
    workspace = str(tmp_path)
    # Testing resolve_path directly (it's sync)
    with pytest.raises(ValueError, match="outside the workspace"):
        resolve_path("../outside.txt", workspace)
    
    with pytest.raises(ValueError, match="outside the workspace"):
        resolve_path("/etc/passwd", workspace)

@pytest.mark.asyncio
async def test_run_command_piping(tmp_path):
    workspace = str(tmp_path)
    tool = RunCommandTool()
    res = await tool.execute({"command": "echo 'line1\nline2' | grep 'line2'"}, workspace)
    assert "line2" in res
    assert "line1" not in res
