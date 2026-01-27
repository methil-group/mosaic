import core/utils/json_utils
import gleam/dict
import gleam/dynamic/decode
import gleam/json
import gleam/list
import gleam/option.{None, Some}
import gleam/string

pub type FoundTool {
  FoundTool(name: String, parameters: String)
}

pub fn detect_tool_call(input: String) -> option.Option(FoundTool) {
  let text = string.trim(input)

  // We check if the response looks like a JSON block or code snippet.
  let json_part = json_utils.extract_json(text)

  case string.starts_with(json_part, "{") && string.ends_with(json_part, "}") {
    True -> {
      let decoder = {
        use name <- decode.field("tool", decode.string)
        use params <- decode.field(
          "parameters",
          decode.dict(decode.string, decode.dynamic),
        )

        let params_json =
          json.object(
            params
            |> dict.to_list
            |> list.map(fn(pair) {
              #(pair.0, json_utils.dynamic_to_json(pair.1))
            }),
          )
        decode.success(FoundTool(name, json.to_string(params_json)))
      }

      case json.parse(from: json_part, using: decoder) {
        Ok(found) -> Some(found)
        Error(_) -> None
      }
    }
    False -> None
  }
}
