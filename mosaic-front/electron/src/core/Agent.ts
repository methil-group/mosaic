import { LLMProvider, Message, StreamCallbacks } from './LLMProvider';
import { Tool, getTools, ToolParameters } from './Tool';
import { PromptBuilder } from './PromptBuilder';

export interface AgentEvent {
  type: 'token' | 'tool_started' | 'tool_finished' | 'final_answer' | 'error';
  data?: string;
  name?: string;
  parameters?: string;
  result?: string;
  message?: string;
}

export class Agent {
  private messages: Message[] = [];
  private tools: Tool[];
  private onEvent: (event: AgentEvent) => void;

  constructor(
    private llm: LLMProvider,
    private model: string,
    private workspace: string,
    private userName: string,
    onEvent: (event: AgentEvent) => void
  ) {
    this.tools = getTools();
    this.onEvent = onEvent;
  }

  async run(userPrompt: string): Promise<void> {
    const systemPrompt = PromptBuilder.createSystemPrompt(this.tools, this.workspace, this.userName);
    this.messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    await this.reasoningLoop();
  }

  private async reasoningLoop(): Promise<void> {
    let loop = true;
    while (loop) {
      const stepResult = await this.runStep();
      
      if (stepResult.toolCall) {
        const { name, parameters } = stepResult.toolCall;
        this.onEvent({ type: 'tool_started', name, parameters: JSON.stringify(parameters) });

        const tool = this.tools.find(t => t.name === name);
        if (tool) {
          try {
            const result = await tool.execute(parameters, this.workspace);
            this.onEvent({ type: 'tool_finished', name, result });

            this.messages.push({ role: 'assistant', content: stepResult.content });
            this.messages.push({ role: 'user', content: PromptBuilder.formatToolResult(name, result) });
          } catch (error: any) {
            this.onEvent({ type: 'error', message: `Tool execution failed: ${error.message}` });
            loop = false;
          }
        } else {
          this.onEvent({ type: 'error', message: `Tool ${name} not found` });
          loop = false;
        }
      } else {
        this.onEvent({ type: 'final_answer', data: stepResult.content });
        loop = false;
      }
    }
  }

  private async runStep(): Promise<{ content: string; toolCall?: { name: string; parameters: ToolParameters } }> {
    return new Promise((resolve, reject) => {
      let fullContent = '';
      let toolCallDetected = false;

      this.llm.streamChat(this.model, this.messages, {
        onToken: (token) => {
          fullContent += token;
          this.onEvent({ type: 'token', data: token });

          // Basic tool detection while streaming
          const toolCallMatch = fullContent.match(/<tool_call>([\s\S]*?)<\/tool_call>/);
          if (toolCallMatch && !toolCallDetected) {
            toolCallDetected = true;
            // We stop here for the loop to handle the tool execution
          }
        },
        onError: (error) => {
          this.onEvent({ type: 'error', message: error });
          reject(new Error(error));
        },
        onComplete: (accumulated) => {
          const toolCall = this.parseToolCall(accumulated);
          resolve({ content: accumulated, toolCall });
        }
      });
    });
  }

  private parseToolCall(content: string): { name: string; parameters: ToolParameters } | undefined {
    const match = content.match(/<tool_call>([\s\S]*?)<\/tool_call>/);
    if (!match) return undefined;

    const xml = match[1];
    const nameMatch = xml.match(/<name>(.*?)<\/name>/);
    const paramsMatch = xml.match(/<parameters>([\s\S]*?)<\/parameters>/);

    if (!nameMatch) return undefined;

    const name = nameMatch[1].trim();
    const parameters: ToolParameters = {};

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
