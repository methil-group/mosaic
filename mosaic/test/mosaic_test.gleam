import gleam/option.{None}
import gleeunit
import gleeunit/should
import mosaic_open_ai.{ChatRequest, Message}

pub fn main() {
  gleeunit.main()
}

pub fn chat_request_json_test() {
  let req =
    ChatRequest(
      model: "test-model",
      messages: [Message(role: "user", content: "Hi")],
      stream: None,
    )

  mosaic_open_ai.chat_request_to_json(req)
  |> should.equal(
    "{\"model\":\"test-model\",\"messages\":[{\"role\":\"user\",\"content\":\"Hi\"}],\"stream\":null}",
  )
}
