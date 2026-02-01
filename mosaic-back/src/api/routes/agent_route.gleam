import core/agent/agent
import ewe
import gleam/bit_array
import gleam/dynamic/decode
import gleam/http/response
import gleam/json
import mosaic_logger

pub type AgentRequest {
  AgentRequest(
    user_prompt: String,
    workspace: String,
    model_id: String,
    user_name: String,
  )
}

fn agent_request_decoder() -> decode.Decoder(AgentRequest) {
  use user_prompt <- decode.field("user_prompt", decode.string)
  use workspace <- decode.field("workspace", decode.string)
  use model_id <- decode.field("model_id", decode.string)
  use user_name <- decode.field("user_name", decode.string)
  decode.success(AgentRequest(user_prompt:, workspace:, model_id:, user_name:))
}

pub fn handle(req: ewe.Request) -> ewe.Response {
  mosaic_logger.info("api/agent", "Incoming request to /agent")

  case ewe.read_body(req, 10_000_000) {
    Ok(req_with_body) -> {
      case bit_array.to_string(req_with_body.body) {
        Ok(body_str) -> {
          case json.parse(from: body_str, using: agent_request_decoder()) {
            Ok(agent_req) -> {
              ewe.sse(
                req,
                on_init: fn(subject) {
                  // Run agent in a separate process to avoid blocking the SSE handler
                  process.spawn(fn() {
                    agent.stream_agent(
                      agent_req.user_prompt,
                      agent_req.workspace,
                      agent_req.model_id,
                      agent_req.user_name,
                      fn(event) { process.send(subject, event) },
                    )
                  })
                  Nil
                },
                handler: handle_agent_event,
                on_close: fn(_, _) { Nil },
              )
            }
            Error(_) -> {
              response.new(400)
              |> response.set_body(ewe.TextData("Invalid JSON"))
            }
          }
        }
        Error(_) -> {
          response.new(400) |> response.set_body(ewe.TextData("Invalid UTF-8"))
        }
      }
    }
    Error(_) -> {
      response.new(400)
      |> response.set_body(ewe.TextData("Failed to read body"))
    }
  }
}

fn handle_agent_event(
  conn: ewe.SSEConnection,
  state: Nil,
  event: agent.AgentEvent,
) -> ewe.SSENext(Nil) {
  let event_json = case event {
    agent.Token(t) ->
      json.object([#("type", json.string("token")), #("data", json.string(t))])
    agent.ToolStarted(n, p) ->
      json.object([
        #("type", json.string("tool_started")),
        #("name", json.string(n)),
        #("parameters", json.string(p)),
      ])
    agent.ToolFinished(n, r) ->
      json.object([
        #("type", json.string("tool_finished")),
        #("name", json.string(n)),
        #("result", json.string(r)),
      ])
    agent.FinalAnswer(a) ->
      json.object([
        #("type", json.string("final_answer")),
        #("data", json.string(a)),
      ])
  }

  let sse_event = ewe.event(json.to_string(event_json))
  let _ = ewe.send_event(conn, sse_event)

  case event {
    agent.FinalAnswer(_) -> ewe.sse_stop()
    _ -> ewe.sse_continue(state)
  }
}

import gleam/erlang/process
