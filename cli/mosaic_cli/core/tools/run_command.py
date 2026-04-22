import subprocess
from .base import Tool
from typing import Dict, Any

class RunCommandTool(Tool):
    def name(self) -> str:
        return "run_command"

    def description(self) -> str:
        return "Execute a shell command in the workspace."

    async def execute(self, params: Dict[str, Any], workspace: str) -> str:
        import re
        command = params.get("command", "")
        if not command:
            return "Error: Missing command parameter"
        
        # Safety check: Block commands that target protected hidden files
        from .utils import is_protected_path
        
        # Find potential hidden targets in the command
        hidden_targets = re.findall(r"(?:^|\s|/|'|\")(\.[a-zA-Z0-9_-]+)", command)
        for target in hidden_targets:
            # If the target is protected, check if the command is "destructive"
            if is_protected_path(target, workspace):
                destructive_op = re.search(r"\b(rm|mv|cp|tar|zip)\b|>", command)
                if destructive_op:
                    return f"Error: Command denied. Destructive operation targeting protected file/directory '{target}' is restricted."
        
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
