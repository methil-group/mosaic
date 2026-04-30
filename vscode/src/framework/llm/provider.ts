import axios from 'axios';
import { StreamEvent, Message, LlmProvider, ModelInfo, ModelPricing } from '../../core/agent';

export class BaseLlmProvider implements LlmProvider {
  protected models: ModelInfo[] = [];

  constructor(
    private apiKey: string, 
    private baseUrl: string,
    private headers: Record<string, string> = {}
  ) {}

  async *streamChat(model: string, messages: Message[]): AsyncGenerator<StreamEvent> {
    yield { type: 'log', message: `[LLM] Requesting ${model} with ${messages.length} messages...` };
    try {
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: model,
          messages: messages.map(({ role, content }) => ({ role, content })),
          stream: true,
          stream_options: { include_usage: true },
          include_reasoning: true
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            ...this.headers
          },
          responseType: 'stream'
        }
      );

      yield { type: 'log', message: `[LLM] Response status: ${response.status} ${response.statusText}` };

      const stream = response.data;
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      
      for await (const chunk of stream) {
        buffer += typeof chunk === 'string' ? chunk : decoder.decode(chunk, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]') continue;
          
          if (trimmed.startsWith('data: ')) {
            const data = trimmed.slice(6);
            try {
              const parsed = JSON.parse(data);
              
              if (parsed.usage) {
                yield { type: 'usage', data: parsed.usage };
              }

              const content = parsed.choices[0]?.delta?.content;
              const reasoning = parsed.choices[0]?.delta?.reasoning;
              
              if (reasoning) {
                yield { type: 'token', data: reasoning };
              }
              if (content) {
                yield { type: 'token', data: content };
              }
            } catch (e) {
              yield { type: 'log', message: `[LLM] JSON Parse Warning: ${trimmed}` };
            }
          }
        }
      }
    } catch (e: any) {
      let message = e.message;
      let detailedError = "";
      if (e.response?.data) {
        if (typeof e.response.data === 'string') {
          detailedError = e.response.data;
          message = `${e.message}: ${e.response.data}`;
        } else if (e.response.data.error?.message) {
          detailedError = JSON.stringify(e.response.data.error);
          message = e.response.data.error.message;
        } else {
          try {
            detailedError = JSON.stringify(e.response.data);
            message = `${e.message}: ${detailedError}`;
          } catch (serializeError) {
            detailedError = "Could not serialize response data";
            message = `${e.message} (plus additional data that couldn't be serialized)`;
          }
        }
      }
      yield { type: 'log', message: `[LLM] ERROR: ${message} | DETAILS: ${detailedError}` };
      yield { type: 'error', message };
    }
  }

  async fetchModels(): Promise<ModelInfo[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          ...this.headers
        },
        timeout: 5000 
      });

      if (response.status === 200 && response.data && Array.isArray(response.data.data)) {
        this.models = response.data.data.map((m: any) => ({
          id: m.id,
          name: m.name || m.id,
          pricing: m.pricing ? {
            prompt: parseFloat(m.pricing.prompt) * 1000000,
            completion: parseFloat(m.pricing.completion) * 1000000
          } : undefined
        }));
        return this.models;
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  getPricing(modelId: string): ModelPricing | undefined {
    return this.models.find(m => m.id === modelId)?.pricing;
  }
}

export class LMStudioProvider extends BaseLlmProvider {
  constructor(baseUrl = "http://localhost:1234/v1") {
    super("lm-studio", baseUrl);
  }

  async fetchModels(): Promise<ModelInfo[]> {
    const models = await super.fetchModels();
    // LM Studio models are free
    return models.map(m => ({
      ...m,
      pricing: { prompt: 0, completion: 0 }
    }));
  }

  getPricing(modelId: string): ModelPricing | undefined {
    return { prompt: 0, completion: 0 };
  }
}

export const PREFERRED_MODELS = [
  'deepseek/deepseek-chat',
  'deepseek/deepseek-reasoner',
  'anthropic/claude-3.5-sonnet',
  'google/gemini-pro-1.5',
  'openai/gpt-4o-mini',
  'meta-llama/llama-3.1-405b-instruct',
  'qwen/qwen-2.5-72b-instruct'
];

export class OpenRouterProvider extends BaseLlmProvider {
  constructor(apiKey: string) {
    super(apiKey, "https://openrouter.ai/api/v1", {
      "HTTP-Referer": "https://mosaic.methil.group",
      "X-Title": "Mosaic VSCode"
    });
  }

  async fetchModels(): Promise<ModelInfo[]> {
    const allModels = await super.fetchModels();
    if (allModels.length === 0) {
        return PREFERRED_MODELS.map(id => ({ id, name: id, pricing: { prompt: 0, completion: 0 } }));
    }
    
    // Prioritize preferred models but keep others
    const featured = allModels.filter(m => PREFERRED_MODELS.includes(m.id));
    const others = allModels.filter(m => !PREFERRED_MODELS.includes(m.id));
    
    this.models = [...featured, ...others];
    return this.models;
  }
}
