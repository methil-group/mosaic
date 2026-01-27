import gleam/dynamic/decode
import gleam/json
import gleam/string

pub fn read_file(parameters: String) -> String {
  let decoder = decode.field("path", decode.string, decode.success)
  case json.parse(from: parameters, using: decoder) {
    Ok(path) -> do_read_file(path)
    Error(_) -> "Error: Invalid parameters for read_file"
  }
}

pub fn write_file(parameters: String) -> String {
  let decoder = {
    use path <- decode.field("path", decode.string)
    use content <- decode.field("content", decode.string)
    decode.success(#(path, content))
  }
  case json.parse(from: parameters, using: decoder) {
    Ok(#(path, content)) -> do_write_file(path, content)
    Error(_) -> "Error: Invalid parameters for write_file"
  }
}

pub fn replace_content(parameters: String) -> String {
  let decoder = {
    use path <- decode.field("path", decode.string)
    use old_text <- decode.field("old_text", decode.string)
    use new_text <- decode.field("new_text", decode.string)
    decode.success(#(path, old_text, new_text))
  }
  case json.parse(from: parameters, using: decoder) {
    Ok(#(path, old_text, new_text)) -> {
      let content = do_read_file(path)
      case string.contains(content, old_text) {
        True -> {
          let new_content = string.replace(content, old_text, new_text)
          do_write_file(path, new_content)
        }
        False -> "Error: old_text not found in file"
      }
    }
    Error(_) -> "Error: Invalid parameters for replace_content"
  }
}

@external(erlang, "mosaic_tools_ffi", "read_file")
fn do_read_file(path: String) -> String

@external(erlang, "mosaic_tools_ffi", "write_file")
fn do_write_file(path: String, content: String) -> String
