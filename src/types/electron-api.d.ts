declare global {
  interface Window {
    electronAPI?: {
      send: (channel: string, data: any) => void;
      receive: (channel: string, func: any) => void;
      invoke: (channel: string, data: any) => Promise<any>;
      openFileSelectDialog: () => void;
      onFileSelect: (callback: (paths: string[] | undefined) => void) => void;
    };
  }
}
