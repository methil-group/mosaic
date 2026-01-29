import ewe
import gleam/http/response
import gleam/json
import mosaic_logger

pub fn handle(req: ewe.Request) -> ewe.Response {
  mosaic_logger.info("api/providers", "Incoming request to /providers")

  // Currently only supporting OpenRouter as requested
  let providers = ["OpenRouter"]

  response.new(200)
  |> response.set_header("content-type", "application/json")
  |> response.set_body(ewe.TextData(
    json.object([#("providers", json.array(providers, of: json.string))])
    |> json.to_string,
  ))
}
