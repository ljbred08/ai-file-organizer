"use strict";
const require$$0 = require("electron");
const require$$1 = require("path");
const isSingleInstance = require$$0.app.requestSingleInstanceLock();
if (!isSingleInstance) {
  require$$0.app.quit();
  process.exit(0);
}
require$$0.app.disableHardwareAcceleration();
{
  require$$0.app.whenReady().then(() => {
    return Promise.resolve().then(() => require("./index-cd2d2172.js")).then((n) => n.index);
  }).then((module) => {
    console.log("Electron Devtools Installer Module:", module);
    const installExtension = module.default;
    const devtoolsId = module.VUEJS3_DEVTOOLS || module.VUEJS_DEVTOOLS;
    if (installExtension && devtoolsId) {
      console.log("Attempting to install Vue Devtools with ID:", devtoolsId);
      return installExtension(devtoolsId, {
        loadExtensionOptions: {
          allowFileAccess: true
        }
      });
    } else {
      console.error("Failed to find installExtension function or Devtools ID constant.");
      return Promise.reject(new Error("Devtools installation setup failed."));
    }
  }).then(() => console.log("Vue Devtools installed successfully")).catch((e) => console.error("Failed install extension:", e));
}
let mainWindow = null;
async function createWindow() {
  console.log("--- Inside createWindow function ---");
  const preloadPath = require$$1.join(__dirname, "preload.js");
  console.log("Attempting to load preload script from:", preloadPath);
  mainWindow = new require$$0.BrowserWindow({
    show: false,
    // Use 'ready-to-show' event to show window
    webPreferences: {
      preload: preloadPath,
      // Use the logged path
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  mainWindow.webContents.on("did-fail-load", (event, errorCode, errorDescription, validatedURL) => {
    console.error(`WebContents did-fail-load: URL: ${validatedURL}, Code: ${errorCode}, Description: ${errorDescription}`);
  });
  mainWindow.webContents.on("did-fail-provisional-load", (event, errorCode, errorDescription, validatedURL) => {
    console.error(`WebContents did-fail-provisional-load: URL: ${validatedURL}, Code: ${errorCode}, Description: ${errorDescription}`);
  });
  mainWindow.webContents.on("preload-error", (event, preloadPath2, error) => {
    console.error(`Preload script failed to run: Path: ${preloadPath2}`, error);
  });
  mainWindow.on("ready-to-show", () => {
    mainWindow == null ? void 0 : mainWindow.show();
  });
  const pageUrl = "http://localhost:5174/";
  console.log("Attempting to load URL:", pageUrl);
  console.log(new URL("index.html", "file://" + __dirname + "/dist-electron").toString());
  await mainWindow.loadURL(pageUrl).catch((e) => {
    console.error(`Error loading window URL: ${pageUrl}`, e);
    require$$0.app.quit();
  });
  mainWindow.on("ready-to-show", () => {
    mainWindow == null ? void 0 : mainWindow.show();
  });
}
require$$0.app.on("second-instance", () => {
  if (mainWindow) {
    if (mainWindow.isMinimized())
      mainWindow.restore();
    mainWindow.focus();
  }
});
require$$0.app.on("window-all-closed", () => {
  if (process.platform !== "darwin")
    require$$0.app.quit();
});
require$$0.app.whenReady().then(createWindow).catch((e) => console.error("Failed create window:", e));
require$$0.ipcMain.on("toMain", (event, args) => {
  console.log("Received message from renderer:", args);
  const mainWindow2 = require$$0.BrowserWindow.fromWebContents(event.sender);
  mainWindow2 == null ? void 0 : mainWindow2.webContents.send("fromMain", "Hello from the main process!");
});
