import axios from 'axios';
import { AbstractLLM, Message, StreamCallbacks } from '../Framework/AbstractLLM';

export class OpenRouter extends AbstractLLM {
  private apiKey: string;
  private baseUrl = 'https://openrouter.ai/api/v1';

  constructor(apiKey: string) {
    super();
    this.apiKey = apiKey;
  }

  public updateApiKey(newKey: string) {
    this.apiKey = newKey;
  }

  async streamChat(model: string, messages: Message[], callbacks: StreamCallbacks, signal?: AbortSignal): Promise<void> {
    if (!this.apiKey) {
      callbacks.onError('OpenRouter API Key not found');
      return;
    }

    console.log(`[OpenRouter] Starting stream chat for model: ${model}`);
    try {
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model,
          messages,
          stream: true,
          stream_options: { include_usage: true }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://github.com/methil-mods/mosaic',
            'X-Title': 'Mosaic'
          },
          responseType: 'stream',
          signal
        }
      );

      let accumulated = '';
      let buffer = '';

      response.data.on('data', (chunk: Buffer) => {
        buffer += chunk.toString();
        
        let lines = buffer.split('\n');
        // Keep the last partial line in the buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine) continue;

          if (trimmedLine.startsWith('data: ')) {
            const data = trimmedLine.slice(6);
            if (data === '[DONE]') {
              console.log('[OpenRouter] Stream finished [DONE]');
              callbacks.onComplete(accumulated);
              return;
            }
            try {
              const json = JSON.parse(data);
              
              // Check for usage
              if (json.usage && callbacks.onUsage) {
                  callbacks.onUsage(json.usage);
              }

              const token = json.choices[0]?.delta?.content || '';
              if (token) {
                accumulated += token;
                callbacks.onToken(token);
              }
            } catch (e) {
              // This shouldn't happen with line buffering, but keep as safety
              console.warn('[OpenRouter] Failed to parse JSON:', data);
            }
          }
        }
      });

      response.data.on('error', (err: any) => {
        callbacks.onError(err.message);
      });

    } catch (error: any) {
      console.error('[OpenRouter] API Error:', error.message);
      let errorMessage = error.message;
      
      if (error.response && error.response.data) {
        try {
          // Only stringify if it's not already a string
          errorMessage = typeof error.response.data === 'string' 
            ? error.response.data 
            : JSON.stringify(error.response.data);
        } catch (e) {
          errorMessage = 'Error parsing API response';
        }
      }
      
      if (error.name === 'CanceledError' || error.message === 'canceled') {
        console.log('[OpenRouter] Request canceled by user');
        return;
      }

      callbacks.onError(`API Request failed: ${errorMessage}`);
    }
  }
}
