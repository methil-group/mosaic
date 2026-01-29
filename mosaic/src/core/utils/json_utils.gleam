import gleam/dynamic/decode
import gleam/json
import gleam/list
import gleam/option.{type Option, None, Some}
import gleam/result
import gleam/string

// Extracts JSON from potential markdown blocks (```json ... ```) or <tool_call> tags
pub fn extract_json(input: String) -> Option(String) {
  case string.contains(input, "<tool_call>") {
    True -> {
      input
      |> string.split("<tool_call>")
      |> list.drop(1)
      |> list.first
      |> result.unwrap("")
      |> string.split("</tool_call>")
      |> list.first
      |> result.map(string.trim)
      |> option.from_result
    }
    False -> {
      case
        string.contains(input, "```json")
        && list.length(string.split(input, "```")) >= 3
      {
        True -> {
          input
          |> string.split("```json")
          |> list.drop(1)
          |> list.first
          |> result.unwrap("")
          |> string.split("```")
          |> list.first
          |> result.map(string.trim)
          |> option.from_result
        }
        False -> {
          case
            string.contains(input, "```")
            && list.length(string.split(input, "```")) >= 3
          {
            True -> {
              input
              |> string.split("```")
              |> list.drop(1)
              |> list.first
              |> result.map(string.trim)
              |> option.from_result
            }
            False -> {
              // If it's just raw JSON, we check if it's well-formed enough
              let trimmed = string.trim(input)
              case
                string.starts_with(trimmed, "{")
                && string.ends_with(trimmed, "}")
              {
                True -> Some(trimmed)
                False -> None
              }
            }
          }
        }
      }
    }
  }
}

pub fn dynamic_to_json(dyn: decode.Dynamic) -> json.Json {
  case decode.run(dyn, decode.string) {
    Ok(s) -> json.string(s)
    Error(_) -> {
      case decode.run(dyn, decode.int) {
        Ok(i) -> json.int(i)
        Error(_) -> {
          case decode.run(dyn, decode.bool) {
            Ok(b) -> json.bool(b)
            Error(_) -> json.null()
          }
        }
      }
    }
  }
}
