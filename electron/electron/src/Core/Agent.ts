import { Tool, getTools } from './Tools';
import { PromptBuilder } from './Prompt/PromptBuilder';
import { AbstractLLM, Message } from './Framework/AbstractLLM';

export interface AgentEvent {
  type: 'token' | 'tool_started' | 'tool_finished' | 'final_answer' | 'error';
  name?: string;
  parameters?: string;
  result?: string;
  data?: string;
  message?: string;
}

export class Agent {
  private messages: Message[] = [];
  private tools: Tool[];
  private stopped: boolean = false;

  constructor(
    private llm: AbstractLLM,
    private model: string,
    private workspace: string,
    private userName: string,
    private onEvent: (event: AgentEvent) => void
  ) {
    this.tools = getTools();
  }

  public stop(): void {
    this.stopped = true;
    console.log('[Agent] Stop requested');
  }

  async run(userPrompt: string, history: Message[] = [], persona?: string, signal?: AbortSignal): Promise<void> {
    const systemPrompt = PromptBuilder.createSystemPrompt(this.tools, this.workspace, this.userName, persona);
    this.messages = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: userPrompt }
    ];
    await this.reasoningLoop(signal);
    console.log('[Agent] Run finished');
  }

  private async reasoningLoop(signal?: AbortSignal): Promise<void> {
    console.log('[Agent v2] Starting reasoning loop');
    let loop = true;
    let toolRetryCount = 0;
    let totalSteps = 0;
    const maxSteps = 100;
    const maxToolRetries = 3;
    const accumulatedAssistantContent: string[] = [];
    let lastToolCallFingerprint = "";

    try {
      while (loop) {
        if (this.stopped || (signal && signal.aborted)) {
          console.log('[Agent v2] Loop stopped by user/signal');
          // No error event here, just finish
          break;
        }

        totalSteps++;
        if (totalSteps > maxSteps) {
          console.error('[Agent v2] Max steps reached, stopping.');
          this.onEvent({ type: 'error', message: 'Maximum reasoning steps exceeded.' });
          break;
        }

        const stepResult = await this.runStep(signal);
        const contentWithoutTool = stepResult.content.replace(/<tool_call>[\s\S]*?<\/tool_call>/g, '').trim();
        
        if (contentWithoutTool) {
          accumulatedAssistantContent.push(contentWithoutTool);
        }

        if (stepResult.toolCall) {
          const { name, parameters } = stepResult.toolCall;
          const currentFingerprint = `${name}:${JSON.stringify(parameters)}`;
          
          console.log(`[Agent v2] Step ${totalSteps} | Tool call: ${name}`, parameters);

          if (currentFingerprint === lastToolCallFingerprint) {
            console.warn(`[Agent v2] Detected repetitive tool call: ${name}`);
            this.messages.push({ 
              role: 'user', 
              content: `You just called '${name}' with the exact same parameters. If it didn't give you what you wanted, try a different approach or tool. Do not repeat the same call.` 
            });
            lastToolCallFingerprint = currentFingerprint;
            continue; 
          }
          lastToolCallFingerprint = currentFingerprint;

          this.onEvent({ type: 'tool_started', name, parameters: JSON.stringify(parameters) });
          
          const tool = this.tools.find((t) => t.name === name);
          if (tool) {
            try {
              const result = await tool.execute(parameters, this.workspace);
              this.onEvent({ type: 'tool_finished', name, result });
              
              // Push context to history
              if (contentWithoutTool) {
                this.messages.push({ role: 'assistant', content: contentWithoutTool });
              }
              // Push the tool result
              this.messages.push({ role: 'user', content: PromptBuilder.formatToolResult(name, result) });
              console.log(`[Agent v2] Tool finished: ${name}. Result length: ${result.length}`);
              toolRetryCount = 0; // Reset counter on success
            } catch (error: any) {
              console.error(`[Agent v2] Tool execution error: ${name}`, error.message);
              toolRetryCount++;
              
              if (toolRetryCount >= maxToolRetries) {
                this.onEvent({ type: 'error', message: `Too many tool failures. Last error: ${error.message}` });
                loop = false;
              } else {
                this.onEvent({ type: 'error', message: `Tool error: ${error.message}. Retrying...` });
                this.messages.push({ 
                  role: 'user', 
                  content: `Tool '${name}' failed with error: ${error.message}. Please check your parameters and try again or use a different approach.` 
                });
              }
            }
          } else {
            console.error(`[Agent v2] Tool not found: ${name}`);
            this.messages.push({ role: 'user', content: `Tool '${name}' not found. Please use one of the available tools.` });
            toolRetryCount++;
            if (toolRetryCount >= maxToolRetries) loop = false;
          }
        } else {
          // Check if this is an intent statement (LLM saying it will do something, but not doing it)
          const intentPhrases = [
            /now (i'll|i will|let me|i'm going to)/i,
            /let me (check|read|look|examine|explore|see)/i,
            /i (will|shall|am going to|need to) (check|read|look|examine|explore)/i,
          ];
          
          const isIntentStatement = intentPhrases.some(pattern => pattern.test(contentWithoutTool));
          
          if (isIntentStatement) {
            console.log('[Agent v2] Detected intent statement without tool call, nudging...');
            // Push the intent as assistant message
            this.messages.push({ role: 'assistant', content: contentWithoutTool });
            // Add a nudge to actually call the tool
            this.messages.push({ 
              role: 'user', 
              content: 'You said you would do something but didn\'t call a tool. Please call the appropriate tool now to complete the action you described.' 
            });
            // Continue the loop
          } else if (!contentWithoutTool || contentWithoutTool.length < 5) {
            // Empty or very short response - but maybe we already have content?
            if (accumulatedAssistantContent.length > 0) {
              const finalFullContent = Array.from(new Set(accumulatedAssistantContent)).join('\n\n');
              
              // If the total accumulation is very short (less than 50 chars) and we did multiple steps, 
              // nudge for a better summary
              if (finalFullContent.length < 50 && totalSteps > 2) {
                console.log('[Agent v2] Accumulated content too short, nudging for a real summary...');
                this.messages.push({ 
                  role: 'user', 
                  content: 'You have finished your exploration. Please provide a clear and comprehensive summary of what you found for the user.' 
                });
                continue;
              }

              console.log('[Agent v2] Finishing with accumulated content.');
              this.onEvent({ type: 'final_answer', data: finalFullContent });
              loop = false;
            } else {
              console.log('[Agent v2] Empty or too short response, nudging for answer...');
              this.messages.push({ 
                role: 'user', 
                content: 'Please provide a complete answer based on what you have learned, or call another tool.' 
              });
            }
          } else {
            console.log('[Agent v2] Final answer received');
            const finalFullContent = Array.from(new Set(accumulatedAssistantContent.concat([contentWithoutTool]))).join('\n\n');
            this.onEvent({ type: 'final_answer', data: finalFullContent });
            loop = false;
          }
        }
      }
    } catch (error: any) {
      if (error.message === 'Aborted') {
        console.log('[Agent] Reasoning loop aborted gracefully');
        return;
      }
      console.error('[Agent] Logic error in reasoning loop:', error);
      this.onEvent({ type: 'error', message: `Fatal error: ${error.message}` });
    }
  }

  private async runStep(signal?: AbortSignal): Promise<{ content: string; toolCall?: { name: string; parameters: any } }> {
    console.log('[Agent] Running step...');
    return new Promise((resolve, reject) => {
      let accumulated = "";
      let emittedLength = 0; // Track how much we've already emitted

      const onAbort = () => {
        console.log('[Agent] runStep aborted');
        reject(new Error('Aborted'));
      };
      
      if (signal) {
        if (signal.aborted) return reject(new Error('Aborted'));
        signal.addEventListener('abort', onAbort);
      }

      this.llm.streamChat(this.model, this.messages, {
        onToken: (token) => {
          if (this.stopped || (signal && signal.aborted)) return;

          accumulated += token;
          
          // Find the safe portion to emit (everything before any potential <tool_call>)
          const toolCallStart = accumulated.indexOf('<tool_call>');
          
          if (toolCallStart === -1) {
            // No tool call found yet - but be careful about partial matches
            // Check if the end of accumulated could be the start of <tool_call>
            let safeEnd = accumulated.length;
            const potentialStarts = ['<', '<t', '<to', '<too', '<tool', '<tool_', '<tool_c', '<tool_ca', '<tool_cal', '<tool_call'];
            
            for (const prefix of potentialStarts) {
              if (accumulated.endsWith(prefix)) {
                safeEnd = accumulated.length - prefix.length;
                break;
              }
            }
            
            // Emit the safe portion
            if (safeEnd > emittedLength) {
              const toEmit = accumulated.substring(emittedLength, safeEnd);
              this.onEvent({ type: 'token', data: toEmit });
              emittedLength = safeEnd;
            }
          } else if (toolCallStart > emittedLength) {
            // Tool call found - emit everything before it
            const toEmit = accumulated.substring(emittedLength, toolCallStart);
            if (toEmit) {
              this.onEvent({ type: 'token', data: toEmit });
            }
            emittedLength = accumulated.length; // Don't emit anything more
          } else {
            // We're inside a tool call, don't emit
            emittedLength = accumulated.length;
          }
        },
        onError: (error) => {
          if (signal) signal.removeEventListener('abort', onAbort);
          this.onEvent({ type: 'error', message: error });
          reject(new Error(error));
        },
        onComplete: (fullText) => {
          if (signal) signal.removeEventListener('abort', onAbort);
          const toolCall = this.parseToolCall(fullText);
          resolve({ content: fullText, toolCall });
        }
      }, signal);
    });
  }

  private parseToolCall(content: string): { name: string; parameters: any } | undefined {
    const match = content.match(/<tool_call>([\s\S]*?)<\/tool_call>/);
    if (!match) return undefined;

    const xml = match[1];
    const nameMatch = xml.match(/<name>(.*?)<\/name>/);
    const paramsMatch = xml.match(/<parameters>([\s\S]*?)<\/parameters>/);

    if (!nameMatch) return undefined;
    const name = nameMatch[1].trim();
    const parameters: any = {};

    if (paramsMatch) {
      const paramsXml = paramsMatch[1];
      const paramMatches = paramsXml.matchAll(/<(.*?)>([\s\S]*?)<\/\1>/g);
      for (const m of paramMatches) {
        parameters[m[1]] = m[2].trim();
      }
    }

    return { name, parameters };
  }
}
