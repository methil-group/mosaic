"""Agent orchestration logic with streaming and markdown support."""

import json
import os
import re
import subprocess
import shutil
from pathlib import Path
from rich.console import Console
from rich.markdown import Markdown

from src.core.llm import MLXLLM, clean_response
from src.core.prompts import get_system_prompt
from src.core.models import PINK

console = Console()


def open_in_ide(filepath: str):
    """Open a file in the IDE if running in an IDE terminal."""
    path = Path(filepath).resolve()
    if not path.exists():
        return
        
    if shutil.which("code"):
        subprocess.run(["code", "--goto", str(path)], capture_output=True)
    elif shutil.which("cursor"):
        subprocess.run(["cursor", str(path)], capture_output=True)
    elif shutil.which("zed"):
        subprocess.run(["zed", str(path)], capture_output=True)


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
        if not p:
            raise ValueError("Path is empty")
        path = (self.working_dir / p).resolve()
        if not str(path).startswith(str(self.working_dir)):
            raise ValueError(f"Path escapes workspace: {p}")
        return path

    def execute_tool(self, name: str, args: dict) -> str:
        """Execute a tool and return the output as string."""
        try:
            if name == "bash":
                cmd = args.get("command")
                if not cmd:
                    return "Error: 'command' argument is required"
                return self._run_bash(cmd)
            
            elif name == "read_file":
                path = args.get("path")
                if not path:
                    return "Error: 'path' argument is required"
                return self._run_read(path)
            
            elif name == "write_file":
                path = args.get("path")
                content = args.get("content")
                if not path:
                    return "Error: 'path' argument is required"
                if content is None:
                    return "Error: 'content' argument is required"
                return self._run_write(path, content)
            
            elif name == "edit_file":
                path = args.get("path")
                old_text = args.get("old_text")
                new_text = args.get("new_text")
                if not path:
                    return "Error: 'path' argument is required"
                if not old_text:
                    return "Error: 'old_text' argument is required"
                if new_text is None:
                    return "Error: 'new_text' argument is required"
                return self._run_edit(path, old_text, new_text)
            
            return f"Error: Unknown tool '{name}'"
        except Exception as e:
            return f"Error: {str(e)}"

    def _run_bash(self, command: str) -> str:
        """Run a shell command."""
        dangerous = ["rm -rf /", "sudo ", "shutdown", "reboot", "> /dev/"]
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
            return output[:10000] if output else "(no output)"
        except subprocess.TimeoutExpired:
            return "Error: Command timed out after 60s."

    def _run_read(self, path: str) -> str:
        """Read a file."""
        try:
            fp = self._safe_path(path)
            content = fp.read_text()
            return content[:20000] if len(content) > 20000 else content
        except Exception as e:
            return f"Error: {str(e)}"

    def _run_write(self, path: str, content: str) -> str:
        """Write a file."""
        try:
            fp = self._safe_path(path)
            fp.parent.mkdir(parents=True, exist_ok=True)
            fp.write_text(content)
            open_in_ide(str(fp))
            return f"Wrote {len(content)} bytes to {path}"
        except Exception as e:
            return f"Error: {str(e)}"

    def _run_edit(self, path: str, old_text: str, new_text: str) -> str:
        """Apply a surgical edit to a file."""
        try:
            fp = self._safe_path(path)
            content = fp.read_text()
            if old_text not in content:
                preview = content[:500] + "..." if len(content) > 500 else content
                return f"Error: Text not found. File preview:\n{preview}"
            
            new_content = content.replace(old_text, new_text, 1)
            fp.write_text(new_content)
            open_in_ide(str(fp))
            return f"Edited {path}"
        except Exception as e:
            return f"Error: {str(e)}"

    def _parse_tool_calls(self, text: str) -> list[dict]:
        """Parse JSON tool calls from model response."""
        tool_calls = []
        
        # Try JSON in backticks
        pattern = r'```(?:tool|json)?\s*\n?(.*?)\n?```'
        matches = re.findall(pattern, text, re.DOTALL)
        
        for match in matches:
            try:
                data = json.loads(match.strip())
                if isinstance(data, dict) and "tool" in data:
                    tool_calls.append(data)
            except:
                continue
                
        # Try raw JSON if no backticks found
        if not tool_calls:
            for match in re.finditer(r'\{[\s\n]*"tool"[\s\n]*:', text, re.DOTALL):
                start_idx = match.start()
                braces = 0
                end_idx = start_idx
                for i in range(start_idx, len(text)):
                    if text[i] == '{': braces += 1
                    elif text[i] == '}': braces -= 1
                    if braces == 0:
                        end_idx = i + 1
                        break
                try:
                    data = json.loads(text[start_idx:end_idx])
                    if isinstance(data, dict) and "tool" in data:
                        tool_calls.append(data)
                except:
                    continue
                    
        return tool_calls

    def chat(self, user_input: str):
        """Process user input with streaming response."""
        self.history.append({"role": "user", "content": user_input})
        
        iterations = 0
        max_iterations = 10
        
        while iterations < max_iterations:
            iterations += 1
            
            # Stream the response
            console.print(f"\n[bold {PINK}]Methil:[/bold {PINK}] ", end="")
            
            full_response = ""
            display_buffer = ""
            in_tool_block = False
            
            for chunk in self.llm.generate_stream(self.history):
                full_response += chunk
                
                # Check if we entered a tool block
                if not in_tool_block:
                    if '```' in full_response or '{"tool"' in full_response:
                        in_tool_block = True
                        # Print what we had before the tool block
                        if display_buffer:
                            console.print(display_buffer, end="")
                            display_buffer = ""
                    else:
                        # Stream the text
                        display_buffer += chunk
                        # Print in small chunks for smoother streaming
                        if len(display_buffer) > 3:
                            console.print(display_buffer, end="")
                            display_buffer = ""
            
            # Print any remaining buffer
            if display_buffer:
                console.print(display_buffer, end="")
            
            console.print()  # New line after streaming
            
            # Clean response
            full_response = clean_response(full_response)
            
            # Parse tool calls
            tool_calls = self._parse_tool_calls(full_response)
            
            # Add to history
            self.history.append({"role": "assistant", "content": full_response})
            
            # No tools = done
            if not tool_calls:
                break
                
            # Execute tools
            for tc in tool_calls:
                name = tc.get("tool")
                args = tc.get("args", {})
                
                # Display tool call in dim gray
                console.print(f"\n[dim]🛠️  {name} {json.dumps(args, ensure_ascii=False)}[/dim]")
                
                result = self.execute_tool(name, args)
                
                preview = result[:300] + "..." if len(result) > 300 else result
                if "Error" in result:
                    console.print(f"[red]{preview}[/red]")
                else:
                    console.print(f"[dim]{preview}[/dim]")
                
                self.history.append({
                    "role": "user", 
                    "content": f"Tool '{name}' result:\n{result}"
                })
        
        if iterations >= max_iterations:
            console.print(f"[yellow]⚠ Reached max iterations ({max_iterations})[/yellow]")
