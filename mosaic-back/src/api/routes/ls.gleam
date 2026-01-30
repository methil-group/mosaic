import ewe
import gleam/bit_array
import gleam/dynamic/decode
import gleam/http/response
import gleam/json
import mosaic_logger

pub type LsRequest {
  LsRequest(path: String)
}

fn ls_request_decoder() -> decode.Decoder(LsRequest) {
  use path <- decode.field("path", decode.string)
  decode.success(LsRequest(path:))
}

pub fn handle(req: ewe.Request) -> ewe.Response {
  mosaic_logger.info("api/ls", "Incoming request to /ls")

  case ewe.read_body(req, 1_000_000) {
    Ok(req_with_body) -> {
      case bit_array.to_string(req_with_body.body) {
        Ok(body_str) -> {
          case json.parse(from: body_str, using: ls_request_decoder()) {
            Ok(ls_req) -> {
              let dirs = do_list_directories(ls_req.path)
              response.new(200)
              |> response.set_header("content-type", "application/json")
              |> response.set_body(ewe.TextData(
                json.object([
                  #("directories", json.array(dirs, of: json.string)),
                ])
                |> json.to_string,
              ))
            }
            Error(_) -> {
              response.new(400)
              |> response.set_body(ewe.TextData("Invalid JSON"))
            }
          }
        }
        Error(_) -> {
          response.new(400) |> response.set_body(ewe.TextData("Invalid UTF-8"))
        }
      }
    }
    Error(_) -> {
      response.new(400)
      |> response.set_body(ewe.TextData("Failed to read body"))
    }
  }
}

@external(erlang, "mosaic_tools_ffi", "list_directories")
fn do_list_directories(path: String) -> List(String)
