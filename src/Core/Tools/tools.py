from src.Framework.Tools.tool import Tool
from src.Framework.Utils.bash_utils import BashUtils
from src.Framework.Utils.file_utils import FileUtils

TOOLS = [
    Tool(
        name="run_bash",
        function=BashUtils.run_bash,
        description="Run a shell command. Use for: ls, find, grep, git, npm, python, etc.",
        parameters={
            "type": "object",
            "properties": {
                "command": {
                    "type": "string",
                    "description": "The bash command to run."
                }
            },
            "required": ["command"]
        }
    ),
    Tool(
        name="read_file",
        function=FileUtils.read_file,
        description="Read the contents of a file at the given path.",
        parameters={
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "Path to the file to read."
                }
            },
            "required": ["path"]
        }
    ),
    Tool(
        name="write_file",
        function=FileUtils.write_file,
        description="Write content to a file. Warning: This overwrites existing content.",
        parameters={
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "Path where the file will be written."
                },
                "content": {
                    "type": "string",
                    "description": "The content to write to the file."
                }
            },
            "required": ["path", "content"]
        }
    ),
    Tool(
        name="replace_content",
        function=FileUtils.replace_content,
        description="Replace occurrences of old text with new text in a file.",
        parameters={
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "Path to the file to modify."
                },
                "old_text": {
                    "type": "string",
                    "description": "The text to be replaced."
                },
                "new_text": {
                    "type": "string",
                    "description": "The text to replace with."
                }
            },
            "required": ["path", "old_text", "new_text"]
        }
    )
]
