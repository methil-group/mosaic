export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onError: (error: string) => void;
  onComplete: (fullText: string) => void;
  onUsage?: (usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }) => void;
}

export abstract class AbstractLLM {
  abstract streamChat(model: string, messages: Message[], callbacks: StreamCallbacks, signal?: AbortSignal): Promise<void>;
}
