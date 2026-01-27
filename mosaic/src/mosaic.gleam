import dot_env
import dot_env/env
import gleam/io
import gleam/option.{Some}
import mosaic_open_ai.{ChatRequest, Message}

pub fn main() {
  dot_env.load_default()

  let api_key = case env.get_string("OPENROUTER_API_KEY") {
    Ok(k) -> k
    Error(_) -> ""
  }

  case api_key {
    "" -> io.println("Please set OPENROUTER_API_KEY in .env file")
    _ -> {
      let req =
        ChatRequest(
          model: "deepseek/deepseek-v3.2",
          messages: [
            Message(role: "user", content: "Tell me a short joke about robots."),
          ],
          stream: Some(True),
        )

      io.println(
        "--- Streaming Chat (deepseek/deepseek-v3.2 via OpenRouter) ---",
      )
      case
        mosaic_open_ai.chat_stream(
          api_key: api_key,
          req: req,
          base_url: Some("https://openrouter.ai/api"),
          on_delta: fn(delta) { io.print(delta) },
        )
      {
        Ok(_) -> io.println("\n--- Stream Finished ---")
        Error(e) -> io.println("\nError: " <> mosaic_open_ai.string_inspect(e))
      }
    }
  }
}
