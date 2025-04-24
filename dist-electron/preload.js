"use strict";
const electron = require("electron");
console.log("--- Preload script started ---");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  send: (channel, data) => {
    let validChannels = ["toMain"];
    if (validChannels.includes(channel)) {
      electron.ipcRenderer.send(channel, data);
    }
  },
  receive: (channel, func) => {
    let validChannels = ["fromMain"];
    if (validChannels.includes(channel)) {
      electron.ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  }
});
