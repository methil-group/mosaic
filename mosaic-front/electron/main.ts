import { app, BrowserWindow, ipcMain } from 'electron'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { is } from '@electron-toolkit/utils'

const __dirname = dirname(fileURLToPath(import.meta.url))
import { Agent } from './src/core/Agent'
import { OpenRouterProvier } from './src/core/LLMProvider'
import { FileSystemService } from './src/core/FileSystemService'
import * as dotenv from 'dotenv'

dotenv.config({ path: join(process.cwd(), '.env') })

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon: join(__dirname, '../../build/icon.png') } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
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
const llmProvider = new OpenRouterProvier()

// IPC Handlers
ipcMain.handle('ping', () => 'pong')

ipcMain.handle('fs:ls', async (_event, path: string) => {
  return { directories: await fileSystemService.listDirectories(path) }
})

ipcMain.handle('fs:files', async (_event, path: string) => {
  return { files: await fileSystemService.listFiles(path) }
})

ipcMain.handle('agent:stream', async (event, { user_prompt, workspace, model_id, user_name }) => {
  const agent = new Agent(
    llmProvider,
    model_id,
    workspace,
    user_name,
    (agentEvent) => {
      // Send event back to the renderer window that initiated the request
      event.sender.send('agent:event', agentEvent)
    }
  )

  try {
    await agent.run(user_prompt)
  } catch (error: any) {
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
      ]
    }]
  }
})
