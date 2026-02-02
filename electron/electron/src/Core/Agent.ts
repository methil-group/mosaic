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

  constructor(
    private llm: AbstractLLM,
    private model: string,
    private workspace: string,
    private userName: string,
    private onEvent: (event: AgentEvent) => void
  ) {
    this.tools = getTools();
  }

  async run(userPrompt: string): Promise<void> {
    const systemPrompt = PromptBuilder.createSystemPrompt(this.tools, this.workspace, this.userName);
    this.messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];
    await this.reasoningLoop();
    console.log('[Agent] Run finished');
  }

  private async reasoningLoop(): Promise<void> {
    console.log('[Agent] Starting reasoning loop');
    let loop = true;
    try {
      while (loop) {
        const stepResult = await this.runStep();
        const contentWithoutTool = stepResult.content.replace(/<tool_call>[\s\S]*?<\/tool_call>/g, '').trim();

        if (stepResult.toolCall) {
          const { name, parameters } = stepResult.toolCall;
          console.log(`[Agent] Tool call: ${name}`, parameters);
          this.onEvent({ type: 'tool_started', name, parameters: JSON.stringify(parameters) });
          
          const tool = this.tools.find((t) => t.name === name);
          if (tool) {
            try {
              const result = await tool.execute(parameters, this.workspace);
              this.onEvent({ type: 'tool_finished', name, result });
              
              // Push the thought/talk part to history without the XML
              if (contentWithoutTool) {
                this.messages.push({ role: 'assistant', content: contentWithoutTool });
              }
              // Push the tool result
              this.messages.push({ role: 'user', content: PromptBuilder.formatToolResult(name, result) });
              console.log(`[Agent] Tool finished: ${name}`);
            } catch (error: any) {
              console.error(`[Agent] Tool error: ${name}`, error.message);
              this.onEvent({ type: 'error', message: `Tool execution failed: ${error.message}` });
              loop = false;
            }
          } else {
            this.onEvent({ type: 'error', message: `Tool ${name} not found` });
            loop = false;
          }
        } else {
          console.log('[Agent] Final answer received');
          this.onEvent({ type: 'final_answer', data: contentWithoutTool || stepResult.content });
          loop = false;
        }
      }
    } catch (error: any) {
      console.error('[Agent] Logic error in reasoning loop:', error);
      this.onEvent({ type: 'error', message: `Fatal error: ${error.message}` });
    }
  }

  private async runStep(): Promise<{ content: string; toolCall?: { name: string; parameters: any } }> {
    console.log('[Agent] Running step...');
    return new Promise((resolve, reject) => {
      let accumulated = "";
      let isInsideToolCall = false;

      this.llm.streamChat(this.model, this.messages, {
        onToken: (token) => {
          accumulated += token;
          
          // Basic state machine to avoid emitting tool call tokens to UI
          if (accumulated.includes('<tool_call>') && !isInsideToolCall) {
            isInsideToolCall = true;
          }

          if (!isInsideToolCall) {
            this.onEvent({ type: 'token', data: token });
          }

          if (accumulated.includes('</tool_call>') && isInsideToolCall) {
            isInsideToolCall = false;
          }
        },
        onError: (error) => {
          this.onEvent({ type: 'error', message: error });
          reject(new Error(error));
        },
        onComplete: (fullText) => {
          const toolCall = this.parseToolCall(fullText);
          resolve({ content: fullText, toolCall });
        }
      });
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
      const paramMatches = paramsXml.matchAll(/<(.*?)>(.*?)<\/\1>/g);
      for (const m of paramMatches) {
        parameters[m[1]] = m[2].trim();
      }
    }

    return { name, parameters };
  }
}
