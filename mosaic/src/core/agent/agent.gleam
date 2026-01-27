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

pub fn run_agent(
  user_prompt: String,
  workspace: String,
  model_id: String,
) -> String {
  let tools = tool.get_tools()

  let system_message =
    Message(
      role: "system",
      content: prompt.create_system_prompt(tools, workspace),
    )
  let user_message = Message(role: "user", content: user_prompt)

  reasoning_loop([system_message, user_message], tools, model_id)
}

fn reasoning_loop(
  messages: List(Message),
  tools: List(tool.Tool),
  model_id: String,
) -> String {
  case run_step(messages, model_id) {
    // Message
    StepResult(content, None) -> {
      mosaic_logger.info(
        "agent",
        "Final answer received: " <> string.slice(content, 0, 50) <> "...",
      )
      content
    }

    // Tool calling
    StepResult(content, Some(tool_call)) -> {
      mosaic_logger.info("agent", "Step required tool: " <> tool_call.name)
      let result =
        tool.execute_tool(tool_call.name, tool_call.parameters, tools)

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
      )
    }
  }
}

type StepResult {
  StepResult(content: String, tool_call: option.Option(detect_tools.FoundTool))
}

fn run_step(messages: List(Message), model_id: String) -> StepResult {
  let reply_subject = process.new_subject()
  let manager_subject = process.new_subject()

  process.spawn(fn() {
    let subject = process.new_subject()
    process.send(manager_subject, subject)
    stream_manager(subject, "", reply_subject)
  })

  let manager = process.receive_forever(from: manager_subject)

  let _ =
    llm.llm_stream_chat(
      model: model_id,
      messages: messages,
      on_delta: fn(delta) { process.send(manager, delta) },
    )

  process.send(manager, "END_OF_STREAM")
  process.receive_forever(from: reply_subject)
}

fn stream_manager(
  subject: process.Subject(String),
  accumulated: String,
  reply_to: process.Subject(StepResult),
) {
  case process.receive(subject, 15_000) {
    Ok("END_OF_STREAM") -> {
      process.send(reply_to, StepResult(accumulated, None))
    }
    Ok(delta) -> {
      let next_text = accumulated <> delta
      case detect_tools.detect_tool_call(next_text) {
        Some(tool_call) ->
          process.send(reply_to, StepResult(next_text, Some(tool_call)))
        None -> stream_manager(subject, next_text, reply_to)
      }
    }
    Error(_) -> {
      process.send(reply_to, StepResult("Error: Request timed out.", None))
    }
  }
}
