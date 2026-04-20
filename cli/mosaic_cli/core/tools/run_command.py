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
        
        # Heuristic check for destructive commands on hidden files/directories
        # Matches keywords like rm, mv, or redirection > accompanied by a dot-file pattern
        destructive_op = re.search(r"\b(rm|mv|cp|tar|zip|sed|awk)\b|>", command)
        hidden_target = re.search(r"(^|\s|/)\.[a-zA-Z0-9_-]+", command)
        
        if destructive_op and hidden_target:
            # Check if it's just the current directory '.' or '..'
            if not all(p.strip() in [".", "..", "./", "../"] for p in re.findall(r"(^|\s|/)\.[a-zA-Z0-9_-]*", command)):
                return f"Error: Command denied. Operations targeting hidden files or directories (starting with '.') are restricted for safety."
        
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
