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

export interface Workspace {
  id: string
  name: string
  path: string
  description?: string
  color?: string
  defaultModel?: string
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
  workspaces: Workspace[]
  currentView: 'grid' | 'workspaces' | 'workspace-detail'
  activeWorkspaceId: string | null
  // Layout persistence: keyed by agent IDs hash
  customLayouts: Record<string, any>
}

const AGENT_NAMES = [
  'ORION', 'ATLAS', 'NOVA', 'CYPHER', 'ZENITH', 'OMEGA', 'PRIME', 'VECTOR',
  'NEBULA', 'PULSAR', 'QUASAR', 'HELIX', 'FLUX', 'APEX', 'VORTEX', 'NEXUS',
  'TITAN', 'CRONUS', 'AETHER', 'QUANTUM', 'ECHO', 'MIRAGE', 'PHANTOM', 'SPECTRE'
]

export const useAgentStore = defineStore('agent', {
  state: (): State => ({
    instances: {},
    instanceIds: [],
    availableProviders: [],
    defaultProviderId: 'openrouter',
    defaultModelId: 'deepseek/deepseek-v3.2',
    backendUrl: 'http://localhost:3710',
    filesCache: {},
    workspaces: [],
    currentView: 'grid',
    activeWorkspaceId: null,
    customLayouts: {}
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
        
        // Use Electron IPC for streaming
        if ((window as any).api) {
          const removeListener = (window as any).api.onAgentEvent((event: any) => {
            this.handleEvent(instanceId, event)
          })

          await (window as any).api.streamAgent({
            user_prompt: prompt,
            workspace: instance.currentWorkspace,
            model_id: instance.currentModel,
            user_name: userStore.userName || 'User'
          })

          removeListener()
        } else {
          throw new Error('Electron API not available')
        }
      } catch (error: any) {
        console.error('Agent error:', error)
        assistantMessage.content += `\n\n[Error: ${error.message || error}]`
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
        if ((window as any).api) {
          const data = await (window as any).api.listDirectories(path)
          return data.directories || []
        }
        return []
      } catch (e) {
        console.error('Failed to list directories', e)
        return []
      }
    },

    async fetchFiles(path: string): Promise<string[]> {
      if (this.filesCache[path]) return this.filesCache[path]
      
      try {
        if ((window as any).api) {
          const data = await (window as any).api.fetchFiles(path)
          const files = data.files || []
          this.filesCache[path] = files
          return files
        }
        return []
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
        if ((window as any).electron) {
          const data = await (window as any).electron.ipcRenderer.invoke('providers:get')
          this.availableProviders = data.providers || []
        }
      } catch (e) {
        console.error('Failed to fetch providers', e)
      }
    },

    // Workspace Actions
    async fetchWorkspaces() {
      try {
        if ((window as any).api) {
          this.workspaces = await (window as any).api.getWorkspaces()
        }
      } catch (e) {
        console.error('Failed to fetch workspaces', e)
      }
    },

    async saveWorkspace(workspace: Workspace) {
      try {
        if ((window as any).api) {
          await (window as any).api.saveWorkspace(workspace)
          await this.fetchWorkspaces()
        }
      } catch (e) {
        console.error('Failed to save workspace', e)
      }
    },

    async deleteWorkspace(id: string) {
      try {
        if ((window as any).api) {
          await (window as any).api.deleteWorkspace(id)
          await this.fetchWorkspaces()
        }
      } catch (e) {
        console.error('Failed to delete workspace', e)
      }
    },

    setView(view: 'grid' | 'workspaces' | 'workspace-detail', activeId: string | null = null) {
      this.currentView = view
      this.activeWorkspaceId = activeId
    }
  }
})
