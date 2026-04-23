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
          messages: messages,
          stream: true
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
      yield { type: 'error', message: e.response?.data?.error?.message || e.message };
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

export class OpenRouterProvider extends BaseLlmProvider {
  constructor(apiKey: string) {
    super(apiKey, "https://openrouter.ai/api/v1", {
      "HTTP-Referer": "https://mosaic.methil.group",
      "X-Title": "Mosaic VSCode"
    });
  }
}
