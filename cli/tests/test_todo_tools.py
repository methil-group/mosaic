import pytest
import json
from mosaic_cli.core.tools.create_todo import CreateTodoTool
from mosaic_cli.core.tools.update_todo import UpdateTodoTool
from mosaic_cli.core.tools.sync_todo_list import SyncTodoListTool

@pytest.mark.asyncio
async def test_create_todo_tool():
    tool = CreateTodoTool()
    res = await tool.execute({"title": "Test Task", "description": "Do something"}, ".")
    data = json.loads(res)
    assert data["status"] == "success"
    assert data["todo"]["title"] == "Test Task"
    assert data["todo"]["description"] == "Do something"

@pytest.mark.asyncio
async def test_create_todo_missing_params():
    tool = CreateTodoTool()
    res = await tool.execute({}, ".")
    assert "Error" in res

@pytest.mark.asyncio
async def test_update_todo_tool():
    tool = UpdateTodoTool()
    res = await tool.execute({"id": "1", "completed": True}, ".")
    data = json.loads(res)
    assert data["status"] == "success"
    assert data["todo"]["id"] == "1"
    assert data["todo"]["completed"] is True

@pytest.mark.asyncio
async def test_sync_todo_list_tool_basic():
    tool = SyncTodoListTool()
    data_xml = "<data><todo id='1' completed='true'>Task 1</todo><todo id='2' completed='false'>Task 2</todo></data>"
    res = await tool.execute({"data": data_xml}, ".")
    data = json.loads(res)
    assert data["status"] == "success"
    assert len(data["todos"]) == 2
    assert data["todos"][0]["title"] == "Task 1"
    assert data["todos"][0]["completed"] is True
    assert data["todos"][1]["title"] == "Task 2"
    assert data["todos"][1]["completed"] is False

@pytest.mark.asyncio
async def test_sync_todo_list_with_descriptions():
    tool = SyncTodoListTool()
    # Note: the current implementation uses regex: <todo\s+(.*?)>(.*?)</todo>
    data_xml = "<todo id='1' description='Details'>Title</todo>"
    res = await tool.execute({"data": data_xml}, ".")
    data = json.loads(res)
    assert data["todos"][0]["title"] == "Title"
    assert data["todos"][0]["description"] == "Details"

@pytest.mark.asyncio
async def test_sync_todo_list_malformed():
    tool = SyncTodoListTool()
    res = await tool.execute({"data": "no todos here"}, ".")
    assert "Error" in res

@pytest.mark.asyncio
async def test_sync_todo_list_complex_content():
    tool = SyncTodoListTool()
    # Test with double quotes, special chars, and newlines
    data_xml = """<data>
    <todo id="1" completed="false">Task with "Quotes"</todo>
    <todo id='2' completed='true' description='Multi\nline'>Another Task</todo>
    </data>"""
    res = await tool.execute({"data": data_xml}, ".")
    data = json.loads(res)
    assert len(data["todos"]) == 2
    assert data["todos"][0]["title"] == 'Task with "Quotes"'
    assert data["todos"][1]["description"] == 'Multi\nline'
