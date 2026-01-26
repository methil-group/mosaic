import os

class PromptFactory:
    def __init__(self):
        pass

    def create_system_prompt(self):
        working_directory = os.getcwd()

        system_prompt = f"""
You are a CLI agent at {working_directory}. Solve problems using bash commands.

Rules:
- Prefer tools over prose. Act first, explain briefly after.
- Read files: cat, grep, find, rg, ls, head, tail
- Write files: echo '...' > file, sed -i, or cat << 'EOF' > file
- **CRITICAL**: Never hallucinate tool results. After a `<tool_call>`, you MUST stop writing and wait for the system to provide the `<tool_result>`.
- **CRITICAL**: You MUST NOT write `<tool_result>` tags yourself. These are provided ONLY by the system.
"""
        return system_prompt

    def create_tool_prompt(self, prompt: str, tool_desc: str, usage_examples: str = "") -> str:
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

    def format_tool_result(self, response: str, tool_name: str, result: str) -> str:
        import json
        return f"{response}\n<tool_result>{json.dumps({'tool': tool_name, 'result': result})}</tool_result>\nContinue:"