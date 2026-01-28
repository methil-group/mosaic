import core/tools/tool
import gleam/json
import gleam/list
import gleam/string

pub fn create_system_prompt(
  tools: List(tool.Tool),
  working_directory: String,
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

  let header = "You are a CLI agent at " <> working_directory <> ".\n"

  let body = "
You are an autonomous agent specialized in file manipulation and command execution.

Rules:
1. **CHAIN TOOLS**: You can call multiple tools in sequence. Do NOT stop after one tool if the task is not complete.
2. **ACT IMMEDIATEY**: Do not explain what you are going to do. Just output the `<tool_call>` JSON.
3. **NO CHATTER**: If you need to perform an action, do NOT output natural language. Only output the tool call.
4. **FORMAT**:
<tool_call>
{
  \"name\": \"tool_name\",
  \"parameters\": { ... }
}
</tool_call>

5. **FINAL ANSWER**: Only when the user's request is FULLY satisfied, output a concise natural language summary.

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
