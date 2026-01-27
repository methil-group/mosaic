import gleam/dynamic/decode
import gleam/json
import gleam/list
import gleam/result
import gleam/string

// Extracts JSON from potential markdown blocks (```json ... ```)
pub fn extract_json(input: String) -> String {
  case string.contains(input, "```json") {
    True -> {
      input
      |> string.split("```json")
      |> list.drop(1)
      |> list.first
      |> result.unwrap("")
      |> string.split("```")
      |> list.first
      |> result.unwrap("")
      |> string.trim
    }
    False -> {
      case string.contains(input, "```") {
        True -> {
          input
          |> string.split("```")
          |> list.drop(1)
          |> list.first
          |> result.unwrap("")
          |> string.trim
        }
        False -> input
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
