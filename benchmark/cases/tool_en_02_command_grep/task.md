# Task: Extract TODO List

Your task is to find all the "TODO" comments in the workspace and generate a file named `todo_list.md`.

Requirements:
1. Use your tools (like `grep` via `RunCommandTool`) to find all lines containing "TODO".
2. Create `todo_list.md`.
3. Each line in `todo_list.md` should contain the found TODO comment and the filename it was found in.
   Format: `- [ ] app.py: Implement database connection`
