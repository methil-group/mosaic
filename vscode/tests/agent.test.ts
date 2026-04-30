import { Agent, StreamEvent, LlmProvider, Message, ModelInfo, ModelPricing } from '../src/core/agent';

// Mock tool that does nothing
const mockTool = {
  name: () => 'test_tool',
  description: () => 'A test tool',
  schema: () => ({ type: 'object', properties: { input: { type: 'string' } }, required: ['input'] }),
  execute: async (args: any) => 'tool result'
};

// Helper to create a mock LLM provider
function createMockProvider(responses: string[]): LlmProvider {
  let callIndex = 0;
  return {
    async *streamChat(model: string, messages: Message[]): AsyncGenerator<StreamEvent> {
      const response = responses[callIndex] || responses[responses.length - 1];
      callIndex++;
      for (const char of response) {
        yield { type: 'token', data: char };
      }
      yield { type: 'usage', data: { prompt_tokens: 10, completion_tokens: 20 } };
    },
    async fetchModels(): Promise<ModelInfo[]> {
      return [{ id: 'test-model' }];
    },
    getPricing(model: string): ModelPricing | undefined {
      return undefined;
    }
  };
}

jest.setTimeout(30000);

describe('Agent reasoning loop', () => {
  
  it('should stop the loop when <task_finished /> is present', async () => {
    const provider = createMockProvider([
      'Here is my final answer.\n<task_finished />'
    ]);
    
    const agent = new Agent(provider, 'test-model', 'workspace', 'user', [mockTool]);
    const events: StreamEvent[] = [];
    
    await agent.run('do something', async (event) => {
      events.push(event);
    });
    
    const finalAnswer = events.find(e => e.type === 'final_answer');
    expect(finalAnswer).toBeDefined();
    expect(finalAnswer?.data).toContain('<task_finished />');
    
    const taskFinishedLog = events.find(e => e.type === 'log' && e.message?.includes('Task finished tag detected'));
    expect(taskFinishedLog).toBeDefined();
  });

  it('should nudge when response has content but no <task_finished />', async () => {
    const provider = createMockProvider([
      'I have a plan to do something.', // No tag, no tool
      'Done!\n<task_finished />' // Success after nudge
    ]);
    
    const agent = new Agent(provider, 'test-model', 'workspace', 'user', [mockTool]);
    const events: StreamEvent[] = [];
    
    await agent.run('do something', async (event) => {
      events.push(event);
    });
    
    // Should have nudged
    const nudgeLog = events.find(e => e.type === 'log' && e.message?.includes('Nudging (1/3)'));
    expect(nudgeLog).toBeDefined();
    
    // Should eventually finish
    const finalAnswer = events.find(e => e.type === 'final_answer');
    expect(finalAnswer).toBeDefined();
  });

  it('should silently retry on empty response without nudging', async () => {
    // Provider that returns empty first, then content
    let callCount = 0;
    const provider: LlmProvider = {
      async *streamChat(model: string, messages: Message[]): AsyncGenerator<StreamEvent> {
        callCount++;
        if (callCount === 1) {
          // First call: emit nothing (empty response)
          yield { type: 'usage', data: { prompt_tokens: 10, completion_tokens: 0 } };
        } else {
          // Second call: real response
          const text = 'Done!\n<task_finished />';
          for (const char of text) {
            yield { type: 'token', data: char };
          }
          yield { type: 'usage', data: { prompt_tokens: 10, completion_tokens: 20 } };
        }
      },
      async fetchModels(): Promise<ModelInfo[]> { return [{ id: 'test' }]; },
      getPricing(model: string): ModelPricing | undefined { return undefined; }
    };
    
    const agent = new Agent(provider, 'test-model', 'workspace', 'user', [mockTool]);
    const events: StreamEvent[] = [];
    
    await agent.run('do something', async (event) => {
      events.push(event);
    });
    
    // Should have retried silently (no nudge message in history)
    const retryLog = events.find(e => e.type === 'log' && e.message?.includes('Empty response'));
    expect(retryLog).toBeDefined();
    
    // Should NOT have a nudge about task_finished
    const nudgeLog = events.find(e => e.type === 'log' && e.message?.includes('did not include'));
    expect(nudgeLog).toBeUndefined();
    
    // Should have final answer
    const finalAnswer = events.find(e => e.type === 'final_answer');
    expect(finalAnswer).toBeDefined();
  });

  it('should stop after max empty retries', async () => {
    // Always returns empty
    const provider = createMockProvider(['']);
    
    const agent = new Agent(provider, 'test-model', 'workspace', 'user', [mockTool]);
    const events: StreamEvent[] = [];
    
    await agent.run('do something', async (event) => {
      events.push(event);
    });
    
    const errorLog = events.find(e => e.type === 'error' && e.message?.includes('empty responses'));
    expect(errorLog).toBeDefined();
  });

  it('should silently retry on thoughts-only response (both <thought> and <thinking>)', async () => {
    const provider = createMockProvider([
      '<thinking>\nLet me think about this...\n</thinking>',
      'Here is the answer.\n<task_finished />'
    ]);
    
    const agent = new Agent(provider, 'test-model', 'workspace', 'user', [mockTool]);
    const events: StreamEvent[] = [];
    
    await agent.run('think about it', async (event) => {
      events.push(event);
    });
    
    const retryLog = events.find(e => e.type === 'log' && e.message?.includes('only provided thoughts'));
    expect(retryLog).toBeDefined();
    
    const finalAnswer = events.find(e => e.type === 'final_answer');
    expect(finalAnswer).toBeDefined();
  });

  it('should handle tool calls and continue the loop', async () => {
    const provider = createMockProvider([
      '<thought>I need to use a tool</thought>\n<tool_call>\n{"name": "test_tool", "arguments": {"input": "hello"}}\n</tool_call>',
      'Done! I used the tool.\n<task_finished />'
    ]);
    
    const agent = new Agent(provider, 'test-model', 'workspace', 'user', [mockTool]);
    const events: StreamEvent[] = [];
    
    await agent.run('use the tool', async (event) => {
      events.push(event);
    });
    
    const toolStarted = events.find(e => e.type === 'tool_started');
    expect(toolStarted).toBeDefined();
    expect(toolStarted?.name).toBe('test_tool');
    
    const toolFinished = events.find(e => e.type === 'tool_finished');
    expect(toolFinished).toBeDefined();
    
    const finalAnswer = events.find(e => e.type === 'final_answer');
    expect(finalAnswer).toBeDefined();
  });

  it('should respect max steps limit', async () => {
    // Provider that always returns content without task_finished — treated as final answer, so it breaks
    // To test max steps, we need the LLM to always do tool calls
    const provider = createMockProvider([
      '<tool_call>\n{"name": "test_tool", "arguments": {"input": "loop"}}\n</tool_call>'
    ]);
    
    const agent = new Agent(provider, 'test-model', 'workspace', 'user', [mockTool]);
    const events: StreamEvent[] = [];
    
    await agent.run('infinite tool loop test', async (event) => {
      events.push(event);
    });
    
    const maxStepsError = events.find(e => e.type === 'error' && e.message?.includes('Max steps reached'));
    expect(maxStepsError).toBeDefined();
  });
});
