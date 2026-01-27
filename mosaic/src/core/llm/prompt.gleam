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

  "You are a CLI agent at "
  <> working_directory
  <> ".\n\nYou are an AI assistant with access to several tools.
Your goal is to help the user by using these tools when necessary.

### Available Tools:
"
  <> tools_json
  <> "

### Instructions:
1. Analyze the user's prompt.
2. If you need to use a tool, respond ONLY with a single JSON object. No explanation, no preamble, no other text.
3. Use the following format for tool calls:
{
  \"tool\": \"tool_name\",
  \"parameters\": {
    \"param_name\": \"param_value\"
  }
}
4. If you have the answer or don't need a tool, provide a concise natural language response.
"
}

pub fn format_tool_result(name: String, result: String) -> String {
  "Tool '" <> name <> "' returned: " <> result
}
