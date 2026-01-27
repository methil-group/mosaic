import os

class PromptFactory:
    @staticmethod
    def create_system_prompt():
        working_directory = os.getcwd()

        header = f"You are a CLI agent at {working_directory}.\n"
        
        body = """
Loop: plan -> act with tools -> update todos -> report.

Rules:
- Use `manage_todos` to track multi-step tasks.
- **Start**: When creating tasks, mark the *first* one `in_progress` and the rest `pending`.
- **Progress**: Mark tasks `completed` when done, then move the next to `in_progress`.
- Prefer tools over prose. Act, don't just explain.
- After finishing, summarize what changed.
- **CRITICAL**: Do NOT use Python syntax. Use `<tool_call>` with JSON.
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