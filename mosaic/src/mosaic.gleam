import dot_env
import ffi/utils
import gleam/io
import llm/llm

pub fn main() {
  dot_env.load_default()

  io.println("--- Streaming Chat (via llm abstraction) ---")

  let result =
    llm.llm_stream_chat(
      model: "deepseek/deepseek-v3.2",
      prompt: "Tell me a short joke about robots.",
      system_prompt: "You are a funny assistant.",
      on_delta: fn(delta) { io.print(delta) },
    )

  case result {
    Ok(_) -> io.println("\n--- Stream Finished ---")
    Error(e) -> io.println("\nError: " <> utils.string_inspect(e))
  }
}
