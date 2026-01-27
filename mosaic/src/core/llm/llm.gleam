import dot_env/env
import gleam/option.{Some}
import mosaic_open_ai.{type OpenAIError, ChatRequest, Message}

pub fn llm_stream_chat(
  model model: String,
  prompt prompt: String,
  system_prompt system_prompt: String,
  on_delta on_delta: fn(String) -> Nil,
) -> Result(Nil, OpenAIError) {
  let api_key = get_api_key()

  let req =
    ChatRequest(
      model: model,
      messages: [
        Message(role: "system", content: system_prompt),
        Message(role: "user", content: prompt),
      ],
      stream: Some(True),
    )

  mosaic_open_ai.chat_stream(
    api_key: api_key,
    req: req,
    base_url: Some("https://openrouter.ai/api"),
    on_delta: on_delta,
  )
}

pub fn llm_chat(
  model model: String,
  prompt prompt: String,
  system_prompt system_prompt: String,
) -> Result(String, OpenAIError) {
  let api_key = get_api_key()

  let req =
    ChatRequest(
      model: model,
      messages: [
        Message(role: "system", content: system_prompt),
        Message(role: "user", content: prompt),
      ],
      stream: Some(False),
    )

  case
    mosaic_open_ai.chat(
      api_key: api_key,
      req: req,
      base_url: Some("https://openrouter.ai/api"),
    )
  {
    Ok(resp) -> {
      case resp.choices {
        [choice, ..] -> Ok(choice.message.content)
        [] -> Ok("")
      }
    }
    Error(e) -> Error(e)
  }
}

fn get_api_key() -> String {
  case env.get_string("OPENROUTER_API_KEY") {
    Ok(k) -> k
    Error(_) -> ""
  }
}
