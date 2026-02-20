import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
    invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),

    onEvent: (channel: string, callback: (data: any) => void) => {
        const handler = (_event: any, data: any) => callback(data)
        ipcRenderer.on(channel, handler)
        // Return unlisten function
        return () => {
            ipcRenderer.removeListener(channel, handler)
        }
    },
})
