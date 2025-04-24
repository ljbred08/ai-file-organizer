import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'

const isSingleInstance = app.requestSingleInstanceLock()

if (!isSingleInstance) {
  app.quit()
  process.exit(0)
}

app.disableHardwareAcceleration()

// Install "Vue.js devtools" - Wrap the dynamic import and usage in a try/catch
if (import.meta.env.MODE === 'development') {
  app.whenReady()
    .then(() => {
      // Use a dynamic import within the .then() to ensure 'electron-devtools-installer'
      // is only loaded after the app is ready and in development mode.
      return import('electron-devtools-installer');
    })
    .then(module => {
      // Check the module's exports to ensure you get the correct constant.
      // VUEJS3_DEVTOOLS is the common one for Vue 3.
      // Add console.log to see what 'module' contains if unsure.
      console.log("Electron Devtools Installer Module:", module); // <-- Add this for debugging!

      const installExtension = module.default; // Get the default export (the function)
      // Try VUEJS3_DEVTOOLS first. If that doesn't work, try VUEJS_DEVTOOLS
      const devtoolsId = module.VUEJS3_DEVTOOLS || module.VUEJS_DEVTOOLS;


      if (installExtension && devtoolsId) {
        console.log("Attempting to install Vue Devtools with ID:", devtoolsId); // Log the ID
        return installExtension(devtoolsId, {
          loadExtensionOptions: {
            allowFileAccess: true,
          },
        });
      } else {
        console.error("Failed to find installExtension function or Devtools ID constant.");
        // Optionally, return a rejected promise to ensure the catch block is hit
        return Promise.reject(new Error("Devtools installation setup failed."));
      }
    })
    .then(() => console.log('Vue Devtools installed successfully'))
    .catch(e => console.error('Failed install extension:', e)); // Ensure errors are caught and logged
}


let mainWindow: BrowserWindow | null = null

async function createWindow() {
  console.log("--- Inside createWindow function ---");

  const preloadPath = join(__dirname, 'preload.js');
  console.log("Attempting to load preload script from:", preloadPath); // <-- Add this log

  mainWindow = new BrowserWindow({
    show: false, // Use 'ready-to-show' event to show window
    webPreferences: {
      preload: preloadPath, // Use the logged path
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  // Add error handlers to webContents
mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
  console.error(`WebContents did-fail-load: URL: ${validatedURL}, Code: ${errorCode}, Description: ${errorDescription}`);
});
mainWindow.webContents.on('did-fail-provisional-load', (event, errorCode, errorDescription, validatedURL) => {
   console.error(`WebContents did-fail-provisional-load: URL: ${validatedURL}, Code: ${errorCode}, Description: ${errorDescription}`);
});
 mainWindow.webContents.on('preload-error', (event, preloadPath, error) => {
     console.error(`Preload script failed to run: Path: ${preloadPath}`, error); // <--- This is crucial for preload errors!
 });
// Add more webContents error events if needed (e.g., 'render-process-gone')  mainWindow.loadURL("http://localhost:5174");
  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  /**
   * URL for main window.
   * Vite dev server for development.
   * `file://.../index.html` for production and test (where index.html is in dist-electron)
   */
  const pageUrl = import.meta.env.MODE === 'development' && import.meta.env.VITE_DEV_SERVER_URL !== undefined
    ? import.meta.env.VITE_DEV_SERVER_URL
    // CORRECTED Production Path: index.html is in the same directory as main.js (__dirname)
    : new URL('index.html', 'file://' + __dirname + '/dist-electron').toString(); // <--- Corrected production path!

  console.log("Attempting to load URL:", pageUrl); // Added for debugging
  console.log(new URL('index.html', 'file://' + __dirname + '/dist-electron').toString());

  // Explicitly catch errors from loadURL to see if it fails
  await mainWindow.loadURL(pageUrl)
    .catch((e) => {
      console.error(`Error loading window URL: ${pageUrl}`, e); // Log the URL and error
      // Consider adding a simple dialog here in production if load fails
      // dialog.showErrorBox('Application Error', `Failed to load the application page:\n\n${e.message}`);
      app.quit(); // Quit the app gracefully on load failure
    });



  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()

    if (import.meta.env.MODE === 'development') {
      //mainWindow?.webContents.openDevTools()
    }
  })
}


app.on('second-instance', () => {
  // Someone tried to run a second instance, we should focus our window.
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  }
})


app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})


app.whenReady()
  .then(createWindow)
  .catch((e) => console.error('Failed create window:', e))



// Auto-updates
if (import.meta.env.PROD) {
  app.whenReady()
    .then(() => import('electron-updater'))
    .then(({ autoUpdater }) => autoUpdater.checkForUpdatesAndNotify())
    .catch((e) => console.error('Failed check updates:', e))
}

ipcMain.on('toMain', (event, args) => {
    console.log("Received message from renderer:", args);
    const mainWindow = BrowserWindow.fromWebContents(event.sender);
    mainWindow?.webContents.send('fromMain', 'Hello from the main process!');
})