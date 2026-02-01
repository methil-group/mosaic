import axios from 'axios';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(process.cwd(), '.env') });

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onError: (error: string) => void;
  onComplete: (fullText: string) => void;
}

export abstract class LLMProvider {
  abstract streamChat(model: string, messages: Message[], callbacks: StreamCallbacks): Promise<void>;
}

export class OpenRouterProvier extends LLMProvider {
  private apiKey: string;
  private baseUrl = 'https://openrouter.ai/api/v1';

  constructor() {
    super();
    this.apiKey = process.env.OPENROUTER_API_KEY || '';
  }

  async streamChat(model: string, messages: Message[], callbacks: StreamCallbacks): Promise<void> {
    if (!this.apiKey) {
      callbacks.onError('OpenRouter API Key not found in .env');
      return;
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model,
          messages,
          stream: true
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://github.com/methil-mods/mosaic',
            'X-Title': 'Mosaic'
          },
          responseType: 'stream'
        }
      );

      let accumulated = '';
      response.data.on('data', (chunk: Buffer) => {
        const lines = chunk.toString().split('\n').filter(line => line.trim() !== '');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              callbacks.onComplete(accumulated);
              return;
            }
            try {
              const json = JSON.parse(data);
              const token = json.choices[0]?.delta?.content || '';
              if (token) {
                accumulated += token;
                callbacks.onToken(token);
              }
            } catch (e) {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      });

      response.data.on('error', (err: any) => {
        callbacks.onError(err.message);
      });

    } catch (error: any) {
      const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
      callbacks.onError(`API Request failed: ${errorMessage}`);
    }
  }
}
