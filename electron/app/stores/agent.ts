import { defineStore } from 'pinia'
import { useUserStore } from './user'
import { COMPONENTS, type AgentComponent } from '~/src/Core/Data/components'

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
  color?: string
  icon?: string
  description?: string
  persona?: string
  lottie?: string
  workspaceId: string
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
  workspaces: Record<string, Workspace>
  workspaceIds: string[]
  viewMode: 'mosaic' | 'desktop'
  currentView: 'grid' | 'workspaces' | 'workspace-detail'
  activeWorkspaceId: string | null
  // Layout persistence: keyed by agent IDs hash
  customLayouts: Record<string, any>
}

// AGENT_NAMES is deprecated in favor of AGENTS_REPO

export const useAgentStore = defineStore('agent', {
  state: (): State => ({
    instances: {},
    instanceIds: [],
    availableProviders: [],
    defaultProviderId: 'openrouter',
    defaultModelId: 'qwen/qwen3-coder-next',
    backendUrl: 'http://localhost:3710',
    filesCache: {},
    workspaces: {},
    workspaceIds: [],
    activeWorkspaceId: null,
    viewMode: 'mosaic',
    currentView: 'grid',
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
    async createInstance() {
      if (!this.activeWorkspaceId) return
      const activeWorkspace = this.workspaces[this.activeWorkspaceId]
      const workspacePath = activeWorkspace?.path || ''

      const id = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(7)
      
      // Filter for agents with Lottie animations
      const lottieAgents = COMPONENTS.filter(a => !!a.lottie)
      const pool = lottieAgents.length > 0 ? lottieAgents : COMPONENTS

      const agent = pool[Math.floor(Math.random() * pool.length)]
      if (!agent) return
      
      const name = agent.name
      this.instances[id] = {
        id,
        name,
        messages: [],
        isProcessing: false,
        currentWorkspace: workspacePath,
        currentModel: this.defaultModelId,
        isVisible: true,
        colSpan: 1,
        messageQueue: [],
        abortController: null,
        color: agent.color,
        icon: agent.icon,
        description: agent.description,
        persona: agent.systemPrompt,
        lottie: agent.lottie,
        workspaceId: this.activeWorkspaceId as string
      }
      this.instanceIds.push(id)
      
      // Persist to SQLite
      if ((window as any).electron) {
        await (window as any).electron.ipcRenderer.invoke('agents:save', {
          id,
          name,
          workspace: workspacePath,
          model: this.defaultModelId,
          is_visible: true,
          color: agent.color,
          icon: agent.icon,
          description: agent.description,
          desktop_id: this.activeWorkspaceId
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
            user_name: userStore.userName || 'User',
            history: instance.messages.slice(0, -2).map(m => ({ 
              role: m.role, 
              content: m.content 
            })),
            persona: instance.persona
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
          if (event.data && event.data.trim().length > 0) {
            lastMessage.content = event.data
          }
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
    
    // Workspace Actions
    async loadWorkspaces() {
      try {
        if ((window as any).electron) {
          console.log('[AgentStore] Loading workspaces...')
          const workspaces = await (window as any).electron.ipcRenderer.invoke('desktops:list')
          console.log('[AgentStore] Workspaces loaded:', workspaces)
          this.workspaces = {}
          this.workspaceIds = []
          for (const w of workspaces) {
            this.workspaces[w.id] = w
            this.workspaceIds.push(w.id)
          }
          if (this.workspaceIds.length > 0 && !this.activeWorkspaceId) {
            this.activeWorkspaceId = this.workspaceIds[0] || null
          }
        }
      } catch (e) {
        console.error('[AgentStore] Failed to load workspaces', e)
      }
    },

    async saveWorkspace(workspace: Workspace) {
      console.log('[AgentStore] Saving workspace:', workspace)
      this.workspaces = { ...this.workspaces, [workspace.id]: workspace }
      
      if (!this.workspaceIds.includes(workspace.id)) {
        this.workspaceIds.push(workspace.id)
      }
      
      if ((window as any).electron) {
        try {
          await (window as any).electron.ipcRenderer.invoke('desktops:save', workspace)
        } catch (e) {
          console.error('[AgentStore] Failed to save workspace to DB:', e)
        }
      }
    },

    async removeWorkspace(id: string) {
      delete this.workspaces[id]
      this.workspaceIds = this.workspaceIds.filter(i => i !== id)
      if (this.activeWorkspaceId === id) {
        this.activeWorkspaceId = this.workspaceIds.length > 0 ? (this.workspaceIds[0] || null) : null
      }
      if ((window as any).electron) {
        await (window as any).electron.ipcRenderer.invoke('desktops:delete', id)
      }
    },

    setActiveWorkspace(id: string | null) {
      this.activeWorkspaceId = id
      this.viewMode = id ? 'desktop' : 'mosaic'
    },

    setViewMode(mode: 'mosaic' | 'desktop') {
      this.viewMode = mode
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

    async loadAgents() {
      try {
        if ((window as any).electron) {
          const agents = await (window as any).electron.ipcRenderer.invoke('agents:list')
          
          for (const agent of agents) {
            // Load messages for each agent
            const messages = await (window as any).electron.ipcRenderer.invoke('messages:list', agent.id)
            
            // Try to find matching config for persona/icon if not in DB
            const config = COMPONENTS.find(a => a.name === agent.name)

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
              abortController: null,
              color: agent.color || config?.color,
              icon: agent.icon || config?.icon,
              description: agent.description || config?.description,
              persona: config?.systemPrompt,
              lottie: config?.lottie,
              workspaceId: agent.desktop_id || (this.workspaceIds.length > 0 ? this.workspaceIds[0] : null)
            }
            this.instanceIds.push(agent.id)
          }
          
          await this.loadWorkspaces()
          
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
