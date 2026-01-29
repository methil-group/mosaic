import gleam/dict
import gleam/json
import gleam/list
import gleam/option.{type Option, None, Some}
import gleam/string

pub type FoundTool {
  FoundTool(name: String, parameters: String)
}

pub fn detect_tool_call(input: String) -> Option(FoundTool) {
  let text = string.trim(input)

  // Strict XML detection
  case string.contains(text, "<tool_call>") {
    True -> {
      let content = extract_xml_tag(text, "tool_call")
      let name = extract_xml_tag(content, "name") |> string.trim
      let params_with_tags = extract_xml_tag(content, "parameters")

      // Parse the parameters XML structure into a JSON object
      let params_json = parse_xml_to_json(params_with_tags)

      Some(FoundTool(name, json.to_string(params_json)))
    }
    False -> None
  }
}

fn extract_xml_tag(input: String, tag: String) -> String {
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

// Parses XML content strings into a JSON structure
// Handles nested tags and repeated keys (converted to arrays)
fn parse_xml_to_json(input: String) -> json.Json {
  let nodes = parse_xml_nodes(input)
  json.object(nodes_to_json_props(nodes))
}

type XmlNode {
  TextNode(String)
  ElementNode(tag: String, children: List(XmlNode))
}

fn nodes_to_json_props(nodes: List(XmlNode)) -> List(#(String, json.Json)) {
  // Group by tag to detect arrays
  let grouped =
    list.group(nodes, fn(node) {
      case node {
        ElementNode(tag, _) -> tag
        TextNode(_) -> ""
        // Should not happen at property level
      }
    })

  // Convert groups to JSON properties
  dict.to_list(grouped)
  |> list.filter_map(fn(pair) {
    let #(tag, group) = pair
    case tag {
      "" -> Error(Nil)
      // Ignore loose text at top level
      _ -> {
        // Reverse group because list.group reverses the order
        let values =
          list.map(list.reverse(group), fn(node) {
            case node {
              ElementNode(_, children) -> {
                // Check if children are only text
                case is_text_only(children) {
                  True -> json.string(get_text_content(children))
                  False -> json.object(nodes_to_json_props(children))
                }
              }
              TextNode(content) -> json.string(content)
            }
          })

        case list.length(values) {
          1 -> {
            // Single value, just return it
            let assert Ok(val) = list.first(values)
            Ok(#(tag, val))
          }
          _ -> {
            // Multiple values for same tag -> Array
            Ok(#(tag, json.preprocessed_array(values)))
          }
        }
      }
    }
  })
}

fn is_text_only(nodes: List(XmlNode)) -> Bool {
  list.all(nodes, fn(n) {
    case n {
      TextNode(_) -> True
      ElementNode(_, _) -> False
    }
  })
}

fn get_text_content(nodes: List(XmlNode)) -> String {
  list.map(nodes, fn(n) {
    case n {
      TextNode(s) -> s
      ElementNode(_, _) -> ""
    }
  })
  |> string.join("")
  |> string.trim
}

// Naive XML parser
fn parse_xml_nodes(input: String) -> List(XmlNode) {
  do_parse_xml(input, [])
}

fn do_parse_xml(input: String, acc: List(XmlNode)) -> List(XmlNode) {
  let trimmed = string.trim(input)

  case string.is_empty(trimmed) {
    True -> list.reverse(acc)
    False -> {
      case string.starts_with(trimmed, "<") {
        True -> {
          // It's a tag
          case string.split_once(trimmed, ">") {
            Ok(#(open_tag_content, rest_after_open)) -> {
              let tag_name = drop_first_char(open_count_tag(open_tag_content))
              let close_tag = "</" <> tag_name <> ">"

              case string.split_once(rest_after_open, close_tag) {
                Ok(#(inner_content, rest_after_close)) -> {
                  let children = parse_xml_nodes(inner_content)
                  let final_children = case list.is_empty(children) {
                    True -> {
                      case string.is_empty(string.trim(inner_content)) {
                        True -> []
                        False -> [TextNode(inner_content)]
                      }
                    }
                    False -> children
                  }

                  let node = ElementNode(tag_name, final_children)
                  do_parse_xml(rest_after_close, [node, ..acc])
                }
                Error(_) -> {
                  // Malformed or self-closing (not supported), skip 1 char
                  do_parse_xml(drop_first_char(trimmed), acc)
                }
              }
            }
            Error(_) -> do_parse_xml(drop_first_char(trimmed), acc)
          }
        }
        False -> {
          // It's text until next <
          case string.split_once(trimmed, "<") {
            Ok(#(text, rest)) -> {
              let node = TextNode(text)
              do_parse_xml("<" <> rest, [node, ..acc])
            }
            Error(_) -> {
              // All text
              [TextNode(trimmed), ..acc] |> list.reverse
            }
          }
        }
      }
    }
  }
}

fn open_count_tag(s: String) -> String {
  case string.split_once(s, " ") {
    Ok(#(tag, _)) -> tag
    Error(_) -> s
  }
}

fn drop_first_char(s: String) -> String {
  case string.pop_grapheme(s) {
    Ok(#(_, rest)) -> rest
    Error(_) -> ""
  }
}
