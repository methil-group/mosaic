import ewe
import gleam/bit_array
import gleam/dynamic/decode
import gleam/http/response
import gleam/json
import mosaic_logger

pub type FilesRequest {
  FilesRequest(path: String)
}

fn files_request_decoder() -> decode.Decoder(FilesRequest) {
  use path <- decode.field("path", decode.string)
  decode.success(FilesRequest(path:))
}

pub fn handle(req: ewe.Request) -> ewe.Response {
  mosaic_logger.info("api/files", "Incoming request to /files")

  case ewe.read_body(req, 1_000_000) {
    Ok(req_with_body) -> {
      case bit_array.to_string(req_with_body.body) {
        Ok(body_str) -> {
          case json.parse(from: body_str, using: files_request_decoder()) {
            Ok(files_req) -> {
              let files = do_list_files(files_req.path)
              response.new(200)
              |> response.set_header("content-type", "application/json")
              |> response.set_body(ewe.TextData(
                json.object([
                  #("files", json.array(files, of: json.string)),
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

@external(erlang, "mosaic_tools_ffi", "list_files")
fn do_list_files(path: String) -> List(String)
