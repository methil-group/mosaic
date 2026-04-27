import { Tool } from "./tools/base";
import { ToolCallParser } from "./parser";
import { PromptBuilder } from "./prompt";
import { v4 as uuidv4 } from "uuid";

export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
  metadata?: any;
}

export interface StreamEvent {
  type: "token" | "usage" | "error" | "log" | "tool_started" | "tool_finished" | "final_answer";
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
  private modifiedFiles: Set<string> = new Set();

  constructor(
    private llm: LlmProvider,
    private model: string,
    private workspace: string,
    private userName: string,
    private tools: Tool[],
    initialMessages: any[] = []
  ) {
    this.messages = initialMessages.map(m => ({
      role: m.role,
      content: typeof m.content === 'string' ? m.content : this._partsToString(m.content),
      metadata: m.metadata
    }));
  }

  private _partsToString(parts: any[]): string {
    return parts.map(p => p.content).join('\n');
  }

  async run(userPrompt: string, onEvent: (event: StreamEvent) => Promise<void>) {
    const systemPrompt = PromptBuilder.createSystemPrompt(
      this.tools.map(t => ({ name: t.name(), description: t.description(), schema: t.schema() })),
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
      const lastMsg = this.messages[this.messages.length - 1];
      await onEvent({ type: "log", message: `[Agent] Step ${totalSteps} | Last message: ${lastMsg.role} (${lastMsg.content.length} chars)` });
      
      // Log full history to log file via SessionManager (onEvent log type)
      const historySummary = this.messages.map(m => `[${m.role.toUpperCase()}] ${m.content.substring(0, 500)}${m.content.length > 500 ? '...' : ''}`).join('\n---\n');
      await onEvent({ type: "log", message: `[Agent] FULL CONTEXT SENT TO MODEL:\n${historySummary}` });

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
              
              if (fullText.includes("<tool_call") || /<tool?\s*$/.test(fullText)) {
                if (!isSuppressing) {
                  await onEvent({ type: "log", message: "[Agent] Tool call detected, suppressing tokens from UI." });
                }
                isSuppressing = true;
              }

              if (!isSuppressing) {
                await onEvent(event);
              }
            } else if (event.type === "usage") {
              await onEvent(event);
            } else if (event.type === "log") {
              await onEvent(event);
            } else if (event.type === "error") {
              throw new Error(event.message || "Unknown provider error");
            }
          }

          // Check for very short or malformed response (streaming artifacts)
          const trimmed = fullText.trim();
          if (trimmed.length > 0 && (trimmed.length < 6 || trimmed === "<" || trimmed === "<<" || trimmed === "<<<")) {
             throw new Error(`Response too short or contains only artifacts: "${trimmed}"`);
          }

          success = true;
        } catch (e: any) {
          retries++;
          if (retries >= maxRetries) {
            await onEvent({ type: "error", message: `Failed after ${maxRetries} attempts: ${e.message}` });
            return;
          }
          // Wait 5 seconds before retry as requested
          await onEvent({ type: "log", message: `[Agent] Attempt ${retries} failed or was too short. Waiting 5s before retry ${retries + 1}/${maxRetries}... (${e.message})` });
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }

      await onEvent({ type: "log", message: `[Agent] RAW LLM RESPONSE (Turn ${totalSteps}):\n${fullText}` });

      const toolCall = ToolCallParser.parse(fullText);
      
      // If tool_call tags are present but parsing failed, inform the LLM and retry
      if (!toolCall && (fullText.includes("<tool_call") || fullText.includes("<<<tool_call"))) {
        await onEvent({ type: "log", message: `[Agent] Malformed tool call detected. FULL RAW CONTENT:\n${fullText}` });
        
        this.messages.push({ role: "assistant", content: fullText });
        this.messages.push({ 
          role: "user", 
          content: `❌ Malformed tool call detected. Please ensure your tool call is a valid JSON object wrapped in <tool_call> tags, using DOUBLE QUOTES for keys and string values.
Example: <tool_call>{"name": "tool_name", "arguments": {"param": "value"}}</tool_call>`
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
        await onEvent({ type: "log", message: `Executing tool: ${toolCall.name} with arguments: ${JSON.stringify(toolCall.arguments)}` });

        const tool = this.tools.find(t => t.name() === toolCall.name);
        let result: any;
        if (tool) {
          try {
            result = await tool.execute(toolCall.arguments);
            if (['write_file', 'edit_file'].includes(toolCall.name) && toolCall.arguments.path) {
              this.modifiedFiles.add(toolCall.arguments.path);
            }
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
        await onEvent({ type: "log", message: `Tool ${toolCall.name} finished. Result length: ${typeof result === 'string' ? result.length : 'N/A'}` });

        this.messages.push({ role: "assistant", content: fullText });
        this.messages.push({
          role: "user",
          content: PromptBuilder.formatToolResult(toolCall.name, result, callId)
        });
      } else {
        await onEvent({ 
          type: "final_answer", 
          data: fullText,
          parameters: { modifiedFiles: Array.from(this.modifiedFiles) }
        });
        break;
      }
    }
  }

  stop() {
    this.stopped = true;
  }
}
