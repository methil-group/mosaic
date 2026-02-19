import type { LlmProvider, Message, LlmEvent, Usage } from './types'

class OpenRouter implements LlmProvider {
    private apiKey: string
    private baseUrl = 'https://openrouter.ai/api/v1'

    constructor(apiKey: string) {
        this.apiKey = apiKey
    }

    async *streamChat(model: string, messages: Message[]): AsyncIterable<LlmEvent> {
        if (!this.apiKey) {
            yield { type: 'error', message: 'OpenRouter API Key not found' }
            return
        }

        const response = await fetch(`${this.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://github.com/methil-mods/mosaic',
                'X-Title': 'Mosaic',
            },
            body: JSON.stringify({
                model,
                messages,
                stream: true,
                stream_options: { include_usage: true },
            }),
        })

        if (!response.ok) {
            yield { type: 'error', message: `OpenRouter HTTP ${response.status}: ${await response.text()}` }
            return
        }

        const reader = response.body?.getReader()
        if (!reader) return

        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
                const trimmed = line.trim()
                if (!trimmed || !trimmed.startsWith('data: ')) continue

                const data = trimmed.slice(6)
                if (data === '[DONE]') continue

                try {
                    const json = JSON.parse(data)

                    if (json.usage) {
                        const u: Usage = {
                            prompt_tokens: json.usage.prompt_tokens || 0,
                            completion_tokens: json.usage.completion_tokens || 0,
                            total_tokens: json.usage.total_tokens || 0,
                        }
                        yield { type: 'usage', usage: u }
                    }

                    const delta = json.choices?.[0]?.delta
                    if (delta?.content) {
                        yield { type: 'token', token: delta.content }
                    }
                } catch {
                    // Skip malformed JSON chunks
                }
            }
        }
    }

    async fetchModels(): Promise<string[]> {
        return []
    }
}

export default OpenRouter
