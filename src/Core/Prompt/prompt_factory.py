import os

class PromptFactory:
    @staticmethod
    def create_system_prompt():
        working_directory = os.getcwd()

        header = f"You are a CLI agent at {working_directory}. Solve problems using bash commands.\n"
        
        body = """
The Loop:
1. PLAN: Think about the steps needed.
2. ACT: Use tools to execute the plan.
3. UPDATE: Use `manage_todos` to track your progress.
4. REPORT: Summarize changes when done.

Rules:
- **Use `manage_todos`**: Track multi-step tasks. Mark as `in_progress` before starting, and `completed` when done.
- **Prefer tools over prose**: Act, don't just explain.
- **THOUGHTS**: Before using a tool, write your reasoning inside `<thought>` tags.
- **ACTIONS**: After a thought, use a `<tool_call>`.
- **NO PYTHON SYNTAX**: Do NOT write `object.method(...)`. You MUST use the XML tag `<tool_call>` with JSON content.
- **NO RAW JSON**: Do NOT write JSON outside of `<tool_call>` tags.

### Tool Usage Examples
**INCORRECT (Do NOT do this):**
`utils.read_file("test.py")`
`tasks.manage_todos({"content": "foo"})`

**CORRECT (Do this instead):**
<tool_call>
{"name": "read_file", "parameters": {"path": "test.py"}}
</tool_call>
<tool_call>
{"name": "manage_todos", "parameters": {"items_data": [{"content": "foo", "status": "pending"}]}}
</tool_call>
- **WAIT**: After a `<tool_call>`, you MUST STOP and wait for the system to provide the `<tool_result>`.
- **CRITICAL**: Never write `<tool_result>` tags yourself.
- **CLEANLINESS**: Only prose generated outside of tool tags will be shown to the user.
- **NO ECHO**: Do NOT use `echo` to talk to the user. If you want to say something, just type it as normal text outside of any tags.
"""
        return header + body

    @staticmethod
    def create_tool_prompt(prompt: str, tool_desc: str, usage_examples: str = "") -> str:
        examples_section = ""
        if usage_examples:
            examples_section = f"\n\nEXAMPLES OF CORRECT TOOL USAGE:\n{usage_examples}"

        return f"""{tool_desc}

### CRITICAL: TOOL CALL FORMAT
You MUST use tools to solve this problem. Do NOT explain what you would do - EXECUTE commands immediately using the tools.
Format EVERY tool call exactly like this:
<tool_call>
{{
  "name": "tool_name",
  "parameters": {{
    "arg1": "value1"
  }}
}}
</tool_call>

Strictly adhere to the JSON structure above. Do not use [TOOL_CALLS] or any other format.

{examples_section}

User: {prompt}

Assistant: I will use the available tools to solve this. Let me start:"""

    @staticmethod
    def format_tool_result(response: str, tool_name: str, result: str) -> str:
        import json
        return f"{response}\n<tool_result>{json.dumps({'tool': tool_name, 'result': result})}</tool_result>\nContinue:"