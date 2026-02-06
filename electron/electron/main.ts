import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { is } from '@electron-toolkit/utils'
import fs from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
import { Agent } from './src/Core/Agent'
import { OpenRouter } from './src/Core/LLM/OpenRouter'
import { FileSystemService } from './src/Framework/FileSystem/FileSystemService'
import { WorkspaceService } from './src/Framework/Workspace/WorkspaceService'
import * as dotenv from 'dotenv'

dotenv.config({ path: join(process.cwd(), '.env') })
dotenv.config({ path: join(process.cwd(), '..', '.env') })

import { DatabaseService } from './src/Framework/Database/DatabaseService'

console.log('[Main] process.cwd():', process.cwd())
console.log('[Main] __dirname:', __dirname)
console.log('[Main] Configuration loaded. API Key present:', !!process.env.OPENROUTER_API_KEY)
if (process.env.OPENROUTER_API_KEY) {
  console.log('[Main] API Key prefix:', process.env.OPENROUTER_API_KEY.substring(0, 10) + '...')
}

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon: join(__dirname, '../../build/icon.png') } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/preload.mjs'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Backend Services
const databaseService = new DatabaseService()
const fileSystemService = new FileSystemService()
const workspaceService = new WorkspaceService()

// Initialize LLM provider with API key from database (if exists)
const storedApiKey = databaseService.getSetting('openrouter_api_key')
const llmProvider = new OpenRouter(storedApiKey || '')

console.log('[Main] Services initialized')
console.log('[Main] API Key from DB present:', !!storedApiKey)

// IPC Handlers
ipcMain.handle('ping', () => 'pong')

ipcMain.handle('dialog:openDirectory', async (event) => {
  const browserWindow = BrowserWindow.fromWebContents(event.sender)
  if (!browserWindow) return { canceled: true }
  
  const { canceled, filePaths } = await dialog.showOpenDialog(browserWindow, {
    properties: ['openDirectory']
  })
  
  if (canceled) {
    return { canceled: true }
  } else {
    return { canceled: false, path: filePaths[0] }
  }
})

ipcMain.handle('fs:ls', async (_event, path: string) => {
  return { directories: await fileSystemService.listDirectories(path) }
})

ipcMain.handle('fs:files', async (_event, path: string) => {
  return { files: await fileSystemService.listFiles(path) }
})

ipcMain.handle('fs:mkdir', async (_event, { path, folderName }) => {
  try {
    await fileSystemService.createDirectory(path, folderName)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('agent:stream', async (event, { user_prompt, workspace, model_id, user_name, history, persona }) => {
  console.log(`[Main] agent:stream received. Prompt: "${user_prompt.substring(0, 50)}...", Model: ${model_id}, Persona present: ${!!persona}`)
  const agent = new Agent(
    llmProvider,
    model_id,
    workspace,
    user_name,
    (agentEvent) => {
      // Send event back to the renderer window that initiated the request
      if (agentEvent.type !== 'token') {
        console.log(`[Main] Agent event: ${agentEvent.type}`, agentEvent.name || agentEvent.message || '')
      }
      event.sender.send('agent:event', agentEvent)
    }
  )

  try {
    await agent.run(user_prompt, history || [], persona)
    console.log('[Main] Agent run completed')
  } catch (error: any) {
    console.error('[Main] Agent run error:', error.message)
    event.sender.send('agent:event', { type: 'error', message: error.message })
  }
})

// Provider list (hardcoded for now to match old backend)
ipcMain.handle('providers:get', () => {
  return {
    providers: [{
      id: 'openrouter',
      name: 'OpenRouter',
      models: [
        { id: 'qwen/qwen3-coder-next', name: 'Qwen 3 Coder Next' },
        { id: 'qwen/qwen3-vl-8b-thinking', name: 'Qwen 3 VL 8B Thinking' },
        { id: 'deepseek/deepseek-v3.2', name: 'DeepSeek 3.2' },
        { id: 'mistralai/devstral-2512', name: 'Devstral 2512' },
        { id: 'stepfun/step-3.5-flash:free', name: 'Step 3.5 Flash' },
      ]
    }]
  }
})

// Workspace Handlers
ipcMain.handle('workspaces:get', async () => {
  return await workspaceService.getWorkspaces()
})

ipcMain.handle('workspaces:save', async (_event, workspace) => {
  return await workspaceService.saveWorkspace(workspace)
})

ipcMain.handle('workspaces:delete', async (_event, id) => {
  return await workspaceService.deleteWorkspace(id)
})

// Settings Handlers
ipcMain.handle('settings:get', (_event, key: string) => {
  return databaseService.getSetting(key)
})

ipcMain.handle('settings:set', (_event, { key, value }) => {
  databaseService.setSetting(key, value)
  
  // If we're updating the OpenRouter API Key, we need to update the llmProvider
  if (key === 'openrouter_api_key') {
    llmProvider.updateApiKey(value)
    console.log('[Main] OpenRouter API Key updated in provider')
  }
  
  return { success: true }
})

// Agent Handlers
ipcMain.handle('agents:list', () => {
  return databaseService.getAgents()
})

ipcMain.handle('agents:get', (_event, id: string) => {
  return databaseService.getAgent(id)
})

ipcMain.handle('agents:save', (_event, agent: { id: string; name: string; workspace: string; model: string; is_visible?: boolean; color?: string; icon?: string; description?: string; desktop_id?: string }) => {
  databaseService.saveAgent(agent)
  return { success: true }
})

ipcMain.handle('agents:updateVisibility', (_event, { id, isVisible }: { id: string; isVisible: boolean }) => {
  databaseService.updateAgentVisibility(id, isVisible)
  return { success: true }
})

ipcMain.handle('agents:delete', (_event, id: string) => {
  databaseService.deleteAgent(id)
  return { success: true }
})

// Desktop Handlers
ipcMain.handle('desktops:list', () => {
  console.log('[Main] Handling desktops:list')
  return databaseService.getDesktops()
})

ipcMain.handle('desktops:save', (_event, desktop: { id: string; name: string; color?: string; path?: string }) => {
  console.log('[Main] Handling desktops:save:', desktop)
  databaseService.saveDesktop(desktop)
  return { success: true }
})

ipcMain.handle('desktops:delete', (_event, id: string) => {
  console.log('[Main] Handling desktops:delete:', id)
  databaseService.deleteDesktop(id)
  return { success: true }
})

// Message Handlers
ipcMain.handle('messages:list', (_event, agentId: string) => {
  return databaseService.getMessages(agentId)
})

ipcMain.handle('messages:add', (_event, { agentId, role, content, model }: { agentId: string; role: string; content: string; model?: string }) => {
  const id = databaseService.addMessage(agentId, role, content, model)
  return { id }
})

ipcMain.handle('messages:update', (_event, { id, content }: { id: number; content: string }) => {
  databaseService.updateMessage(id, content)
  return { success: true }
})

ipcMain.handle('messages:clearForAgent', (_event, agentId: string) => {
  databaseService.deleteMessagesForAgent(agentId)
  return { success: true }
})

// Data Reset Handler
ipcMain.handle('app:resetData', async () => {
  console.log('[Main] Handling app:resetData - Resetting all data...')
  try {
    const dbPath = databaseService.getDatabasePath()
    
    // 1. Close the database connection
    databaseService.close()
    
    // 2. Delete the database file
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath)
      console.log('[Main] Database file deleted:', dbPath)
    }
    
    // 3. Relaunch the application
    app.relaunch()
    app.exit(0)
    
    return { success: true }
  } catch (error: any) {
    console.error('[Main] Failed to reset data:', error)
    return { success: false, error: error.message }
  }
})

