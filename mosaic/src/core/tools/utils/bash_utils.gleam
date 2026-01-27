import gleam/dynamic/decode
import gleam/json

pub fn run_bash(parameters: String) -> String {
  let decoder = decode.field("command", decode.string, decode.success)
  case json.parse(from: parameters, using: decoder) {
    Ok(command) -> do_run_bash(command)
    Error(_) -> "Error: Invalid parameters for run_bash"
  }
}

@external(erlang, "mosaic_tools_ffi", "run_bash")
fn do_run_bash(command: String) -> String
