"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("api", {
  invoke: (channel, ...args) => electron.ipcRenderer.invoke(channel, ...args),
  onEvent: (channel, callback) => {
    const handler = (_event, data) => callback(data);
    electron.ipcRenderer.on(channel, handler);
    return () => {
      electron.ipcRenderer.removeListener(channel, handler);
    };
  }
});
