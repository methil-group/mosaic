import axios from 'axios';
import { AbstractLLM, Message, StreamCallbacks } from '../Framework/AbstractLLM';

export interface LMStudioModel {
    id: string;
    object: string;
    owned_by: string;
    permission: any[];
}

export class LMStudio extends AbstractLLM {
    private baseUrl = 'http://localhost:1234/v1';

    constructor() {
        super();
    }

    async fetchModels(): Promise<LMStudioModel[]> {
        try {
            const response = await axios.get(`${this.baseUrl}/models`, {
                timeout: 2000 // Short timeout to check if running
            });
            if (response.data && Array.isArray(response.data.data)) {
                return response.data.data;
            }
            return [];
        } catch (error) {
            // Service likely not running
            return [];
        }
    }

    async streamChat(model: string, messages: Message[], callbacks: StreamCallbacks, signal?: AbortSignal): Promise<void> {
        console.log(`[LMStudio] Starting stream chat for model: ${model}`);
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
                        'Content-Type': 'application/json'
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
                buffer = lines.pop() || '';

                for (const line of lines) {
                    const trimmedLine = line.trim();
                    if (!trimmedLine) continue;

                    if (trimmedLine.startsWith('data: ')) {
                        const data = trimmedLine.slice(6);
                        if (data === '[DONE]') {
                            console.log('[LMStudio] Stream finished [DONE]');
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
                            console.warn('[LMStudio] Failed to parse JSON:', data);
                        }
                    }
                }
            });

            response.data.on('error', (err: any) => {
                callbacks.onError(err.message);
            });

        } catch (error: any) {
            console.error('[LMStudio] API Error:', error.message);
            if (error.name === 'CanceledError' || error.message === 'canceled') {
                return;
            }
            callbacks.onError(`LM Studio Request failed: ${error.message}. Is LM Studio running on port 1234?`);
        }
    }
}
