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

export interface InstanceState {
  id: string
  name: string
  messages: Message[]
  isProcessing: boolean
  currentWorkspace: string
  currentModel: string
}

export interface State {
  instances: Record<string, InstanceState>
  instanceIds: string[]
  availableModels: { id: string, name: string }[]
  backendUrl: string
}

export const useAgentStore = defineStore('agent', {
  state: (): State => ({
    instances: {
      'default': {
        id: 'default',
        name: 'DEFAULT',
        messages: [],
        isProcessing: false,
        currentWorkspace: '/Users/ethew/Documents/Github/methil-vibe/mosaic',
        currentModel: 'deepseek/deepseek-v3.2',
      }
    },
    instanceIds: ['default'],
    availableModels: [
      { id: 'deepseek/deepseek-v3.2', name: 'DeepSeek 3.2' },
      { id: 'minimax/minimax-01', name: 'MiniMax-01 (Latest)' },
      { id: 'bigmodel/glm-4-9b-chat', name: 'GLM-4-7' }
    ],
    backendUrl: 'http://localhost:3710'
  }),
  actions: {
    createInstance(workspace?: string) {
      const id = Math.random().toString(36).substring(7)
      this.instances[id] = {
        id,
        name: id.toUpperCase(),
        messages: [],
        isProcessing: false,
        currentWorkspace: workspace || '/Users/ethew/Documents/Github/methil-vibe/mosaic',
        currentModel: 'deepseek/deepseek-v3.2',
      }
      this.instanceIds.push(id)
      return id
    },

    removeInstance(id: string) {
      if (this.instanceIds.length <= 1) return
      delete this.instances[id]
      this.instanceIds = this.instanceIds.filter(i => i !== id)
    },

    async sendMessage(instanceId: string, prompt: string) {
      const instance = this.instances[instanceId]
      if (!instance || instance.isProcessing) return
      
      instance.isProcessing = true
      instance.messages.push({ role: 'user', content: prompt })
      
      const assistantMessage: Message = { 
        role: 'assistant', 
        content: '', 
        events: [], 
        isStreaming: true 
      }
      instance.messages.push(assistantMessage)
      
      try {
        const response = await fetch(`${this.backendUrl}/agent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_prompt: prompt,
            workspace: instance.currentWorkspace,
            model_id: instance.currentModel
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
                this.handleEvent(instanceId, event)
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
        instance.isProcessing = false
        assistantMessage.isStreaming = false
      }
    },

    handleEvent(instanceId: string, event: AgentEvent) {
      const instance = this.instances[instanceId]
      if (!instance) return
      
      const lastMessage = instance.messages[instance.messages.length - 1]
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

    clearMemory(instanceId: string) {
      if (this.instances[instanceId]) {
        this.instances[instanceId].messages = []
      }
    }
  }
})
