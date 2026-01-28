import { defineStore } from 'pinia'

export type AgentEvent = 
  | { type: 'token', data: string }
  | { type: 'tool_started', name: string, parameters: string }
  | { type: 'tool_finished', name: string, result: string }
  | { type: 'final_answer', data: string }

export interface Message {
  role: 'user' | 'assistant'
  content: string
  events?: AgentEvent[]
  isStreaming?: boolean
}

export interface State {
  messages: Message[]
  isProcessing: boolean
  currentWorkspace: string
  currentModel: string
  availableModels: { id: string, name: string }[]
  backendUrl: string
}

export const useAgentStore = defineStore('agent', {
  state: (): State => ({
    messages: [],
    isProcessing: false,
    currentWorkspace: '/Users/ethew/Documents/Github/methil-vibe/mosaic',
    currentModel: 'deepseek/deepseek-chat',
    availableModels: [
      { id: 'deepseek/deepseek-chat', name: 'DeepSeek Chat v3' },
      { id: 'deepseek/deepseek-reasoner', name: 'DeepSeek Reasoner (R1)' },
      { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
      { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash' },
      { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini' }
    ],
    backendUrl: 'http://localhost:3710'
  }),
  actions: {
    async sendMessage(prompt: string) {
      if (this.isProcessing) return
      
      this.isProcessing = true
      this.messages.push({ role: 'user', content: prompt })
      
      const assistantMessage: Message = { 
        role: 'assistant', 
        content: '', 
        events: [], 
        isStreaming: true 
      }
      this.messages.push(assistantMessage)
      
      try {
        const response = await fetch(`${this.backendUrl}/agent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_prompt: prompt,
            workspace: this.currentWorkspace,
            model_id: this.currentModel
          })
        })

        if (!response.ok) throw new Error('Failed to connect to agent')
        if (!response.body) throw new Error('No response body')

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const event = JSON.parse(line.slice(6)) as AgentEvent
                this.handleEvent(event)
              } catch (e: any) {
                console.error('Failed to parse SSE event', e)
              }
            }
          }
        }
      } catch (error) {
        console.error('Agent error:', error)
        assistantMessage.content += `\n\n[Error: ${error}]`
      } finally {
        this.isProcessing = false
        assistantMessage.isStreaming = false
      }
    },

    handleEvent(event: AgentEvent) {
      const lastMessage = this.messages[this.messages.length - 1]
      if (lastMessage && lastMessage.role === 'assistant') {
        if (!lastMessage.events) lastMessage.events = []
        lastMessage.events.push(event)

        if (event.type === 'token') {
          lastMessage.content += event.data
        } else if (event.type === 'final_answer') {
          lastMessage.content = event.data
        }
      }
    },

    clearMemory() {
      this.messages = []
    }
  }
})
