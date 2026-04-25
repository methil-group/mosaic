import axios from 'axios';
import { StreamEvent, Message, LlmProvider } from '../../core/agent';

export class BaseLlmProvider implements LlmProvider {
  constructor(
    private apiKey: string, 
    private baseUrl: string,
    private headers: Record<string, string> = {}
  ) {}

  async *streamChat(model: string, messages: Message[]): AsyncGenerator<StreamEvent> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: model,
          // Strip non-standard fields like metadata before sending to API
          messages: messages.map(({ role, content }) => ({ role, content })),
          stream: true,
          stream_options: { include_usage: true }
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
              
              // Handle usage
              if (parsed.usage) {
                yield { type: 'usage', data: parsed.usage };
              }

              const content = parsed.choices[0]?.delta?.content;
              if (content) {
                yield { type: 'token', data: content };
              }
            } catch (e) {
              console.error("Partial JSON parse error:", e, trimmed);
            }
          }
        }
      }
    } catch (e: any) {
      let message = e.message;
      if (e.response?.data) {
        if (typeof e.response.data === 'string') {
          message = `${e.message}: ${e.response.data}`;
        } else if (e.response.data.error?.message) {
          message = e.response.data.error.message;
        } else {
          // Avoid JSON.stringify on potentially complex objects that might have circular refs
          try {
            message = `${e.message}: ${JSON.stringify(e.response.data)}`;
          } catch (serializeError) {
            message = `${e.message} (plus additional data that couldn't be serialized)`;
          }
        }
      }
      yield { type: 'error', message };
    }
  }

  async fetchModels(): Promise<string[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          ...this.headers
        },
        timeout: 5000 // Short timeout to quickly fail if LM Studio isn't running
      });

      if (response.status === 200 && response.data && Array.isArray(response.data.data)) {
        return response.data.data.map((m: any) => m.id);
      }
      return [];
    } catch (e) {
      // If fetching fails (e.g. localhost down), return empty array
      return [];
    }
  }
}

export class LMStudioProvider extends BaseLlmProvider {
  constructor(baseUrl = "http://localhost:1234/v1") {
    super("lm-studio", baseUrl);
  }
}

export const PREFERRED_MODELS = [
  'deepseek/deepseek-v4-flash',
  'deepseek/deepseek-v4-pro',
  'deepseek/deepseek-v3.2',
  'google/gemma-4-31b-it',
  'xiaomi/mimo-v2.5-pro',
  'qwen/qwen3.6-plus'
];

export class OpenRouterProvider extends BaseLlmProvider {
  constructor(apiKey: string) {
    super(apiKey, "https://openrouter.ai/api/v1", {
      "HTTP-Referer": "https://mosaic.methil.group",
      "X-Title": "Mosaic VSCode"
    });
  }

  async fetchModels(): Promise<string[]> {
    const allModels = await super.fetchModels();
    if (allModels.length === 0) return PREFERRED_MODELS;
    
    const featured = PREFERRED_MODELS.filter(m => allModels.includes(m));
    // const others = allModels.filter(m => !PREFERRED_MODELS.includes(m));
    
    // We only want to show a "smaller list" as requested, but maybe keep others just in case?
    // The user said "Fais une liste plus petite avec...", so I'll prioritize these 4.
    // If they are not found in the fetched list (unlikely since we checked), we still want them.
    return [...new Set([...featured, ...PREFERRED_MODELS])];
  }
}
