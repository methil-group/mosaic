import core/agent/todos
import core/tools/utils/bash_utils
import core/tools/utils/file_utils
import gleam/list
import mosaic_logger

pub type Tool {
  Tool(
    name: String,
    description: String,
    parameters: String,
    function: fn(String, String) -> String,
  )
}

pub fn get_tools() -> List(Tool) {
  [
    Tool(
      name: "run_bash",
      function: bash_utils.run_bash,
      description: "Run a shell command. Use for: ls, find, grep, git, npm, python, etc.",
      parameters: "{\"type\":\"object\",\"properties\":{\"command\":{\"type\":\"string\",\"description\":\"The bash command to run.\"}},\"required\":[\"command\"]}",
    ),
    Tool(
      name: "read_file",
      function: file_utils.read_file,
      description: "Read the contents of a file at the given path.",
      parameters: "{\"type\":\"object\",\"properties\":{\"path\":{\"type\":\"string\",\"description\":\"Path to the file to read.\"}},\"required\":[\"path\"]}",
    ),
    Tool(
      name: "write_file",
      function: file_utils.write_file,
      description: "Write content to a file. Warning: This overwrites existing content.",
      parameters: "{\"type\":\"object\",\"properties\":{\"path\":{\"type\":\"string\",\"description\":\"Path where the file will be written.\"},\"content\":{\"type\":\"string\",\"description\":\"The content to write to the file.\"}},\"required\":[\"path\",\"content\"]}",
    ),
    Tool(
      name: "replace_content",
      function: file_utils.replace_content,
      description: "Replace occurrences of old text with new text in a file.",
      parameters: "{\"type\":\"object\",\"properties\":{\"path\":{\"type\":\"string\",\"description\":\"Path to the file to modify.\"},\"old_text\":{\"type\":\"string\",\"description\":\"The text to be replaced.\"},\"new_text\":{\"type\":\"string\",\"description\":\"The text to replace with.\"}},\"required\":[\"path\",\"old_text\",\"new_text\"]}",
    ),
    Tool(
      name: "manage_todos",
      function: fn(params, _workspace) { todos.handle_tool_call(params) },
      description: "Manage a list of todo items. Use this to track progress on multi-step tasks.",
      parameters: "{\"type\":\"object\",\"properties\":{\"todos\":{\"type\":\"array\",\"items\":{\"type\":\"object\",\"properties\":{\"task\":{\"type\":\"string\",\"description\":\"Description of the task.\"},\"status\":{\"type\":\"string\",\"enum\":[\"pending\",\"in_progress\",\"completed\"],\"description\":\"Status of the task.\"},\"context\":{\"type\":\"string\",\"description\":\"Active form context (required for in_progress tasks, empty otherwise).\"}},\"required\":[\"task\",\"status\",\"context\"]}}},\"required\":[\"todos\"]}",
    ),
  ]
}

pub fn execute_tool(
  name: String,
  parameters: String,
  workspace: String,
  tools: List(Tool),
) -> String {
  case list.find(tools, fn(t) { t.name == name }) {
    Ok(t) -> {
      mosaic_logger.info("agent", "Executing: " <> t.name)
      t.function(parameters, workspace)
    }
    Error(_) -> "Error: Tool '" <> name <> "' not found."
  }
}
