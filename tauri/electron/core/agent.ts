import type { LlmProvider, Message, LlmEvent } from '../llm/types'
import type { ToolRegistry } from './tools/index'
import { PromptBuilder } from './prompt'

// ─── Agent Event ─────────────────────────────────────────────────────────────

export type AgentEvent =
    | { type: 'token'; data: string }
    | { type: 'tool_started'; name: string; parameters: string }
    | { type: 'tool_finished'; name: string; result: string }
    | { type: 'final_answer'; data: string }
    | { type: 'usage'; data: string }
    | { type: 'error'; message: string }

// ─── Agent ───────────────────────────────────────────────────────────────────

export class Agent {
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

            // Stream LLM response
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

            // Parse tool call
            const toolCall = this.parseToolCall(fullText)

            if (toolCall) {
                const [name, params] = toolCall
                onEvent({ type: 'tool_started', name, parameters: JSON.stringify(params) })

                // Execute tool
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

                // Append to conversation
                this.messages.push({ role: 'assistant', content: fullText })
                this.messages.push({ role: 'user', content: PromptBuilder.formatToolResult(name, result) })
            } else {
                // No tool call — final answer
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

        const inner = content.slice(tcStart + 11, tcEnd)

        // Extract name
        const nStart = inner.indexOf('<name>')
        const nEnd = inner.indexOf('</name>')
        if (nStart === -1 || nEnd === -1) return null
        const name = inner.slice(nStart + 6, nEnd).trim()

        // Extract parameters
        const params: Record<string, string> = {}
        const pStart = inner.indexOf('<parameters>')
        const pEnd = inner.indexOf('</parameters>')
        if (pStart !== -1 && pEnd !== -1) {
            const pInner = inner.slice(pStart + 12, pEnd)
            // Simple XML tag parsing
            let cursor = pInner
            while (true) {
                const tagStart = cursor.indexOf('<')
                if (tagStart === -1) break
                const tagEnd = cursor.indexOf('>', tagStart)
                if (tagEnd === -1) break

                const tagName = cursor.slice(tagStart + 1, tagEnd)
                if (tagName.startsWith('/')) {
                    cursor = cursor.slice(tagEnd + 1)
                    continue
                }

                const closeTag = `</${tagName}>`
                const valEnd = cursor.indexOf(closeTag, tagEnd + 1)
                if (valEnd === -1) break

                const val = cursor.slice(tagEnd + 1, valEnd)
                params[tagName] = val.trim()
                cursor = cursor.slice(valEnd + closeTag.length)
            }
        }

        return [name, params]
    }
}
