import api/types/provider.{Model, Provider}
import ewe
import gleam/http/response
import gleam/json
import mosaic_logger

pub fn handle(_req: ewe.Request) -> ewe.Response {
  mosaic_logger.info("api/providers", "Incoming request to /providers")

  // Define OpenRouter provider with its models
  let openrouter =
    Provider(id: "openrouter", name: "OpenRouter", models: [
      Model(id: "deepseek/deepseek-v3.2", name: "DeepSeek 3.2"),
      Model(id: "mistralai/devstral-2512", name: "Devstral 2512"),
    ])

  let providers = [openrouter]

  response.new(200)
  |> response.set_header("content-type", "application/json")
  |> response.set_body(ewe.TextData(
    json.object([
      #("providers", json.array(providers, of: provider.provider_to_json)),
    ])
    |> json.to_string,
  ))
}
