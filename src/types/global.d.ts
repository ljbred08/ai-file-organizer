// src/types/global.d.ts

interface ElectronAPI {
    send: (channel: string, data: any) => void;
    receive: (channel: string, func: any) => void;
    invoke: (channel: string, ...args: any[]) => Promise<any>;
    openFileSelectDialog: () => void;
    onFileSelect: (callback: (paths: string[] | undefined) => void) => void;
  }
  
  declare global {
    interface Window {
      electronAPI: ElectronAPI;
    }
  }
  
  export {};