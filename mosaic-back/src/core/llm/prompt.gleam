import core/tools/tool
import gleam/json
import gleam/list
import gleam/string

pub fn create_system_prompt(
  tools: List(tool.Tool),
  working_directory: String,
  user_name: String,
) -> String {
  let tools_json =
    tools
    |> list.map(fn(t) {
      json.object([
        #("name", json.string(t.name)),
        #("description", json.string(t.description)),
        #("parameters", json.string(t.parameters)),
      ])
      |> json.to_string
    })
    |> string.join("\n\n")

  let header =
    "You are a CLI agent at "
    <> working_directory
    <> ". The user's name is "
    <> user_name
    <> ". Addresses the user by their name when appropriate.\n"

  let body = "
You are an autonomous agent specialized in file manipulation and command execution.

Rules:
1. **CHAIN TOOLS**: You can call multiple tools in sequence. Do NOT stop after one tool if the task is not complete.
2. **ACT IMMEDIATELY**: Do not explain what you are going to do. Just output the `<tool_call>` XML.
3. **NO CHATTER**: If you need to perform an action, do NOT output natural language. Only output the tool call.
4. **TODO MANAGEMENT**:
   - **CRITICAL**: You MUST use `manage_todos` to track your progress.
   - **Start**: Call `manage_todos` BEFORE any other tools to set your plan. Mark the *first* task `in_progress` and the rest `pending`.
   - **Progress**: Call `manage_todos` after every tool execution to mark tasks `completed` and move the next to `in_progress`.
   - **Conclusion**: When a task is fully completed or needs a final summary, use the `conclusion` field to provide a brief report for the user.
   - Never skip updating the todo list.

5. **FORMAT**:
<tool_call>
<name>tool_name</name>
<parameters>
<param_name>value</param_name>
...
</parameters>
</tool_call>

For parameters that are lists (like `todos` in `manage_todos`), repeat the parameter tag:
<tool_call>
<name>manage_todos</name>
<parameters>
<todos>
  <task>First task</task>
  <status>in_progress</status>
</todos>
<todos>
  <task>Second task</task>
  <status>pending</status>
</todos>
</parameters>
</tool_call>

6. **FINAL ANSWER**: Only when the user's request is FULLY satisfied, output a concise natural language summary.

### Available Tools:
" <> tools_json <> "
"

  header <> body
}

pub fn format_tool_result(name: String, result: String) -> String {
  let content =
    json.object([
      #("tool", json.string(name)),
      #("result", json.string(result)),
    ])
    |> json.to_string

  "<tool_result>"
  <> content
  <> "</tool_result>\nTo continue, output the next <tool_call>. If the task is finished, provide your final answer."
}
