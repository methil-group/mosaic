import { Tool } from "./tools/base";
import { ToolCallParser } from "./parser";
import { PromptBuilder } from "./prompt";
import { v4 as uuidv4 } from "uuid";

export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface StreamEvent {
  type: "token" | "usage" | "error" | "tool_started" | "tool_finished" | "final_answer";
  data?: any;
  message?: string;
  name?: string;
  parameters?: any;
  result?: any;
  call_id?: string;
}

export interface LlmProvider {
  streamChat(model: string, messages: Message[]): AsyncIterable<StreamEvent>;
}

export class Agent {
  private messages: Message[] = [];
  private stopped = false;

  constructor(
    private llm: LlmProvider,
    private model: string,
    private workspace: string,
    private userName: string,
    private tools: Tool[],
    initialMessages: Message[] = []
  ) {
    this.messages = initialMessages;
  }

  async run(userPrompt: string, onEvent: (event: StreamEvent) => Promise<void>) {
    const systemPrompt = PromptBuilder.createSystemPrompt(
      this.tools.map(t => ({ name: t.name(), description: t.description() })),
      this.workspace,
      this.userName
    );

    // Ensure system prompt is at the start
    if (this.messages.length === 0 || this.messages[0].role !== "system") {
      this.messages.unshift({ role: "system", content: systemPrompt });
    } else {
      // Update system prompt if it exists (in case workspace/tools changed, though unlikely here)
      this.messages[0].content = systemPrompt;
    }
    
    // Add user prompt if it's not already the last message
    const lastMessage = this.messages[this.messages.length - 1];
    if (!lastMessage || lastMessage.role !== "user" || lastMessage.content !== userPrompt) {
      this.messages.push({ role: "user", content: userPrompt });
    }

    await this.reasoningLoop(onEvent);
  }

  private async reasoningLoop(onEvent: (event: StreamEvent) => Promise<void>) {
    let totalSteps = 0;
    
    while (!this.stopped) {
      totalSteps++;
      if (totalSteps > 50) {
        await onEvent({ type: "error", message: "Max steps reached" });
        break;
      }

      let fullText = "";
      let isSuppressing = false;
      let retries = 0;
      const maxRetries = 3;
      let success = false;

      while (retries < maxRetries && !success) {
        try {
          fullText = ""; // Reset for fresh attempt
          isSuppressing = false;
          
          for await (const event of this.llm.streamChat(this.model, this.messages)) {
            if (this.stopped) break;

            if (event.type === "token") {
              fullText += event.data;
              
              if (fullText.includes("<tool_call")) {
                isSuppressing = true;
              }

              if (!isSuppressing) {
                await onEvent(event);
              }
            } else if (event.type === "usage") {
              await onEvent(event);
            } else if (event.type === "error") {
              throw new Error(event.message || "Unknown provider error");
            }
          }
          success = true;
        } catch (e: any) {
          retries++;
          if (retries >= maxRetries) {
            await onEvent({ type: "error", message: `Failed after ${maxRetries} attempts: ${e.message}` });
            return;
          }
          // Short delay before retry
          await new Promise(resolve => setTimeout(resolve, 1500));
          console.log(`Retrying LLM call (attempt ${retries + 1}/${maxRetries})... Error: ${e.message}`);
        }
      }

      let toolCall;
      try {
        toolCall = ToolCallParser.parse(fullText);
      } catch (e: any) {
        // If parsing fails, inform the LLM and retry the loop
        this.messages.push({ role: "assistant", content: fullText });
        this.messages.push({ 
          role: "user", 
          content: `❌ ${e.message}\nPlease retry with a valid JSON object inside the <tool_call> tags.`
        });
        continue;
      }

      if (toolCall) {
        const callId = `toolu-${uuidv4().substring(0, 12)}`;
        await onEvent({
          type: "tool_started",
          name: toolCall.name,
          parameters: toolCall.arguments,
          call_id: callId
        });

        const tool = this.tools.find(t => t.name() === toolCall.name);
        let result: any;
        if (tool) {
          try {
            result = await tool.execute(toolCall.arguments);
          } catch (e: any) {
            result = `Error: ${e.message}`;
          }
        } else {
          result = `Error: Tool '${toolCall.name}' not found`;
        }

        await onEvent({
          type: "tool_finished",
          name: toolCall.name,
          result: result,
          call_id: callId
        });

        this.messages.push({ role: "assistant", content: fullText });
        this.messages.push({
          role: "user",
          content: PromptBuilder.formatToolResult(toolCall.name, result, callId)
        });
      } else {
        await onEvent({ type: "final_answer", data: fullText });
        break;
      }
    }
  }

  stop() {
    this.stopped = true;
  }
}
