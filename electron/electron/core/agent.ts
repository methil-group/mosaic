import type { LlmProvider, Message } from '../framework/llm/types'
import type ToolRegistry from './tools/index'
import PromptBuilder from './prompt/index'

// ─── Agent Event ─────────────────────────────────────────────────────────────

export type AgentEvent =
    | { type: 'token'; data: string }
    | { type: 'tool_started'; name: string; parameters: string }
    | { type: 'tool_finished'; name: string; result: string }
    | { type: 'final_answer'; data: string }
    | { type: 'usage'; data: string }
    | { type: 'error'; message: string }

// ─── Agent ───────────────────────────────────────────────────────────────────

class Agent {
    private llm: LlmProvider
    private model: string
    private workspace: string
    private userName: string
    private tools: ToolRegistry
    private messages: Message[] = []
    private stopped = false

    constructor(
        llm: LlmProvider,
        model: string,
        workspace: string,
        userName: string,
        tools: ToolRegistry,
    ) {
        this.llm = llm
        this.model = model
        this.workspace = workspace
        this.userName = userName
        this.tools = tools
    }

    stop(): void {
        this.stopped = true
    }

    async run(
        userPrompt: string,
        history: Message[],
        persona: string | undefined,
        onEvent: (event: AgentEvent) => void,
    ): Promise<void> {
        const systemPrompt = PromptBuilder.createSystemPrompt(
            this.tools.getTools(),
            this.workspace,
            this.userName,
            persona,
        )

        this.messages = [
            { role: 'system', content: systemPrompt },
            ...history,
            { role: 'user', content: userPrompt },
        ]

        await this.reasoningLoop(onEvent)
    }

    private async reasoningLoop(onEvent: (event: AgentEvent) => void): Promise<void> {
        let totalSteps = 0

        while (true) {
            if (this.stopped) break

            totalSteps++
            if (totalSteps > 100) {
                onEvent({ type: 'error', message: 'Max steps reached' })
                break
            }

            let fullText = ''
            try {
                for await (const event of this.llm.streamChat(this.model, [...this.messages])) {
                    if (this.stopped) break

                    switch (event.type) {
                        case 'token':
                            fullText += event.token
                            onEvent({ type: 'token', data: event.token })
                            break
                        case 'usage':
                            onEvent({ type: 'usage', data: JSON.stringify(event.usage) })
                            break
                        case 'error':
                            onEvent({ type: 'error', message: event.message })
                            return
                    }
                }
            } catch (err: any) {
                onEvent({ type: 'error', message: err.message || String(err) })
                return
            }

            const toolCall = this.parseToolCall(fullText)

            if (toolCall) {
                const [name, params] = toolCall
                const callId = `toolu-${Math.random().toString(36).substring(2, 15)}`
                onEvent({ type: 'tool_started', name, parameters: JSON.stringify(params) })

                const tool = this.tools.find(name)
                let result: string
                if (tool) {
                    try {
                        result = await tool.execute(params, this.workspace)
                    } catch (err: any) {
                        result = `Error: ${err.message || err}`
                    }
                } else {
                    result = `Error: Tool '${name}' not found`
                }

                onEvent({ type: 'tool_finished', name, result })

                this.messages.push({ role: 'assistant', content: fullText })
                this.messages.push({ role: 'user', content: PromptBuilder.formatToolResult(name, result, callId) })
            } else {
                onEvent({ type: 'final_answer', data: fullText })
                break
            }
        }
    }

    private parseToolCall(content: string): [string, Record<string, string>] | null {
        const tcStart = content.indexOf('<tool_call>')
        if (tcStart === -1) return null
        const tcEnd = content.indexOf('</tool_call>')
        if (tcEnd === -1) return null

        const inner = content.slice(tcStart + 11, tcEnd).trim()
        try {
            const data = JSON.parse(inner)
            const name = data.name
            const params = data.arguments || {}

            if (name) {
                return [name, params]
            }
        } catch {
            return null
        }

        return null
    }
}

export default Agent
