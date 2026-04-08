import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import os from 'os'
import fs from 'fs'
import DbService from './db'
import OpenRouter from './framework/llm/openrouter'
import LMStudio from './framework/llm/lmstudio'
import type { LlmProvider, Message } from './framework/llm/types'
import Agent from './core/agent'
import ToolRegistry, { getDefaultTools } from './core/tools/index'

// ─── State ───────────────────────────────────────────────────────────────────

let db: DbService
let tools: ToolRegistry
let openRouter: OpenRouter
let lmStudio: LMStudio
let mainWindow: BrowserWindow | null = null
const activeAgents = new Map<string, Agent>()

// ─── Window ──────────────────────────────────────────────────────────────────

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 800,
        minHeight: 600,
        title: 'Mosaic',
        webPreferences: {
            preload: path.join(__dirname, '../preload/preload.cjs'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    })

    if (process.env.NODE_ENV === 'development') {
        mainWindow.loadURL('http://localhost:3710')
    } else {
        mainWindow.loadFile(path.join(__dirname, '../../.output/public/index.html'))
    }

    mainWindow.on('closed', () => { mainWindow = null })
}

// ─── IPC Handlers ────────────────────────────────────────────────────────────

function registerIpc() {
    ipcMain.handle('ping', () => 'pong')

    // ── Agents ──
    ipcMain.handle('get_agents', () => db.getAgents())

    ipcMain.handle('agents_save', (_e: any, { agent }: any) => {
        db.saveAgent(agent)
    })

    ipcMain.handle('agents_delete', (_e: any, { id }: any) => {
        db.deleteAgent(id)
    })

    ipcMain.handle('agents_update_visibility', (_e: any, { id, isVisible }: any) => {
        db.updateAgentVisibility(id, isVisible)
    })

    // ── Messages ──
    ipcMain.handle('messages_list', (_e: any, { agentId }: any) => db.getMessages(agentId))

    ipcMain.handle('messages_add', (_e: any, { agentId, role, content, model }: any) => {
        return db.addMessage(agentId, role, content, model)
    })

    ipcMain.handle('messages_update', (_e: any, { id, content, events }: any) => {
        db.updateMessage(id, content, events)
    })

    ipcMain.handle('messages_clear_for_agent', (_e: any, { instanceId }: any) => {
        db.clearMessagesForAgent(instanceId)
    })

    // ── Desktops (Workspaces) ──
    ipcMain.handle('desktops_list', () => db.getDesktops())

    ipcMain.handle('desktops_save', (_e: any, { desktop }: any) => {
        db.saveDesktop(desktop)
    })

    ipcMain.handle('desktops_delete', (_e: any, { id }: any) => {
        db.deleteDesktop(id)
    })

    // ── Settings ──
    ipcMain.handle('settings_get', (_e: any, { key }: any) => db.getSetting(key))

    ipcMain.handle('settings_set', (_e: any, { key, value }: any) => {
        db.setSetting(key, value)
    })

    // ── Providers ──
    ipcMain.handle('providers_get', async () => {
        const lmStudioModels = await lmStudio.fetchModels().catch(() => [])

        return {
            providers: [
                {
                    id: 'openrouter',
                    name: 'OpenRouter',
                    models: [
                        { id: 'deepseek/deepseek-chat', name: 'DeepSeek V3' },
                        { id: 'qwen/qwen3.5-397b-a17b', name: 'Qwen 3.5 397B' },
                        { id: 'qwen/qwen3-coder-next', name: 'Qwen3 Coder next' },
                    ],
                },
                {
                    id: 'lmstudio',
                    name: 'LM Studio (Local)',
                    models: lmStudioModels.map(m => ({ id: m, name: m })),
                },
            ],
        }
    })

    // ── File System ──
    ipcMain.handle('list_directories', (_e: any, { path: dirPath, show_hidden }: any) => {
        try {
            const entries = fs.readdirSync(dirPath, { withFileTypes: true })
            const dirs = entries
                .filter(e => e.isDirectory())
                .filter(e => show_hidden || !e.name.startsWith('.'))
                .map(e => e.name)
            return { directories: dirs }
        } catch {
            return { directories: [] }
        }
    })

    ipcMain.handle('fetch_files', (_e: any, { path: dirPath, show_hidden }: any) => {
        try {
            const entries = fs.readdirSync(dirPath, { withFileTypes: true })
            const files = entries
                .filter(e => e.isFile())
                .filter(e => show_hidden || !e.name.startsWith('.'))
                .map(e => e.name)
            return { files }
        } catch {
            return { files: [] }
        }
    })

    ipcMain.handle('get_system_paths', () => ({
        home: os.homedir(),
        desktop: path.join(os.homedir(), 'Desktop'),
        documents: path.join(os.homedir(), 'Documents'),
        downloads: path.join(os.homedir(), 'Downloads'),
        sep: path.sep,
    }))

    ipcMain.handle('create_directory', (_e: any, { path: dirPath, name }: any) => {
        const full = path.join(dirPath, name)
        if (!fs.existsSync(full)) fs.mkdirSync(full, { recursive: true })
    })

    ipcMain.handle('app_reset_data', () => {
        db.resetDatabase()
    })

    // ── Agent Streaming ──
    ipcMain.handle('agent_stream', async (_e: any, { instanceId, modelId, userPrompt, workspace, userName, history, persona }: any) => {
        const dbAgent = db.getAgent(instanceId)
        const providerId = dbAgent?.provider || (modelId.includes('/') ? 'openrouter' : 'lmstudio')

        const apiKey = db.getSetting('openrouter_api_key') || ''
        const currentOpenRouter = new OpenRouter(apiKey)

        const provider: LlmProvider = providerId === 'lmstudio' ? lmStudio : currentOpenRouter

        const agent = new Agent(provider, modelId, workspace, userName, tools)
        activeAgents.set(instanceId, agent)

        try {
            await agent.run(
                userPrompt,
                history as Message[],
                persona,
                (event) => {
                    if (mainWindow && !mainWindow.isDestroyed()) {
                        mainWindow.webContents.send('agent-event', {
                            instanceId,
                            event,
                        })
                    }
                },
            )
        } finally {
            activeAgents.delete(instanceId)
        }
    })

    ipcMain.handle('stop_agent', (_e: any, { instanceId }: any) => {
        const agent = activeAgents.get(instanceId)
        if (agent) {
            agent.stop()
            activeAgents.delete(instanceId)
            return true
        }
        return false
    })
}

// ─── App Lifecycle ───────────────────────────────────────────────────────────

app.whenReady().then(() => {
    db = new DbService()
    tools = getDefaultTools()
    openRouter = new OpenRouter(db.getSetting('openrouter_api_key') || '')
    lmStudio = new LMStudio()

    registerIpc()
    createWindow()

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})

app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('enable-features', 'Vulkan');