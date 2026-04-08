from textual.widgets import Static

class ToolExecution(Static):
    def __init__(self, name: str, params: dict):
        super().__init__()
        self.name = name
        self.params = params

    def render(self) -> str:
        return f"[magenta bold]TOOL CALL: {self.name}[/] ({self.params})"

class ToolResult(Static):
    def __init__(self, name: str, result: str):
        super().__init__()
        self.name = name
        self.result = result

    def render(self) -> str:
        # Show modified files if it was an edit or write
        output = f"[magenta]TOOL RESULT: {self.name}[/]\n"
        if "edit_file" in self.name or "write_file" in self.name:
            output += f"[bold green]✓ File modified[/]\n"
        
        # Truncate result for display
        truncated = self.result[:200] + "..." if len(self.result) > 200 else self.result
        output += f"[dim]{truncated}[/]"
        return output
