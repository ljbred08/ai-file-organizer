import { contextBridge, ipcRenderer } from 'electron'
console.log("--- Preload script started ---"); // Add this log

contextBridge.exposeInMainWorld('electronAPI', {
    send: (channel: string, data: any) => {
        ipcRenderer.send(channel, data);
    },
    receive: (channel: string, func: any) => {
        let validChannels = ['fromMain']
        if (validChannels.includes(channel)) {
            // Deliberately strip event as it includes `sender` 
            ipcRenderer.on(channel, (event, ...args) => func(...args));
        }
    },
    invoke: (channel: string, ...args: any[]) => {
        return ipcRenderer.invoke(channel, ...args);
    },
    // Expose a function to send a message to the main process requesting the dialog
    openFileSelectDialog: () => ipcRenderer.send('open-file-dialog'),

    // Expose a function to listen for the result from the main process
    // The callback will receive the array of selected file/folder paths
    onFileSelect: (callback: (paths: string[] | undefined) => void) => {
        // Remove any existing listeners to prevent duplicates
        ipcRenderer.removeAllListeners('selected-file-paths');
        ipcRenderer.on('selected-file-paths', (event, paths: string[] | undefined) => callback(paths));
    }
})
