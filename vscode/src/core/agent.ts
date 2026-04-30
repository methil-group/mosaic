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
  type: "token" | "usage" | "error" | "log" | "tool_started" | "tool_finished" | "final_answer" | "full_prompt";
  data?: any;
  message?: string;
  name?: string;
  parameters?: any;
  result?: any;
  call_id?: string;
}

export interface ModelPricing {
  prompt: number;     // USD per 1M tokens
  completion: number; // USD per 1M tokens
}

export interface ModelInfo {
  id: string;
  name?: string;
  pricing?: ModelPricing;
}

export interface LlmProvider {
  streamChat(model: string, messages: Message[]): AsyncIterable<StreamEvent>;
  fetchModels(): Promise<ModelInfo[]>;
  getPricing(model: string): ModelPricing | undefined;
}

export class Agent {
  private messages: Message[] = [];
  private stopped = false;
  private modifiedFiles: Set<string> = new Set();

  constructor(
    private llm: LlmProvider,
    private model: string,
    private workspaceName: string,
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
      this.workspaceName,
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
    let emptyRetries = 0;
    let consecutiveNudges = 0;
    const maxEmptyRetries = 5;
    const maxConsecutiveNudges = 3;
    
    while (!this.stopped) {
      totalSteps++;
      const lastMsg = this.messages[this.messages.length - 1];
      await onEvent({ type: "log", message: `[Agent] Step ${totalSteps} | Last message: ${lastMsg.role} (${lastMsg.content.length} chars)` });
      
      // Log full history to log file via SessionManager (onEvent log type)
      const historySummary = this.messages.map(m => `[${m.role.toUpperCase()}] ${m.content.substring(0, 500)}${m.content.length > 500 ? '...' : ''}`).join('\n---\n');
      await onEvent({ type: "log", message: `[Agent] FULL CONTEXT SENT TO MODEL:\n${historySummary}` });
      await onEvent({ type: "full_prompt", data: this.messages });

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

      const { toolCall, error: parseError } = ToolCallParser.parse(fullText);
      
      // If tool_call tags are present but parsing failed, inform the LLM and retry
      if (!toolCall && (fullText.includes("<tool_call") || fullText.includes("<<<tool_call"))) {
        const displayError = parseError ? `Parsing error: ${parseError}` : "Unknown parsing error";
        await onEvent({ type: "log", message: `[Agent] Malformed tool call detected. ${displayError}` });
        
        // Log full malformed response for debugging
        await onEvent({ type: "log", message: `[Agent] FULL MALFORMED RESPONSE:\n${fullText}` });

        // Truncate huge malformed responses to avoid context bloat
        let historyContent = fullText;
        if (fullText.length > 5000) {
          const thoughtRegex = /<thought>([\s\S]*?)<\/thought>/;
          const thoughtMatch = fullText.match(thoughtRegex);
          const thought = thoughtMatch ? thoughtMatch[0] : "";
          historyContent = `${thought}\n\n<tool_call>\n... [TRUNCATED DUE TO SIZE: ${fullText.length} chars] ...\n</tool_call>`;
        }

        this.messages.push({ role: "assistant", content: historyContent });
        
        const nudge = `❌ Malformed tool call detected. ${displayError}.
Please ensure your tool call is a valid JSON object wrapped in <tool_call> tags.
- Use DOUBLE QUOTES for all keys and string values.
- Escape all backslashes and double quotes inside string values (e.g. \\" and \\\\).
- Do not include trailing commas.
- If you are writing a large file, double check the JSON escaping or use 'run_command' with 'cat' and a HEREDOC if appropriate.

Example: <tool_call>{"name": "tool_name", "arguments": {"param": "value"}}</tool_call>`;

        this.messages.push({ 
          role: "user", 
          content: nudge
        });

        // Emit events so the UI knows about the failure and the nudge
        await onEvent({ type: "log", message: `[Agent] Added malformed assistant response to history.` });
        await onEvent({ type: "log", message: `[Agent] Internal User Nudge: ${nudge}` });
        
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
        const toolStartTime = Date.now();
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
        const toolDuration = Date.now() - toolStartTime;

        await onEvent({
          type: "tool_finished",
          name: toolCall.name,
          result: result,
          call_id: callId,
          parameters: { duration: toolDuration } // Pass duration back
        });
        await onEvent({ type: "log", message: `Tool ${toolCall.name} finished. Result length: ${typeof result === 'string' ? result.length : 'N/A'}` });

        // Inject the generated callId into the tool_call tag so the history is consistent
        const callIdTag = ` id="${callId}"`;
        const updatedFullText = fullText.replace('<tool_call>', `<tool_call${callIdTag}>`);
        
        this.messages.push({ role: "assistant", content: updatedFullText });
        this.messages.push({
          role: "user",
          content: PromptBuilder.formatToolResult(toolCall.name, result, callId)
        });
        consecutiveNudges = 0; // Reset on tool call
      } else {
        // Strip all thinking/thought content to check what's left
        const thoughtRegex = /<(?:thought|thinking)>[\s\S]*?<\/(?:thought|thinking)>/g;
        const textWithoutThoughts = fullText.replace(thoughtRegex, '').trim();
        
        // Case 1: Completely empty response — silent retry without polluting history
        if (fullText.trim().length === 0) {
          emptyRetries++;
          if (emptyRetries >= maxEmptyRetries) {
            await onEvent({ type: "error", message: `LLM returned empty responses ${maxEmptyRetries} times. Stopping.` });
            break;
          }
          await onEvent({ type: "log", message: `[Agent] Empty response from LLM. Retrying silently (${emptyRetries}/${maxEmptyRetries})...` });
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }

        // Case 2: Only thoughts, no action or text — retry without adding nudge to history
        if (textWithoutThoughts.length === 0) {
          emptyRetries++;
          if (emptyRetries >= maxEmptyRetries) {
            await onEvent({ type: "error", message: `LLM returned only thoughts ${maxEmptyRetries} times. Stopping.` });
            break;
          }
          await onEvent({ type: "log", message: `[Agent] LLM only provided thoughts without action. Retrying silently (${emptyRetries}/${maxEmptyRetries})...` });
          // Don't push to history — just retry as if nothing happened
          await new Promise(resolve => setTimeout(resolve, 500));
          continue;
        }

        // Case 3: Task explicitly finished
        if (fullText.includes('<task_finished')) {
          await onEvent({ type: "log", message: "[Agent] Task finished tag detected. Stopping loop." });
          await onEvent({ 
            type: "final_answer", 
            data: fullText,
            parameters: { modifiedFiles: Array.from(this.modifiedFiles) }
          });
          break;
        }

        // Case 4: LLM responded with actual content but no <task_finished />
        // If we haven't nudged too many times, try to encourage it to continue.
        if (consecutiveNudges < maxConsecutiveNudges) {
          consecutiveNudges++;
          await onEvent({ type: "log", message: `[Agent] LLM responded with content but no <task_finished />. Nudging (${consecutiveNudges}/${maxConsecutiveNudges})...` });
          
          this.messages.push({ role: "assistant", content: fullText });
          const nudge = "You provided a response but did not include the <task_finished /> tag and did not call any tool. If you are finished, please provide a final summary and include <task_finished />. If you have more work to do, please proceed with the next step or tool call.";
          this.messages.push({ role: "user", content: nudge });
          
          continue;
        }

        // Only treat as final answer after exceeding max nudges
        await onEvent({ type: "log", message: `[Agent] Exceeded max nudges without task completion tag. Treating as final answer.` });
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
