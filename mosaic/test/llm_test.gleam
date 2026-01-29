import core/llm/llm
import dot_env
import gleam/string
import gleeunit/should
import mosaic_logger
import mosaic_open_ai

pub fn llm_chat_integration() {
  dot_env.load_default()

  // We use the model specified by the user
  let model = "deepseek/deepseek-v3.2"
  let prompt = "Please respond with exactly one word: 'Success'."

  let result =
    llm.llm_chat(model: model, messages: [
      mosaic_open_ai.Message(
        role: "system",
        content: "You are a helpful assistant.",
      ),
      mosaic_open_ai.Message(role: "user", content: prompt),
    ])

  case result {
    Ok(answer) -> {
      mosaic_logger.info("llm_test", "Received answer: " <> answer)
      string.contains(answer, "Success") |> should.be_true()
    }
    Error(e) -> {
      mosaic_logger.error("llm_test", "LLM chat failed: " <> string.inspect(e))
      panic as "LLM chat failed"
    }
  }
}
