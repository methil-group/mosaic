from typing import List
from .base import Tool
from .read_file import ReadFileTool
from .write_file import WriteFileTool
from .edit_file import EditFileTool
from .list_directory import ListDirectoryTool
from .run_command import RunCommandTool
from .create_todo import CreateTodoTool
from .update_todo import UpdateTodoTool
from .sync_todo_list import SyncTodoListTool
from .store_memory import StoreMemoryTool
from .recall_memories import RecallMemoriesTool

class ToolRegistry:
    """Manages the collection of available tools."""
    
    @staticmethod
    def get_default_tools(memory_manager=None) -> List[Tool]:
        """Returns a list of all standard tools."""
        return [
            ReadFileTool(),
            WriteFileTool(),
            EditFileTool(),
            ListDirectoryTool(),
            RunCommandTool(),
            CreateTodoTool(),
            UpdateTodoTool(),
            SyncTodoListTool(),
            StoreMemoryTool(memory_manager),
            RecallMemoriesTool(memory_manager)
        ]
