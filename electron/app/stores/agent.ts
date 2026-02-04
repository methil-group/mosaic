import { defineStore } from 'pinia'
import { useUserStore } from './user'

export type AgentEvent =
  | { type: 'token', data: string }
  | { type: 'tool_started', name: string, parameters: string }
  | { type: 'tool_finished', name: string, result: string }
  | { type: 'final_answer', data: string }
  | { type: 'error', message: string }

export interface Message {
  id?: number // SQLite row id
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
    defaultModelId: 'qwen/qwen3-vl-8b-thinking',
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
    async createInstance(workspace?: string) {
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
      
      // Persist to SQLite
      if ((window as any).electron) {
        await (window as any).electron.ipcRenderer.invoke('agents:save', {
          id,
          name: randomName,
          workspace: workspace || '',
          model: this.defaultModelId,
          is_visible: true
        })
      }
      
      return id
    },

    async removeInstance(id: string) {
      delete this.instances[id]
      this.instanceIds = this.instanceIds.filter(i => i !== id)
      
      // Delete from SQLite
      if ((window as any).electron) {
        await (window as any).electron.ipcRenderer.invoke('agents:delete', id)
      }
    },

    async toggleVisibility(id: string) {
      const instance = this.instances[id]
      if (instance) {
        instance.isVisible = !instance.isVisible
        
        // Update in SQLite
        if ((window as any).electron) {
          await (window as any).electron.ipcRenderer.invoke('agents:updateVisibility', { id, isVisible: instance.isVisible })
        }
      }
    },

    async sendMessage(instanceId: string, prompt: string) {
      const instance = this.instances[instanceId]
      if (!instance) return

      if (instance.isProcessing) {
        instance.messageQueue.push(prompt)
        return
      }

      instance.isProcessing = true
      const userMessage: Message = { role: 'user', content: prompt }
      instance.messages.push(userMessage)
      
      // Persist user message to SQLite
      if ((window as any).electron) {
        const result = await (window as any).electron.ipcRenderer.invoke('messages:add', {
          agentId: instanceId,
          role: 'user',
          content: prompt
        })
        userMessage.id = result.id
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: '',
        events: [],
        isStreaming: true,
        model: instance.currentModel
      }
      instance.messages.push(assistantMessage)
      
      // Persist assistant message placeholder to SQLite
      if ((window as any).electron) {
        const result = await (window as any).electron.ipcRenderer.invoke('messages:add', {
          agentId: instanceId,
          role: 'assistant',
          content: '',
          model: instance.currentModel
        })
        assistantMessage.id = result.id
      }

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
        
        // Update assistant message in SQLite with final content
        if ((window as any).electron && assistantMessage.id) {
          await (window as any).electron.ipcRenderer.invoke('messages:update', {
            id: assistantMessage.id,
            content: assistantMessage.content
          })
        }

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

    async clearMemory(instanceId: string) {
      if (this.instances[instanceId]) {
        this.instances[instanceId].messages = []
        
        // Clear messages in SQLite
        if ((window as any).electron) {
          await (window as any).electron.ipcRenderer.invoke('messages:clearForAgent', instanceId)
        }
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
    },

    async getSetting(key: string): Promise<string | null> {
      try {
        if ((window as any).electron) {
          return await (window as any).electron.ipcRenderer.invoke('settings:get', key)
        }
        return null
      } catch (e) {
        console.error(`Failed to get setting: ${key}`, e)
        return null
      }
    },

    async setSetting(key: string, value: string): Promise<boolean> {
      try {
        if ((window as any).electron) {
          await (window as any).electron.ipcRenderer.invoke('settings:set', { key, value })
          return true
        }
        return false
      } catch (e) {
        console.error(`Failed to set setting: ${key}`, e)
        return false
      }
    },

    async loadAgents() {
      try {
        if ((window as any).electron) {
          const agents = await (window as any).electron.ipcRenderer.invoke('agents:list')
          
          for (const agent of agents) {
            // Load messages for each agent
            const messages = await (window as any).electron.ipcRenderer.invoke('messages:list', agent.id)
            
            this.instances[agent.id] = {
              id: agent.id,
              name: agent.name,
              messages: messages.map((m: any) => ({
                id: m.id,
                role: m.role,
                content: m.content,
                model: m.model
              })),
              isProcessing: false,
              currentWorkspace: agent.workspace,
              currentModel: agent.model,
              isVisible: agent.is_visible === 1,
              colSpan: 1,
              messageQueue: [],
              abortController: null
            }
            this.instanceIds.push(agent.id)
          }
          
          console.log(`[AgentStore] Loaded ${agents.length} agents from SQLite`)
        }
      } catch (e) {
        console.error('Failed to load agents from SQLite', e)
      }
    },

    async updateInstance(instanceId: string, updates: Partial<{ name: string; workspace: string; model: string }>) {
      const instance = this.instances[instanceId]
      if (!instance) return
      
      if (updates.name !== undefined) instance.name = updates.name
      if (updates.workspace !== undefined) instance.currentWorkspace = updates.workspace
      if (updates.model !== undefined) instance.currentModel = updates.model
      
      // Persist to SQLite
      if ((window as any).electron) {
        await (window as any).electron.ipcRenderer.invoke('agents:save', {
          id: instanceId,
          name: instance.name,
          workspace: instance.currentWorkspace,
          model: instance.currentModel,
          is_visible: instance.isVisible
        })
      }
    }
  }
})
