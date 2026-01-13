"""Run command tool implementation."""

import subprocess
import shlex
from pathlib import Path

from src.framework.abstract_tool import AbstractTool, ToolResult


class RunCommandTool(AbstractTool):
    """Tool to execute shell commands."""
    
    def __init__(self, working_directory: Path | None = None, timeout: int = 30):
        self._working_directory = working_directory or Path.cwd()
        self._timeout = timeout
    
    @property
    def name(self) -> str:
        return "run_command"
    
    @property
    def description(self) -> str:
        return "Execute a shell command and return its output."
    
    @property
    def parameters(self) -> dict:
        return {
            "type": "object",
            "properties": {
                "command": {
                    "type": "string",
                    "description": "The shell command to execute"
                },
                "cwd": {
                    "type": "string",
                    "description": "Optional working directory for the command"
                }
            },
            "required": ["command"]
        }
    
    def execute(self, command: str, cwd: str | None = None, **kwargs) -> ToolResult:
        try:
            working_dir = Path(cwd).resolve() if cwd else self._working_directory
            
            if not working_dir.exists():
                return ToolResult(
                    success=False,
                    output="",
                    error=f"Working directory does not exist: {working_dir}"
                )
            
            # Execute the command
            result = subprocess.run(
                command,
                shell=True,
                cwd=str(working_dir),
                capture_output=True,
                text=True,
                timeout=self._timeout
            )
            
            output = result.stdout
            if result.stderr:
                output += f"\n[stderr]\n{result.stderr}"
            
            return ToolResult(
                success=result.returncode == 0,
                output=output.strip() if output else "(no output)",
                error=None if result.returncode == 0 else f"Command exited with code {result.returncode}"
            )
        except subprocess.TimeoutExpired:
            return ToolResult(
                success=False,
                output="",
                error=f"Command timed out after {self._timeout} seconds"
            )
        except Exception as e:
            return ToolResult(
                success=False,
                output="",
                error=f"Error executing command: {str(e)}"
            )
