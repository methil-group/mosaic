import core/llm/llm

pub fn run_agent(prompt: String) {
  let result =
    llm.llm_chat("liquid/lfm-2.2-6b", prompt, "You are a helpful assistant.")

  case result {
    Ok(answer) -> answer
    Error(_) -> "Error"
  }
}
