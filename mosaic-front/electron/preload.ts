import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  // Agent methods
  streamAgent: (params: any) => ipcRenderer.invoke('agent:stream', params),
  listDirectories: (path: string) => ipcRenderer.invoke('fs:ls', path),
  fetchFiles: (path: string) => ipcRenderer.invoke('fs:files', path),
  
  // Event listeners for streaming
  onAgentEvent: (callback: (event: any) => void) => {
    const listener = (_event: any, data: any) => callback(data)
    ipcRenderer.on('agent:event', listener)
    return () => ipcRenderer.removeListener('agent:event', listener)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in window)
  window.electron = electronAPI
  // @ts-ignore (define in window)
  window.api = api
}
