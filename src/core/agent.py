"""Agent orchestration logic - following learn-claude-code pattern."""

import json
import os
import re
import subprocess
from pathlib import Path
from rich.console import Console

from src.core.llm import MLXLLM
from src.core.prompts import get_system_prompt

console = Console()

class Agent:
    """The main agent that orchestrates LLM and tools."""
    
    def __init__(self, llm: MLXLLM, working_dir: Path | str = "."):
        self.llm = llm
        self.working_dir = Path(working_dir).resolve()
        self.history = []
        self._init_history()
    
    def _init_history(self):
        """Reset history with current system prompt."""
        self.history = [
            {"role": "system", "content": get_system_prompt(str(self.working_dir))}
        ]

    def _safe_path(self, p: str) -> Path:
        """Ensure path stays within workspace."""
        path = (self.working_dir / p).resolve()
        # Basic security: don't allow escaping the working directory
        if not str(path).startswith(str(self.working_dir)):
            raise ValueError(f"Path escapes workspace: {p}")
        return path

    def execute_tool(self, name: str, args: dict) -> str:
        """Execute a tool and return the output as string."""
        try:
            if name == "bash":
                cmd = args.get("command")
                return self._run_bash(cmd)
            
            elif name == "read_file":
                path = args.get("path")
                return self._run_read(path)
            
            elif name == "write_file":
                path = args.get("path")
                content = args.get("content")
                return self._run_write(path, content)
            
            elif name == "edit_file":
                path = args.get("path")
                old_text = args.get("old_text")
                new_text = args.get("new_text")
                return self._run_edit(path, old_text, new_text)
            
            return f"Error: Unknown tool {name}"
        except Exception as e:
            return f"Error executing {name}: {str(e)}"

    def _run_bash(self, command: str) -> str:
        """Run a shell command."""
        # Simple safety check
        dangerous = ["rm -rf /", "sudo ", "shutdown", "reboot"]
        if any(d in command for d in dangerous):
            return "Error: Dangerous command blocked."
            
        try:
            result = subprocess.run(
                command,
                shell=True,
                cwd=self.working_dir,
                capture_output=True,
                text=True,
                timeout=60
            )
            output = (result.stdout + result.stderr).strip()
            return output if output else "(no output)"
        except subprocess.TimeoutExpired:
            return "Error: Command timed out after 60s."

    def _run_read(self, path: str) -> str:
        """Read a file."""
        try:
            return self._safe_path(path).read_text()
        except Exception as e:
            return f"Error reading {path}: {str(e)}"

    def _run_write(self, path: str, content: str) -> str:
        """Write a file."""
        try:
            fp = self._safe_path(path)
            fp.parent.mkdir(parents=True, exist_ok=True)
            fp.write_text(content)
            return f"Successfully wrote to {path}"
        except Exception as e:
            return f"Error writing to {path}: {str(e)}"

    def _run_edit(self, path: str, old_text: str, new_text: str) -> str:
        """Apply a surgical edit to a file."""
        try:
            fp = self._safe_path(path)
            content = fp.read_text()
            if old_text not in content:
                return f"Error: Could not find exact text in {path} to replace."
            
            # Replace only first occurrence for safety
            new_content = content.replace(old_text, new_text, 1)
            fp.write_text(new_content)
            return f"Successfully edited {path}"
        except Exception as e:
            return f"Error editing {path}: {str(e)}"

    def _parse_tool_calls(self, text: str) -> list[dict]:
        """Parse JSON tool calls from model response."""
        tool_calls = []
        # Match ```tool ... ``` or plain JSON if it looks like a tool call
        # We'll be flexible to catch different model behaviors
        
        # 1. Try JSON in backticks
        pattern = r'```(?:tool|json)?\s*\n?(.*?)\n?```'
        matches = re.findall(pattern, text, re.DOTALL)
        
        for match in matches:
            try:
                data = json.loads(match.strip())
                if isinstance(data, dict) and "tool" in data:
                    tool_calls.append(data)
            except:
                continue
                
        # 2. Try raw JSON if no backticks found
        if not tool_calls:
            # Look for something that looks like {"tool": ...}
            # This regex allows for nested braces by searching for the start and attempting to find a matching end
            for match in re.finditer(r'\{[\s\n]*"tool"[\s\n]*:.*?\}', text, re.DOTALL):
                potential_json = match.group(0)
                # Count braces to see if we're cut short
                if potential_json.count('{') > potential_json.count('}'):
                    # Try to find the next closing brace
                    start_idx = match.start()
                    # Basic brace matcher
                    braces = 0
                    for i in range(start_idx, len(text)):
                        if text[i] == '{': braces += 1
                        elif text[i] == '}': braces -= 1
                        if braces == 0:
                            potential_json = text[start_idx:i+1]
                            break
                try:
                    data = json.loads(potential_json)
                    if isinstance(data, dict) and "tool" in data:
                        tool_calls.append(data)
                except:
                    continue
                    
        return tool_calls

    def chat(self, user_input: str):
        """Process user input with the core agent loop."""
        self.history.append({"role": "user", "content": user_input})
        
        while True:
            # 1. Get model response
            with console.status("[cyan]Methil is thinking...[/cyan]"):
                response_text = self.llm.generate(self.history)
            
            # 2. Print response (or part of it)
            # Detect tool calls
            tool_calls = self._parse_tool_calls(response_text)
            
            # If there's text before the tool call, print it
            clean_text = response_text
            if tool_calls:
                # Truncate text at the first tool call for cleaner UI
                # (Simple approach: find the first ``` or { )
                first_tool_idx = response_text.find("```")
                if first_tool_idx == -1:
                    first_tool_idx = response_text.find("{\"tool\"")
                
                if first_tool_idx != -1:
                    clean_text = response_text[:first_tool_idx].strip()
            
            if clean_text:
                console.print(f"\n[bold blue]Methil:[/bold blue] {clean_text}")
            
            # 3. Add assistant response to history
            self.history.append({"role": "assistant", "content": response_text})
            
            # 4. Handle tool calls
            if not tool_calls:
                # No tools to call, turn is over
                break
                
            for tc in tool_calls:
                name = tc.get("tool")
                args = tc.get("args", {})
                
                console.print(f"\n[bold yellow]🛠️  Using tool:[/bold yellow] [green]{name}[/green]({json.dumps(args)})")
                
                # Execute
                result = self.execute_tool(name, args)
                
                # Show result preview
                preview = result[:500] + "..." if len(result) > 500 else result
                console.print(f"[dim]{preview}[/dim]")
                
                # Add result to history
                # We format it as a user message since we don't have native tool roles in MLX chat templates usually
                # Following learn-claude-code: "Results become context (fed back as 'user' messages)"
                self.history.append({
                    "role": "user", 
                    "content": f"Tool result for {name}:\n{result}"
                })
            
            # Loop continues to let model process tool results
            if len(self.history) > 20: # Safety break
                console.print("[red]Too many iterations, stopping for safety.[/red]")
                break
