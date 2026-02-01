import { defineStore } from 'pinia'
import { useUserStore } from './user'

export type AgentEvent =
  | { type: 'token', data: string }
  | { type: 'tool_started', name: string, parameters: string }
  | { type: 'tool_finished', name: string, result: string }
  | { type: 'final_answer', data: string }
  | { type: 'error', message: string }

export interface Message {
  role: 'user' | 'assistant'
  content: string
  events?: AgentEvent[]
  isStreaming?: boolean
  model?: string
}

export interface InstanceState {
  id: string
  name: string
  messages: Message[]
  isProcessing: boolean
  currentWorkspace: string
  currentModel: string
  isVisible: boolean
  colSpan: number
  messageQueue: string[]
  abortController: AbortController | null
}

export interface Model {
  id: string
  name: string
}

export interface Provider {
  id: string
  name: string
  models: Model[]
}

export interface State {
  instances: Record<string, InstanceState>
  instanceIds: string[]
  availableProviders: Provider[]
  defaultProviderId: string
  defaultModelId: string
  backendUrl: string
  filesCache: Record<string, string[]> // workspacePath -> files
}

const AGENT_NAMES = [
  'ORION', 'ATLAS', 'NOVA', 'CYPHER', 'ZENITH', 'OMEGA', 'PRIME', 'VECTOR',
  'NEBULA', 'PULSAR', 'QUASAR', 'HELIX', 'FLUX', 'APEX', 'VORTEX', 'NEXUS',
  'TITAN', 'CRONUS', 'AETHER', 'QUANTUM', 'ECHO', 'MIRAGE', 'PHANTOM', 'SPECTRE'
]

export const useAgentStore = defineStore('agent', {
  state: (): State => ({
    instances: {
      'default': {
        id: 'default',
        name: 'DEFAULT',
        messages: [],
        isProcessing: false,
        currentWorkspace: '',
        currentModel: 'deepseek/deepseek-v3.2',
        isVisible: true,
        colSpan: 1,
        messageQueue: [],
        abortController: null,
      }
    },
    instanceIds: ['default'],
    availableProviders: [],
    defaultProviderId: 'openrouter',
    defaultModelId: 'deepseek/deepseek-v3.2',
    backendUrl: 'http://localhost:3710',
    filesCache: {}
  }),
  getters: {
    availableModels: (state): Model[] => {
      return state.availableProviders.flatMap(p => p.models)
    },
    // Models for the current default or selected provider could be useful, 
    // but flattening all for the basic list is fine for now.
  },
  actions: {
    createInstance(workspace?: string) {
      const id = Math.random().toString(36).substring(7)
      const randomName = AGENT_NAMES[Math.floor(Math.random() * AGENT_NAMES.length)] || id.toUpperCase()
      this.instances[id] = {
        id,
        name: randomName,
        messages: [],
        isProcessing: false,
        currentWorkspace: workspace || '',
        currentModel: this.defaultModelId,
        isVisible: true,
        colSpan: 1,
        messageQueue: [],
        abortController: null,
      }
      this.instanceIds.push(id)
      return id
    },

    removeInstance(id: string) {
      delete this.instances[id]
      this.instanceIds = this.instanceIds.filter(i => i !== id)
    },

    async sendMessage(instanceId: string, prompt: string) {
      const instance = this.instances[instanceId]
      if (!instance) return

      if (instance.isProcessing) {
        instance.messageQueue.push(prompt)
        return
      }

      instance.isProcessing = true
      instance.messages.push({ role: 'user', content: prompt })

      const assistantMessage: Message = {
        role: 'assistant',
        content: '',
        events: [],
        isStreaming: true,
        model: instance.currentModel
      }
      instance.messages.push(assistantMessage)

      try {
        const userStore = useUserStore()
        const controller = new AbortController()
        instance.abortController = controller

        const response = await fetch(`${this.backendUrl}/agent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_prompt: prompt,
            workspace: instance.currentWorkspace,
            model_id: instance.currentModel,
            user_name: userStore.userName || 'User'
          }),
          signal: controller.signal
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
      } catch (error: any) {
        if (error.name === 'AbortError') {
          assistantMessage.content += '\n\n[Interaction stopped by user]'
        } else {
          console.error('Agent error:', error)
          assistantMessage.content += `\n\n[Error: ${error}]`
        }
      } finally {
        instance.isProcessing = false
        assistantMessage.isStreaming = false
        instance.abortController = null

        // Process next in queue
        if (instance.messageQueue.length > 0) {
          const nextPrompt = instance.messageQueue.shift()!
          this.sendMessage(instanceId, nextPrompt)
        }
      }
    },

    stopProcessing(instanceId: string) {
      const instance = this.instances[instanceId]
      if (instance && instance.abortController) {
        instance.abortController.abort()
        instance.isProcessing = false
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
        } else if (event.type === 'error') {
          lastMessage.content += `\n\n[Error: ${event.message}]`
        }
      }
    },

    clearMemory(instanceId: string) {
      if (this.instances[instanceId]) {
        this.instances[instanceId].messages = []
      }
    },

    async listDirectories(path: string): Promise<string[]> {
      try {
        const response = await fetch(`${this.backendUrl}/ls`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path })
        })
        if (!response.ok) return []
        const data = await response.json()
        return data.directories || []
      } catch (e) {
        console.error('Failed to list directories', e)
        return []
      }
    },

    async fetchFiles(path: string): Promise<string[]> {
      if (this.filesCache[path]) return this.filesCache[path]
      
      try {
        const response = await fetch(`${this.backendUrl}/files`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path })
        })
        if (!response.ok) return []
        const data = await response.json()
        const files = data.files || []
        this.filesCache[path] = files
        return files
      } catch (e) {
        console.error('Failed to fetch files', e)
        return []
      }
    },

    updateInstanceModel(instanceId: string, modelId: string) {
      if (this.instances[instanceId]) {
        this.instances[instanceId].currentModel = modelId
      }
    },

    async fetchProviders() {
      try {
        const response = await fetch(`${this.backendUrl}/providers`)
        if (!response.ok) return
        const data = await response.json()
        this.availableProviders = data.providers || []

        // Set defaults if not set and we have data
        if (this.availableProviders.length > 0 && this.defaultProviderId === 'openrouter') {
          // Keep hardcoded default OR pick first? 
          // Let's stick to the initialized default for now, or update if invalid.
        }
      } catch (e) {
        console.error('Failed to fetch providers', e)
        // Fallback
        this.availableProviders = [{
          id: 'openrouter',
          name: 'OpenRouter',
          models: [
            { id: 'deepseek/deepseek-v3.2', name: 'DeepSeek 3.2' },
            { id: 'mistralai/devstral-2512', name: 'Devstral 2512' },
          ]
        }]
      }
    }
  }
})
