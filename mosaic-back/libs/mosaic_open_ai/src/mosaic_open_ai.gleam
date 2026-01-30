import gleam/bit_array
import gleam/dynamic.{type Dynamic}
import gleam/dynamic/decode
import gleam/http
import gleam/http/request
import gleam/httpc
import gleam/json
import gleam/list
import gleam/option.{type Option, Some}
import gleam/result
import gleam/string

pub type Message {
  Message(role: String, content: String)
}

pub type ChatRequest {
  ChatRequest(model: String, messages: List(Message), stream: Option(Bool))
}

pub type OpenAIError {
  NetworkError(String)
  JsonError(json.DecodeError)
  ApiError(status: Int, body: String)
}

pub fn message_to_json(message: Message) -> json.Json {
  json.object([
    #("role", json.string(message.role)),
    #("content", json.string(message.content)),
  ])
}

pub fn chat_request_to_json(req: ChatRequest) -> String {
  json.object([
    #("model", json.string(req.model)),
    #("messages", json.array(req.messages, message_to_json)),
    #("stream", json.nullable(req.stream, json.bool)),
  ])
  |> json.to_string
}

pub type ChatResponse {
  ChatResponse(
    id: String,
    object: String,
    created: Int,
    model: String,
    choices: List(Choice),
  )
}

pub type Choice {
  Choice(index: Int, message: Message, finish_reason: String)
}

fn choice_decoder() -> decode.Decoder(Choice) {
  use index <- decode.field("index", decode.int)
  use message <- decode.field("message", {
    use role <- decode.field("role", decode.string)
    use content <- decode.field("content", decode.string)
    decode.success(Message(role: role, content: content))
  })
  use finish_reason <- decode.field("finish_reason", decode.string)
  decode.success(Choice(
    index: index,
    message: message,
    finish_reason: finish_reason,
  ))
}

fn chat_response_decoder() -> decode.Decoder(ChatResponse) {
  use id <- decode.field("id", decode.string)
  use object <- decode.field("object", decode.string)
  use created <- decode.field("created", decode.int)
  use model <- decode.field("model", decode.string)
  use choices <- decode.field("choices", decode.list(choice_decoder()))
  decode.success(ChatResponse(
    id: id,
    object: object,
    created: created,
    model: model,
    choices: choices,
  ))
}

pub fn chat(
  api_key api_key: String,
  req req: ChatRequest,
  base_url base_url: Option(String),
) -> Result(ChatResponse, OpenAIError) {
  let body = chat_request_to_json(req)
  let url = option.unwrap(base_url, "https://api.openai.com")

  let req_result =
    request.new()
    |> request.set_method(http.Post)
    |> request.set_host(url_to_host(url))
    |> request.set_path("/v1/chat/completions")
    |> request.set_header("authorization", "Bearer " <> api_key)
    |> request.set_header("content-type", "application/json")
    |> request.set_body(body)
    |> httpc.send

  case req_result {
    Ok(resp) -> {
      case resp.status {
        200 -> {
          json.parse(from: resp.body, using: chat_response_decoder())
          |> result.map_error(JsonError)
        }
        _ -> Error(ApiError(resp.status, resp.body))
      }
    }
    Error(e) -> Error(NetworkError(string_inspect(e)))
  }
}

pub fn chat_stream(
  api_key api_key: String,
  req req: ChatRequest,
  base_url base_url: Option(String),
  on_delta on_delta: fn(String) -> Nil,
) -> Result(Nil, OpenAIError) {
  let req = ChatRequest(..req, stream: Some(True))
  let body = chat_request_to_json(req)
  let url =
    option.unwrap(base_url, "https://api.openai.com") <> "/v1/chat/completions"

  let headers = [
    #("authorization", "Bearer " <> api_key),
    #("content-type", "application/json"),
  ]

  let callback = fn(chunk: BitArray) {
    case bit_array.to_string(chunk) {
      Ok(s) -> {
        s
        |> string.split("\n")
        |> list.each(fn(line) {
          let line = string.trim(line)
          case line {
            "data: [DONE]" -> Nil
            "data: " <> json_str -> {
              case json.parse(from: json_str, using: delta_decoder()) {
                Ok(content) -> on_delta(content)
                Error(_) -> Nil
              }
            }
            _ -> Nil
          }
        })
      }
      Error(_) -> Nil
    }
  }

  case do_stream_request(url, headers, body, callback) {
    Ok(Nil) -> Ok(Nil)
    Error(e) -> Error(NetworkError(string_inspect(e)))
  }
}

fn delta_decoder() -> decode.Decoder(String) {
  use choices <- decode.field(
    "choices",
    decode.list({
      use delta <- decode.field("delta", {
        use content <- decode.field("content", decode.string)
        decode.success(content)
      })
      decode.success(delta)
    }),
  )
  case choices {
    [first, ..] -> decode.success(first)
    [] -> decode.success("")
  }
}

@external(erlang, "mosaic_ffi", "stream_request")
fn do_stream_request(
  url: String,
  headers: List(#(String, String)),
  body: String,
  callback: fn(BitArray) -> Nil,
) -> Result(Nil, Dynamic)

fn url_to_host(url: String) -> String {
  case url {
    "https://" <> rest -> rest
    "http://" <> rest -> rest
    _ -> url
  }
}

@external(erlang, "mosaic_ffi", "string_inspect")
pub fn string_inspect(val: any) -> String
