"use strict";
const electron = require("electron");
console.log("--- Preload script started ---");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  send: (channel, data) => {
    electron.ipcRenderer.send(channel, data);
  },
  receive: (channel, func) => {
    let validChannels = ["fromMain"];
    if (validChannels.includes(channel)) {
      electron.ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  },
  // Expose a function to send a message to the main process requesting the dialog
  openFileSelectDialog: () => electron.ipcRenderer.send("open-file-dialog"),
  // Expose a function to listen for the result from the main process
  // The callback will receive the array of selected file/folder paths
  onFileSelect: (callback) => {
    electron.ipcRenderer.removeAllListeners("selected-file-paths");
    electron.ipcRenderer.on("selected-file-paths", (event, paths) => callback(paths));
  }
});
