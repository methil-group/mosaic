import subprocess
import os
from .base import Tool
from typing import Dict, Any

class RunCommandTool(Tool):
    def name(self) -> str:
        return "run_command"

    def description(self) -> str:
        return "Execute a shell command in the workspace."

    async def execute(self, params: Dict[str, Any], workspace: str) -> str:
        command = params.get("command", "")
        if not command:
            return "Error: Missing command parameter"
        
        try:
            # Using shell=True can be dangerous, but it's often needed for complex commands
            result = subprocess.run(
                command,
                shell=True,
                cwd=workspace,
                capture_output=True,
                text=True,
                timeout=300
            )
            
            output = result.stdout
            if result.stderr:
                output += f"\n--- Error Output ---\n{result.stderr}"
            
            if result.returncode != 0:
                output += f"\n--- Return Code: {result.returncode} ---"
                
            return output if output.strip() else "(command completed with no output)"
        except subprocess.TimeoutExpired:
            return "Error: Command timed out after 5 minutes"
        except Exception as e:
            return f"Error: {str(e)}"
