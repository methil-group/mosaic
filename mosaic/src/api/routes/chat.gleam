import ewe
import gleam/bit_array
import gleam/dynamic/decode
import gleam/http/response
import gleam/json
import llm/llm
import mosaic_logger

pub type ChatRequest {
  ChatRequest(prompt: String)
}

fn chat_request_decoder() -> decode.Decoder(ChatRequest) {
  use prompt <- decode.field("prompt", decode.string)
  decode.success(ChatRequest(prompt: prompt))
}

pub fn handle(req: ewe.Request) -> ewe.Response {
  mosaic_logger.info("api/chat", "Incoming request to /chat")
  case ewe.read_body(req, 10_000_000) {
    Ok(req_with_body) -> {
      case bit_array.to_string(req_with_body.body) {
        Ok(body_str) -> {
          case json.parse(from: body_str, using: chat_request_decoder()) {
            Ok(chat_req) -> {
              mosaic_logger.debug("api/chat", "Prompt: " <> chat_req.prompt)
              let result =
                llm.llm_chat(
                  model: "deepseek/deepseek-v3.2",
                  prompt: chat_req.prompt,
                  system_prompt: "You are a helpful assistant.",
                )

              case result {
                Ok(content) -> {
                  mosaic_logger.info(
                    "api/chat",
                    "LLM response received successfully",
                  )
                  response.new(200)
                  |> response.set_header("content-type", "application/json")
                  |> response.set_body(ewe.TextData(
                    json.object([#("response", json.string(content))])
                    |> json.to_string,
                  ))
                }
                Error(e) -> {
                  mosaic_logger.error(
                    "api/chat",
                    "LLM Error: " <> mosaic_logger.string_inspect(e),
                  )
                  response.new(500)
                  |> response.set_body(ewe.TextData(
                    "LLM Error: " <> mosaic_logger.string_inspect(e),
                  ))
                }
              }
            }
            Error(_) -> {
              mosaic_logger.warn("api/chat", "Invalid JSON body")
              response.new(400)
              |> response.set_body(ewe.TextData("Invalid JSON"))
            }
          }
        }
        Error(_) -> {
          mosaic_logger.warn("api/chat", "Invalid UTF-8 body")
          response.new(400)
          |> response.set_body(ewe.TextData("Invalid UTF-8 body"))
        }
      }
    }
    Error(_) -> {
      mosaic_logger.error("api/chat", "Failed to read body")
      response.new(400)
      |> response.set_body(ewe.TextData("Failed to read body"))
    }
  }
}
