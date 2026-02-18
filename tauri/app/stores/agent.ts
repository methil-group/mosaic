import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { defineStore } from 'pinia'
import { useUserStore } from './user'
import { COMPONENTS, type AgentComponent } from '~/src/Core/Data/components'

export type AgentEvent =
  | { type: 'token', data: string }
  | { type: 'tool_started', name: string, parameters: string }
  | { type: 'tool_finished', name: string, result: string }
  | { type: 'final_answer', data: string }
  | { type: 'error', message: string }
  | { type: 'usage', data: string }

export interface Message {
  id?: number // SQLite row id
  role: 'user' | 'assistant'
  content: string
  events?: AgentEvent[]
  isStreaming?: boolean
  model?: string
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export interface InstanceState {
  id: string
  name: string
  messages: Message[]
  isProcessing: boolean
  currentWorkspace: string
  currentModel: string
  currentProvider: string
  isVisible: boolean
  colSpan: number
  messageQueue: string[]
  abortController: AbortController | null
  color?: string
  icon?: string
  description?: string
  persona?: string
  lottie?: string
  video?: string
  workspaceId: string
  isStoppedManually?: boolean
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
  systemPaths: {
    home: string | null
    desktop: string | null
    documents: string | null
    downloads: string | null
  }
  pathSeparator: string
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
    customLayouts: {},
    systemPaths: {
      home: null,
      desktop: null,
      documents: null,
      downloads: null
    },
    pathSeparator: '/'
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
        currentProvider: 'openrouter',
        isVisible: true,
        colSpan: 1,
        messageQueue: [],
        abortController: null,
        color: agent.color,
        icon: agent.icon,
        description: agent.description,
        persona: agent.systemPrompt,
        lottie: agent.lottie,
        video: agent.video,
        workspaceId: this.activeWorkspaceId as string
      }
      this.instanceIds.push(id)

      // Persist to SQLite
      await invoke('agents_save', {
        agent: {
          id,
          name,
          workspace: workspacePath,
          provider: 'openrouter',
          is_visible: true,
          color: agent.color,
          icon: agent.icon,
          description: agent.description,
          desktop_id: this.activeWorkspaceId,
          video: agent.video,
          lottie: agent.lottie,
          model: this.defaultModelId
        }
      })

      return id
    },

    async removeInstance(id: string) {
      delete this.instances[id]
      this.instanceIds = this.instanceIds.filter(i => i !== id)

      // Delete from SQLite
      await invoke('agents_delete', { id })
    },

    async toggleVisibility(id: string) {
      const instance = this.instances[id]
      if (instance) {
        instance.isVisible = !instance.isVisible

        // Update in SQLite
        await invoke('agents_update_visibility', { id, isVisible: instance.isVisible })
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
      const result: any = await invoke('messages_add', {
        agentId: instanceId,
        role: 'user',
        content: prompt
      })
      userMessage.id = result.id

      const assistantMessage: Message = {
        role: 'assistant',
        content: '',
        events: [],
        isStreaming: true,
        model: instance.currentModel
      }
      instance.messages.push(assistantMessage)

      // Persist assistant message placeholder to SQLite
      const assistResult: any = await invoke('messages_add', {
        agentId: instanceId,
        role: 'assistant',
        content: '',
        model: instance.currentModel
      })
      assistantMessage.id = assistResult.id

      try {
        const userStore = useUserStore()

        // Listen for agent events
        const unlisten = await listen('agent-event', (event: any) => {
          const { instanceId: evtInstanceId, event: agentEvent } = event.payload;
          if (evtInstanceId === instanceId) {
            this.handleEvent(instanceId, agentEvent)
          }
        })

        instance.abortController = new AbortController()

        await invoke('agent_stream', {
          instanceId,
          userPrompt: prompt,
          workspace: instance.currentWorkspace,
          modelId: instance.currentModel,
          userName: userStore.userName || 'User',
          history: instance.messages.slice(0, -2).map(m => ({
            role: m.role,
            content: m.content
          })),
          persona: instance.persona
        })

        unlisten()
      } catch (error: any) {
        console.error('Agent error:', error)
        assistantMessage.content += `\n\n[Error: ${error.message || error}]`
      } finally {
        instance.isProcessing = false
        assistantMessage.isStreaming = false
        instance.abortController = null

        // Update assistant message in SQLite with final content and events
        if (assistantMessage.id) {
          // Add a user-friendly indicator if stopped
          if (instance.isStoppedManually) {
            assistantMessage.content += "\n\n*(Message stopped by user)*"
            instance.isStoppedManually = false
          }

          await invoke('messages_update', {
            id: assistantMessage.id,
            content: assistantMessage.content,
            events: assistantMessage.events ? JSON.stringify(assistantMessage.events) : null
          })
        }

        // Process next in queue
        if (instance.messageQueue.length > 0) {
          const nextPrompt = instance.messageQueue.shift()!
          this.sendMessage(instanceId, nextPrompt)
        }
      }
    },

    async stopProcessing(instanceId: string) {
      const instance = this.instances[instanceId]
      if (instance) {
        if (instance.abortController) {
          instance.abortController.abort()
        }

        await invoke('stop_agent', { instanceId })

        instance.isStoppedManually = true
        instance.isProcessing = false
        instance.abortController = null
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
        } else if (event.type === 'usage') {
          try {
            if (event.data) {
              lastMessage.usage = JSON.parse(event.data);
            }
          } catch (e) {
            console.error('Failed to parse usage data', e);
          }
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
        await invoke('messages_clear_for_agent', { instanceId })
      }
    },

    async listDirectories(path: string, show_hidden: boolean = false): Promise<string[]> {
      try {
        const data: any = await invoke('list_directories', { path, show_hidden })
        return data.directories || []
      } catch (e) {
        console.error('Failed to list directories', e)
        return []
      }
    },

    async fetchFiles(path: string, show_hidden: boolean = false): Promise<string[]> {
      if (this.filesCache[path]) return this.filesCache[path]

      try {
        const data: any = await invoke('fetch_files', { path, show_hidden })
        const files = data.files || []
        this.filesCache[path] = files
        return files
      } catch (e) {
        console.error('Failed to fetch files', e)
        return []
      }
    },

    async initSystemPaths() {
      try {
        const paths: any = await invoke('get_system_paths')
        this.systemPaths = {
          home: paths.home,
          desktop: paths.desktop,
          documents: paths.documents,
          downloads: paths.downloads
        }
        this.pathSeparator = paths.sep || '/'
        console.log('[AgentStore] System paths initialized:', this.systemPaths)
      } catch (e) {
        console.error('[AgentStore] Failed to init system paths', e)
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
        const workspaces: any = await invoke('desktops_list')
        this.workspaces = {}
        this.workspaceIds = []
        for (const w of workspaces) {
          this.workspaces[w.id] = w
          this.workspaceIds.push(w.id)
        }
        if (this.workspaceIds.length > 0 && !this.activeWorkspaceId) {
          this.activeWorkspaceId = this.workspaceIds[0] || null
        }
      } catch (e) {
        console.error('[AgentStore] Failed to load workspaces', e)
      }
    },

    async saveWorkspace(workspace: Workspace) {
      console.log('[AgentStore] Saving workspace:', workspace)
      this.workspaces = { ...this.workspaces, [workspace.id]: workspace }

      if (!this.workspaceIds.includes(workspace.id)) {
        this.workspaceIds = [...this.workspaceIds, workspace.id]
      }

      await invoke('desktops_save', {
        desktop: {
          id: workspace.id,
          name: workspace.name,
          color: workspace.color,
          path: workspace.path
        }
      })
    },

    async removeWorkspace(id: string) {
      delete this.workspaces[id]
      this.workspaceIds = this.workspaceIds.filter(i => i !== id)
      if (this.activeWorkspaceId === id) {
        this.activeWorkspaceId = this.workspaceIds.length > 0 ? (this.workspaceIds[0] || null) : null
      }
      await invoke('desktops_delete', { id })
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
        return await invoke('settings_get', { key })
        return null
      } catch (e) {
        console.error(`Failed to get setting: ${key}`, e)
        return null
      }
    },

    async setSetting(key: string, value: string): Promise<boolean> {
      try {
        await invoke('settings_set', { key, value })
        return true
        return false
      } catch (e) {
        console.error(`Failed to set setting: ${key}`, e)
        return false
      }
    },

    async fetchProviders() {
      try {
        const data: any = await invoke('providers_get')
        this.availableProviders = data.providers || []
      } catch (e) {
        // Handle silently as this is polled
      }
    },

    startProviderPolling() {
      // Fetch immediately
      this.fetchProviders()
      // Then every 10 seconds
      setInterval(() => {
        this.fetchProviders()
      }, 10000)
    },

    async loadAgents() {
      try {
        const agents: any = await invoke('get_agents')

        // Clear existing state to avoid duplicates
        this.instances = {}
        this.instanceIds = []

        // Load messages for all agents in parallel
        const agentsWithMessages = await Promise.all(agents.map(async (agent: any) => {
          try {
            const messages: any = await invoke('messages_list', { agentId: agent.id })
            return { agent, messages }
          } catch (e) {
            console.error(`Failed to load messages for agent ${agent.id}`, e)
            return { agent, messages: [] }
          }
        }))

        for (const { agent, messages } of agentsWithMessages) {
          // Try to find matching config for persona/icon if not in DB
          const config = COMPONENTS.find(a => a.name === agent.name)

          this.instances[agent.id] = {
            id: agent.id,
            name: agent.name,
            messages: messages.map((m: any) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              model: m.model,
              events: m.events ? JSON.parse(m.events) : []
            })),
            isProcessing: false,
            currentWorkspace: agent.workspace,
            currentModel: agent.model,
            currentProvider: agent.provider || 'openrouter',
            isVisible: !!agent.is_visible,
            colSpan: 1,
            messageQueue: [],
            abortController: null,
            color: agent.color || config?.color,
            icon: agent.icon || config?.icon,
            description: agent.description || config?.description,
            persona: config?.systemPrompt,
            lottie: config?.lottie,
            video: config?.video,
            workspaceId: agent.desktop_id || (this.workspaceIds.length > 0 ? this.workspaceIds[0] : null)
          }
          this.instanceIds.push(agent.id)
        }

        console.log(`[AgentStore] Loaded ${agents.length} agents from SQLite`)
      } catch (e) {
        console.error('Failed to load agents from SQLite', e)
      }
    },

    async updateInstance(instanceId: string, updates: Partial<{ name: string; workspace: string; model: string; provider: string }>) {
      const instance = this.instances[instanceId]
      if (!instance) return

      if (updates.name !== undefined) instance.name = updates.name
      if (updates.workspace !== undefined) instance.currentWorkspace = updates.workspace
      if (updates.model !== undefined) instance.currentModel = updates.model
      if (updates.provider !== undefined) instance.currentProvider = updates.provider

      // Persist to SQLite
      await invoke('agents_save', {
        agent: {
          id: instanceId,
          name: instance.name,
          workspace: instance.currentWorkspace,
          model: instance.currentModel,
          provider: instance.currentProvider,
          is_visible: instance.isVisible,
          color: instance.color,
          icon: instance.icon,
          description: instance.description,
          desktop_id: instance.workspaceId,
          video: instance.video,
          lottie: instance.lottie
        }
      })
    }
  }
})
