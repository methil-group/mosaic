import subprocess
import shlex
from src.framework.abstract_tool import AbstractTool, ToolResult

class RunCommandTool(AbstractTool):
    @property
    def name(self) -> str:
        return "run_command"
    
    @property
    def description(self) -> str:
        return "Run a shell command"
    
    @property
    def parameters(self) -> dict:
        return {
            "type": "object",
            "properties": {
                "command": {
                    "type": "string",
                    "description": "Command to run"
                },
                "cwd": {
                    "type": "string",
                    "description": "Working directory"
                }
            },
            "required": ["command"]
        }
    
    def execute(self, command: str, cwd: str = None, **kwargs) -> ToolResult:
        try:
            # Using shell=True for simple command execution as expected by tests (e.g. "echo Hello")
            # In a real secure environment we might want to avoid shell=True or parse args
            result = subprocess.run(
                command,
                shell=True,
                cwd=cwd,
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0:
                return ToolResult(success=True, output=result.stdout)
            else:
                return ToolResult(success=False, output=result.stdout, error=result.stderr or "Command failed")
        except Exception as e:
            return ToolResult(success=False, output="", error=str(e))
