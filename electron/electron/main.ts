import { app, BrowserWindow, ipcMain } from 'electron'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { is } from '@electron-toolkit/utils'

const __dirname = dirname(fileURLToPath(import.meta.url))
import { Agent } from './src/Core/Agent'
import { OpenRouter } from './src/Core/LLM/OpenRouter'
import { FileSystemService } from './src/Framework/FileSystem/FileSystemService'
import { WorkspaceService } from './src/Framework/Workspace/WorkspaceService'
import * as dotenv from 'dotenv'

dotenv.config({ path: join(process.cwd(), '.env') })
dotenv.config({ path: join(process.cwd(), '..', '.env') })

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
const fileSystemService = new FileSystemService()
const workspaceService = new WorkspaceService()
const llmProvider = new OpenRouter(process.env.OPENROUTER_API_KEY || '')
console.log('[Main] Services initialized')

// IPC Handlers
ipcMain.handle('ping', () => 'pong')

ipcMain.handle('fs:ls', async (_event, path: string) => {
  return { directories: await fileSystemService.listDirectories(path) }
})

ipcMain.handle('fs:files', async (_event, path: string) => {
  return { files: await fileSystemService.listFiles(path) }
})

ipcMain.handle('agent:stream', async (event, { user_prompt, workspace, model_id, user_name }) => {
  console.log(`[Main] agent:stream received. Prompt: "${user_prompt.substring(0, 50)}...", Model: ${model_id}`)
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
    await agent.run(user_prompt)
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
