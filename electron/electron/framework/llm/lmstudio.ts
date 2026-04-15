import type { LlmProvider, Message, LlmEvent } from './types'

class LMStudio implements LlmProvider {
    private baseUrl: string

    constructor(baseUrl?: string) {
        this.baseUrl = baseUrl || 'http://localhost:1234/v1'
    }

    async *streamChat(model: string, messages: Message[]): AsyncIterable<LlmEvent> {
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model, messages, stream: true }),
        })

        if (!response.ok) {
            yield { type: 'error', message: `LM Studio HTTP ${response.status}. Is LM Studio running on port 1234?` }
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
                    const delta = json.choices?.[0]?.delta
                    if (delta?.content) {
                        yield { type: 'token', token: delta.content }
                    }
                } catch {
                    // Skip malformed chunks
                }
            }
        }
    }

    async fetchModels(): Promise<string[]> {
        const base = this.baseUrl.replace(/\/v1$/, '')
        const models: string[] = []

        try {
            const res = await fetch(`${base}/api/v1/models`, {
                signal: AbortSignal.timeout(3000),
            })
            const json: any = await res.json()

            if (Array.isArray(json.models)) {
                for (const m of json.models) {
                    if (m.type !== 'llm') continue
                    if (m.key) models.push(m.key)
                }
            }
        } catch {
            // Native API not available
        }

        if (models.length === 0) {
            try {
                const res = await fetch(`${this.baseUrl}/models`, {
                    signal: AbortSignal.timeout(2000),
                })
                const json: any = await res.json()

                if (Array.isArray(json.data)) {
                    for (const m of json.data) {
                        if (m.id) models.push(m.id)
                    }
                }
            } catch {
                // LM Studio not running
            }
        }

        return models
    }
}

export default LMStudio
