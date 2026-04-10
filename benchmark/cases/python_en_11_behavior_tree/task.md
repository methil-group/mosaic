# Task: Implement Behavior Tree Nodes in Python

In `behavior_tree.py`, complete the implementation of the `Sequence` and `Selector` nodes.

## Requirements:
1. **Sequence Node (AND logic)**:
   - Ticks its children in order.
   - If a child returns `FAILURE`, the sequence returns `FAILURE` immediately.
   - If a child returns `RUNNING`, the sequence returns `RUNNING`.
   - If all children return `SUCCESS`, the sequence returns `SUCCESS`.
2. **Selector Node (OR logic)**:
   - Ticks its children in order.
   - If a child returns `SUCCESS`, the selector returns `SUCCESS` immediately.
   - If a child returns `RUNNING`, the selector returns `RUNNING`.
   - If all children return `FAILURE`, the selector returns `FAILURE`.
3. **Logic**: Ensure the state is correctly propagated.
