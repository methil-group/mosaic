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
Loop: plan -> act with tools -> report.

Rules:
- Prefer tools over prose. Act, don't just explain.
- After finishing, summarize what changed.
- **CRITICAL**: Use `<tool_call>` with JSON.

### Available Tools:
" <> tools_json <> "

### CRITICAL: TOOL CALL FORMAT
You MUST use tools to solve this problem. Do NOT explain what you would do - EXECUTE commands immediately using the tools.
EVERY tool call MUST be wrapped in `<tool_call>` tags and MUST be valid JSON.

Example:
<tool_call>
{
  \"name\": \"run_bash\",
  \"parameters\": {
    \"command\": \"ls\"
  }
}
</tool_call>

### Instructions:
1. Analyze the user's prompt.
2. If you need to use a tool, respond with the `<tool_call>` block. You may include a brief explanation BEFORE the block, but the block itself must be exact.
3. If you have the answer or don't need a tool, provide a concise natural language response.
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

  "<tool_result>" <> content <> "</tool_result>\nContinue:"
}
