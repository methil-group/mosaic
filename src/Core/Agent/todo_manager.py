from dataclasses import dataclass, field
from typing import List, Literal, Optional, Dict, Any

@dataclass
class TodoItem:
    """Represents a single todo item."""
    content: str
    status: Literal["pending", "in_progress", "completed"] = "pending"
    active_form: str = ""

    def __post_init__(self):
        self.status = self.status.lower()
        if self.status not in ("pending", "in_progress", "completed"):
            raise ValueError(f"Invalid status '{self.status}'")
        if not self.content:
            raise ValueError("Content required")
        if self.status == "in_progress" and not self.active_form:
             raise ValueError("active_form required for in_progress items")

class TodoManager:
    """
    Manages a structured task list with enforced constraints.
    
    Constraints:
    1. Max 20 items.
    2. One in_progress item at a time.
    3. Required fields: content, status, active_form (if in_progress).
    """

    def __init__(self):
        self.items: List[TodoItem] = []
        self.max_items = 20

    def update(self, items_data: List[Dict[str, Any]]) -> str:
        """
        Validate and update the todo list.
        
        Args:
            items_data: List of dicts with keys 'content', 'status', 'activeForm'.
            
        Returns:
            Rendered text view of the todo list.
        """
        validated_items = []
        in_progress_count = 0

        for i, item_data in enumerate(items_data):
            try:
                # Map 'activeForm' from JSON to 'active_form' for dataclass
                content = str(item_data.get("content", "")).strip()
                status = str(item_data.get("status", "pending")).strip()
                active_form = str(item_data.get("activeForm", "")).strip()

                item = TodoItem(content=content, status=status, active_form=active_form)
                
                if item.status == "in_progress":
                    in_progress_count += 1
                
                validated_items.append(item)

            except ValueError as e:
                raise ValueError(f"Item {i}: {str(e)}")

        # Enforce global constraints
        if len(validated_items) > self.max_items:
            raise ValueError(f"Max {self.max_items} todos allowed")
        if in_progress_count > 1:
            raise ValueError("Only one task can be in_progress at a time")

        self.items = validated_items
        return self.render()

    def render(self) -> str:
        """
        Render the todo list as human-readable text.
        """
        if not self.items:
            return "No todos."

        lines = []
        completed_count = 0
        
        for item in self.items:
            if item.status == "completed":
                lines.append(f"[x] {item.content}")
                completed_count += 1
            elif item.status == "in_progress":
                lines.append(f"[>] {item.content} <- {item.active_form}")
            else:
                lines.append(f"[ ] {item.content}")

        lines.append(f"\n({completed_count}/{len(self.items)} completed)")
        return "\n".join(lines)

    def get_tool(self) -> "Tool":
        """Return the Tool definition for managing todos."""
        from src.Framework.Tools.tool import Tool
        
        return Tool(
            name="manage_todos",
            function=self.update,
            description="Manage the todo list: add, update, delete, or complete items.",
            parameters={
                "type": "object",
                "properties": {
                    "items_data": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "content": {"type": "string"},
                                "status": {"type": "string", "enum": ["pending", "in_progress", "completed"]},
                                "activeForm": {"type": "string"}
                            },
                            "required": ["content", "status"]
                        },
                        "description": "List of todo items to update the state with."
                    }
                },
                "required": ["items_data"]
            }
        )
