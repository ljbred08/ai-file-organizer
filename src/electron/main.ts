import { app } from 'electron'
import { MainWindow } from '../main/MainWindow'  // Corrected relative path

// Auto-updates
if (import.meta.env.PROD) {
  app.whenReady()
    .then(() => import('electron-updater'))
    .then(({ autoUpdater }) => autoUpdater.checkForUpdatesAndNotify())
    .catch((e) => console.error('Failed check updates:', e))
}

const mainApp = app
const mainWindow = new MainWindow()

mainApp.whenReady()
    .then(() => mainWindow.createWindow()) // Use the method to create and manage the window
    .catch(e => console.error('Failed to create window:', e))


