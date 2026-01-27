import core/utils/json_utils
import gleam/dict
import gleam/dynamic/decode
import gleam/json
import gleam/list
import gleam/option.{None, Some}
import gleam/pair
import gleam/result
import gleam/string

pub type FoundTool {
  FoundTool(name: String, parameters: String)
}

pub fn detect_tool_call(input: String) -> option.Option(FoundTool) {
  let text = string.trim(input)

  // We check if the response looks like a JSON block or code snippet.
  case json_utils.extract_json(text) {
    Some(json_part) -> {
      case
        string.starts_with(json_part, "{") && string.ends_with(json_part, "}")
      {
        True -> {
          let decoder = {
            use name <- decode.field("name", decode.string)
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
            Error(_) -> try_parse_xml(json_part)
          }
        }
        False -> try_parse_xml(json_part)
      }
    }
    None -> None
  }
}

fn try_parse_xml(input: String) -> option.Option(FoundTool) {
  // Simple XML-like parser for <name>...</name> and <parameters>...</parameters>
  case string.contains(input, "<name>") && string.contains(input, "</name>") {
    True -> {
      let name = extract_tag(input, "name")
      let params_content = extract_tag(input, "parameters")

      // For parameters, we'll try to extract KV pairs like <key>value</key>
      let params = parse_xml_params(params_content)
      Some(FoundTool(name, json.to_string(json.object(params))))
    }
    False -> None
  }
}

fn extract_tag(input: String, tag: String) -> String {
  case string.split(input, "<" <> tag <> ">") {
    [_, rest] -> {
      case string.split(rest, "</" <> tag <> ">") {
        [content, _] -> string.trim(content)
        _ -> ""
      }
    }
    _ -> ""
  }
}

fn parse_xml_params(input: String) -> List(#(String, json.Json)) {
  // We look for any <TAG>CONTENT</TAG> occurrences.
  // Instead of splitting globally, we find the first tag, its value, and continue.
  do_parse_xml_params(input, [])
}

fn do_parse_xml_params(
  input: String,
  acc: List(#(String, json.Json)),
) -> List(#(String, json.Json)) {
  case string.contains(input, "<") && string.contains(input, ">") {
    True -> {
      let rest =
        string.split_once(input, "<") |> result.unwrap(#("", "")) |> pair.second
      case string.split_once(rest, ">") {
        Ok(#(tag, rest)) -> {
          let closing_tag = "</" <> tag <> ">"
          case string.split_once(rest, closing_tag) {
            Ok(#(content, rest)) -> {
              let new_acc =
                list.append(acc, [#(tag, json.string(string.trim(content)))])
              do_parse_xml_params(rest, new_acc)
            }
            Error(_) -> acc
          }
        }
        Error(_) -> acc
      }
    }
    False -> acc
  }
}
