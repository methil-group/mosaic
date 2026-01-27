import core/llm/llm
import dot_env
import gleam/string
import gleeunit/should
import mosaic_logger

pub fn llm_chat_test() {
  dot_env.load_default()

  // We use the model specified by the user
  let model = "liquid/lfm-2.2-6b"
  let prompt = "Please respond with exactly one word: 'Success'."
  let system_prompt = "You are a helpful assistant."

  let result = llm.llm_chat(model, prompt, system_prompt)

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
