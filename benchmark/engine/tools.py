import os
import subprocess
from abc import ABC, abstractmethod
from typing import Dict, Any

class Tool(ABC):
    @abstractmethod
    def name(self) -> str:
        pass

    @abstractmethod
    def description(self) -> str:
        pass

    @abstractmethod
    async def execute(self, params: Dict[str, Any], workspace: str) -> str:
        pass

class ListDirectoryTool(Tool):
    def name(self) -> str:
        return "list_directory"

    def description(self) -> str:
        return "List files in a directory. Use 'path' parameter."

    async def execute(self, params: Dict[str, Any], workspace: str) -> str:
        path = params.get("path", ".")
        full_path = os.path.join(workspace, path)
        try:
            items = os.listdir(full_path)
            return "\n".join(items)
        except Exception as e:
            return f"Error: {str(e)}"

class ReadFileTool(Tool):
    def name(self) -> str:
        return "read_file"

    def description(self) -> str:
        return "Read the content of a file. Use 'path' parameter."

    async def execute(self, params: Dict[str, Any], workspace: str) -> str:
        path = params.get("path", "")
        full_path = os.path.join(workspace, path)
        try:
            with open(full_path, "r") as f:
                return f.read()
        except Exception as e:
            return f"Error: {str(e)}"

class WriteFileTool(Tool):
    def name(self) -> str:
        return "write_file"

    def description(self) -> str:
        return "Write content to a file. Use 'path' and 'content' parameters."

    async def execute(self, params: Dict[str, Any], workspace: str) -> str:
        path = params.get("path", "")
        content = params.get("content", "")
        full_path = os.path.join(workspace, path)
        try:
            os.makedirs(os.path.dirname(full_path), exist_ok=True)
            with open(full_path, "w") as f:
                f.write(content)
            return f"File written successfully to {path}"
        except Exception as e:
            return f"Error: {str(e)}"

class RunCommandTool(Tool):
    def name(self) -> str:
        return "run_command"

    def description(self) -> str:
        return "Run a shell command. Use 'command' parameter."

    async def execute(self, params: Dict[str, Any], workspace: str) -> str:
        command = params.get("command", "")
        try:
            result = subprocess.run(
                command,
                shell=True,
                cwd=workspace,
                capture_output=True,
                text=True,
                timeout=60
            )
            output = result.stdout
            if result.stderr:
                output += f"\nError Output:\n{result.stderr}"
            return output if output.strip() else "Command executed successfully with no output."
        except Exception as e:
            return f"Error: {str(e)}"
