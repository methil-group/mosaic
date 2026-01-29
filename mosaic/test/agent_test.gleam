import core/agent/agent
import dot_env
import gleeunit/should
import mosaic_logger

@external(erlang, "agent_test_ffi", "get_cwd")
fn get_cwd() -> String

pub fn run_agent_test() {
  dot_env.load_default()

  let prompt = "what is the purpose of this project"
  mosaic_logger.info(
    "agent_test",
    "Running agent on workspace : " <> get_cwd() <> " with prompt: " <> prompt,
  )

  let answer = agent.run_agent(prompt, get_cwd(), "deepseek/deepseek-v3.2")

  mosaic_logger.info("agent_test", "Agent response: " <> answer)

  answer |> should.not_equal("Error")
}
