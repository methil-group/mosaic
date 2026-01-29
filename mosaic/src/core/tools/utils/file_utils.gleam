import gleam/dynamic/decode
import gleam/json
import gleam/list
import gleam/string

pub fn read_file(parameters: String, workspace: String) -> String {
  let decoder = decode.field("path", decode.string, decode.success)
  case json.parse(from: parameters, using: decoder) {
    Ok(path) -> do_read_file(resolve_path(path, workspace))
    Error(_) -> "Error: Invalid parameters for read_file"
  }
}

pub fn write_file(parameters: String, workspace: String) -> String {
  let decoder = {
    use path <- decode.field("path", decode.string)
    use content <- decode.field("content", decode.string)
    decode.success(#(path, content))
  }
  case json.parse(from: parameters, using: decoder) {
    Ok(#(path, content)) ->
      do_write_file(resolve_path(path, workspace), content)
    Error(_) -> "Error: Invalid parameters for write_file"
  }
}

pub fn replace_content(parameters: String, workspace: String) -> String {
  let decoder = {
    use path <- decode.field("path", decode.string)
    use old_text <- decode.field("old_text", decode.string)
    use new_text <- decode.field("new_text", decode.string)
    decode.success(#(path, old_text, new_text))
  }
  case json.parse(from: parameters, using: decoder) {
    Ok(#(path, old_text, new_text)) -> {
      let resolved = resolve_path(path, workspace)
      let content = do_read_file(resolved)
      case string.contains(content, old_text) {
        True -> {
          let new_content = string.replace(content, old_text, new_text)
          do_write_file(resolved, new_content)
        }
        False -> "Error: old_text not found in file"
      }
    }
    Error(_) -> "Error: Invalid parameters for replace_content"
  }
}

pub fn insert_line(parameters: String, workspace: String) -> String {
  let decoder = {
    use path <- decode.field("path", decode.string)
    use line <- decode.field("line", decode.int)
    use content <- decode.field("content", decode.string)
    decode.success(#(path, line, content))
  }
  case json.parse(from: parameters, using: decoder) {
    Ok(#(path, line, content_to_insert)) -> {
      let resolved = resolve_path(path, workspace)
      let file_content = do_read_file(resolved)
      let lines = string.split(file_content, on: "\n")
      let count = list.length(lines)

      case line > 0 && line <= count + 1 {
        True -> {
          let #(before, after) = list.split(lines, at: line - 1)
          let new_lines = list.flatten([before, [content_to_insert], after])
          let new_content = string.join(new_lines, with: "\n")
          do_write_file(resolved, new_content)
        }
        False ->
          "Error: Invalid line number "
          <> string.inspect(line)
          <> ". File has "
          <> string.inspect(count)
          <> " lines."
      }
    }
    Error(_) -> "Error: Invalid parameters for insert_line"
  }
}

fn resolve_path(path: String, workspace: String) -> String {
  case string.starts_with(path, "/") {
    True -> path
    False -> {
      // Remove trailing slash from workspace if present
      let clean_workspace = case string.ends_with(workspace, "/") {
        True -> string.drop_end(workspace, 1)
        False -> workspace
      }
      clean_workspace <> "/" <> path
    }
  }
}

@external(erlang, "mosaic_tools_ffi", "read_file")
fn do_read_file(path: String) -> String

@external(erlang, "mosaic_tools_ffi", "write_file")
fn do_write_file(path: String, content: String) -> String
