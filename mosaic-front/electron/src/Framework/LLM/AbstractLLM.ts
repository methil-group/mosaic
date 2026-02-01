export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onError: (error: string) => void;
  onComplete: (fullText: string) => void;
}

export abstract class AbstractLLM {
  abstract streamChat(model: string, messages: Message[], callbacks: StreamCallbacks): Promise<void>;
}
