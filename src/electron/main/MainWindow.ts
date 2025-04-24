import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import installExtension, { VUEJS3_DEVTOOLS } from 'electron-devtools-installer';


export class MainWindow {
    private window: BrowserWindow | null = null

    constructor() {
        const gotTheLock = app.requestSingleInstanceLock()

        if (!gotTheLock) {
            app.quit()
        } else {
            app.on('second-instance', (event, commandLine, workingDirectory) => {
                // Someone tried to run a second instance, we should focus our window.
                if (this.window) {
                    if (this.window.isMinimized()) this.window.restore()
                    this.window.focus()
                }
            })
        }


        app.on('window-all-closed', () => {
            if (process.platform !== 'darwin') app.quit()
        })



        app.disableHardwareAcceleration()
    }



    public getWindow(): BrowserWindow | null {
        return this.window
    }


    public async createWindow(): Promise<void> {
        const preloadPath = join(__dirname, 'preload.js');
        this.window = new BrowserWindow({
            show: false,
            webPreferences: {
                preload: preloadPath,
                nodeIntegration: false,
                contextIsolation: true,
            },
        })

        this.registerWebContentsErrorHandlers()

        const pageUrl = import.meta.env.MODE === 'development' && import.meta.env.VITE_DEV_SERVER_URL
            ? import.meta.env.VITE_DEV_SERVER_URL
            : new URL('../renderer/index.html', 'file://' + __dirname).toString();

        try {
            await this.window.loadURL(pageUrl)
            console.log("Loaded URL:", pageUrl)
        } catch (e) {
            console.error(`Error loading URL: ${pageUrl}`, e)
            app.quit()
        }

        this.window.on('ready-to-show', () => {
            this.window?.show()
            if (import.meta.env.MODE === 'development') {
                this.installDevtools().catch(e =>
                    console.error('Failed to install devtools:', e)
                )
            }
        })

        this.registerIPCHandlers()
    }

    private registerWebContentsErrorHandlers() {
        if (!this.window) return

        this.window.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
            console.error(`did-fail-load: URL: ${validatedURL}, Code: ${errorCode}, Description: ${errorDescription}`)
        })

        // Add other webContents error handlers as needed
    }
    private async installDevtools() {
      try {
          await installExtension(VUEJS3_DEVTOOLS, {
            loadExtensionOptions: {
              allowFileAccess: true,
            },
          })
          console.log('Vue Devtools installed successfully')
        } catch (e) {
          console.error('Failed install extension:', e)
        }
    }

    private registerIPCHandlers() {
        ipcMain.on('toMain', (event, args) => {
            console.log('Received message from renderer:', args)
            event.reply('fromMain', 'Hello from main process!')
        })
    }
}

