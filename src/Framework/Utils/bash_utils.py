import subprocess
from typing import Dict, Any

class BashUtils:
    @staticmethod
    def run_bash(command: str) -> str:
        """
        Executes a bash command and returns its output or error.
        """
        try:
            result = subprocess.run(
                command,
                shell=True,
                capture_output=True,
                text=True,
                check=False
            )
            output = result.stdout
            if result.stderr:
                output += f"\nError: {result.stderr}"
            return output.strip() if output else "Command executed successfully (no output)."
        except Exception as e:
            return f"Exception occurred: {str(e)}"
