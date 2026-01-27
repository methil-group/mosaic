import core/llm/llm
import core/llm/prompt
import core/tools/detect_tools
import core/tools/tool
import gleam/erlang/process
import gleam/list
import gleam/option.{None, Some}
import gleam/string
import mosaic_logger
import mosaic_open_ai.{type Message, Message}

pub type AgentEvent {
  Token(String)
  ToolStarted(name: String, parameters: String)
  ToolFinished(name: String, result: String)
  FinalAnswer(String)
}

pub fn run_agent(
  user_prompt: String,
  workspace: String,
  model_id: String,
) -> String {
  let reply_subject = process.new_subject()
  process.spawn(fn() {
    let assert Ok(_) =
      stream_agent(user_prompt, workspace, model_id, fn(event) {
        case event {
          FinalAnswer(answer) -> process.send(reply_subject, answer)
          _ -> Nil
        }
      })
    Nil
  })
  process.receive_forever(from: reply_subject)
}

pub fn stream_agent(
  user_prompt: String,
  workspace: String,
  model_id: String,
  on_event: fn(AgentEvent) -> Nil,
) -> Result(Nil, Nil) {
  let tools = tool.get_tools()

  let system_message =
    Message(
      role: "system",
      content: prompt.create_system_prompt(tools, workspace),
    )
  let user_message = Message(role: "user", content: user_prompt)

  reasoning_loop([system_message, user_message], tools, model_id, on_event)
  Ok(Nil)
}

fn reasoning_loop(
  messages: List(Message),
  tools: List(tool.Tool),
  model_id: String,
  on_event: fn(AgentEvent) -> Nil,
) -> Nil {
  case run_step(messages, model_id, on_event) {
    // Message
    StepResult(content, None) -> {
      mosaic_logger.info(
        "agent",
        "Final answer received: " <> string.slice(content, 0, 50) <> "...",
      )
      on_event(FinalAnswer(content))
      Nil
    }

    // Tool calling
    StepResult(content, Some(tool_call)) -> {
      mosaic_logger.info(
        "agent",
        "Step required tool: "
          <> tool_call.name
          <> " with parameters: "
          <> tool_call.parameters,
      )
      on_event(ToolStarted(tool_call.name, tool_call.parameters))
      let result =
        tool.execute_tool(tool_call.name, tool_call.parameters, tools)

      mosaic_logger.info(
        "agent",
        "Tool '" <> tool_call.name <> "' returned: " <> result,
      )
      on_event(ToolFinished(tool_call.name, result))

      let assistant_msg = Message(role: "assistant", content: content)
      let tool_result_msg =
        Message(
          role: "user",
          content: prompt.format_tool_result(tool_call.name, result),
        )

      reasoning_loop(
        list.append(messages, [assistant_msg, tool_result_msg]),
        tools,
        model_id,
        on_event,
      )
    }
  }
}

type StepResult {
  StepResult(content: String, tool_call: option.Option(detect_tools.FoundTool))
}

fn run_step(
  messages: List(Message),
  model_id: String,
  on_event: fn(AgentEvent) -> Nil,
) -> StepResult {
  log_full_prompt(messages)

  let reply_subject = process.new_subject()
  let manager_subject = process.new_subject()

  process.spawn(fn() {
    let subject = process.new_subject()
    process.send(manager_subject, subject)
    stream_manager(subject, "", reply_subject, on_event)
  })

  let manager = process.receive_forever(from: manager_subject)

  let _ =
    llm.llm_stream_chat(
      model: model_id,
      messages: messages,
      on_delta: fn(delta) {
        on_event(Token(delta))
        process.send(manager, delta)
      },
    )

  process.send(manager, "END_OF_STREAM")
  process.receive_forever(from: reply_subject)
}

fn log_full_prompt(messages: List(Message)) {
  mosaic_logger.info("agent", "--- FULL PROMPT SENT TO AI ---")
  list.each(messages, fn(m) {
    let content = case string.length(m.content) > 1000 {
      True -> string.slice(m.content, 0, 1000) <> "..."
      False -> m.content
    }
    mosaic_logger.info("agent", "Role: " <> m.role <> " | Content: " <> content)
  })
  mosaic_logger.info("agent", "------------------------------")
}

fn stream_manager(
  subject: process.Subject(String),
  accumulated: String,
  reply_to: process.Subject(StepResult),
  on_event: fn(AgentEvent) -> Nil,
) {
  case process.receive(subject, 300_000) {
    Ok("END_OF_STREAM") -> {
      process.send(reply_to, StepResult(accumulated, None))
    }
    Ok(delta) -> {
      let next_text = accumulated <> delta
      case detect_tools.detect_tool_call(next_text) {
        Some(tool_call) ->
          process.send(reply_to, StepResult(next_text, Some(tool_call)))
        None -> stream_manager(subject, next_text, reply_to, on_event)
      }
    }
    Error(_) -> {
      process.send(reply_to, StepResult("Error: Request timed out.", None))
    }
  }
}
