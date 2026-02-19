export interface Message {
    role: string
    content: string
}

export interface Usage {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
}

export type LlmEvent =
    | { type: 'token'; token: string }
    | { type: 'usage'; usage: Usage }
    | { type: 'complete'; content: string }
    | { type: 'error'; message: string }

export interface LlmProvider {
    streamChat(model: string, messages: Message[]): AsyncIterable<LlmEvent>
    fetchModels(): Promise<string[]>
}
