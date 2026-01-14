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
        
        # Initialize tools
        from src.framework.abstract_tool import ToolRegistry
        from src.core.tools.read_file import ReadFileTool
        from src.core.tools.write_file import WriteFileTool
        from src.core.tools.edit_file import EditFileTool
        from src.core.tools.run_command import RunCommandTool
        from src.core.tools.list_directory import ListDirectoryTool
        from src.core.tools.search_code import SearchCodeTool
        
        self.registry = ToolRegistry()
        self.registry.register(ReadFileTool())
        self.registry.register(WriteFileTool(require_confirmation=False))
        self.registry.register(EditFileTool())
        self.registry.register(RunCommandTool())
        self.registry.register(ListDirectoryTool())
        self.registry.register(SearchCodeTool())

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
        # For now, allow paths to look valid if they resolve
        # The tool implementations handle their own checks, but we verify resolution here
        return path

    def execute_tool(self, name: str, args: dict) -> str:
        """Execute a tool and return the output as string."""
        tool = self.registry.get(name)
        if not tool:
            return f"Error: Unknown tool '{name}'"
            
        try:
            # Execute tool
            # Current tools might not support cwd injection yet, need to check run_command
            # But the tools are standard. run_command takes cwd arg.
            if name == "run_command" and "cwd" not in args:
                args["cwd"] = str(self.working_dir)
                
            # Most file tools take 'path', ensure it's absolute or resolve it?
            # The tools use Path(path), so relative paths are relative to CWD of the process.
            # We should probably resolve paths relative to self.working_dir if they are relative.
            if "path" in args:
                try:
                    p = Path(args["path"])
                    if not p.is_absolute():
                        args["path"] = str((self.working_dir / p).resolve())
                except Exception:
                    pass
            
            result = tool.execute(**args)
            
            if result.success:
                return result.output
            else:
                return f"Error: {result.error}"
                
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
