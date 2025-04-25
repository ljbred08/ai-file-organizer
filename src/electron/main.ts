import { app, ipcMain, BrowserWindow, dialog } from 'electron'
import { MainWindow } from './main/MainWindow'  // Corrected relative path
import * as fs from 'fs';
import * as path from 'path';
import { initChromaDB, getOrCreateCollection, storeFiles } from './chromadb';
console.log('--- Main script started ---')





// Auto-updates
if (import.meta.env.PROD) {
  console.log('--- Auto-updates enabled ---')
  app.whenReady()
    .then(() => import('electron-updater'))
    .then(({ autoUpdater }) => {
      console.log('--- Checking for updates ---')
      autoUpdater.checkForUpdatesAndNotify()
    })
    .catch((e) => console.error('Failed check updates:', e))
}

const mainApp = app
const mainWindow = new MainWindow()

console.log('--- App ready, creating window ---')
mainApp.whenReady()
    .then(() => mainWindow.createWindow()) // Use the method to create and manage the window
    .catch(e => console.error('Failed to create window:', e))


// Catch all uncaught errors that weren't caught by a domain or an uncaught exception handler in Node.js
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
  // Optional: Show a dialog, log to a file, restart the app
  console.error('--- Uncaught Exception, shutting down ---')
  app.exit(1)
})

mainApp.on('web-contents-created', (event, contents) => {
  contents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (isMainFrame) { // Check if it's the main frame to avoid logging errors from iframes or other embedded content
      console.error('Failed to load main window:', errorDescription)
    }
  })


    contents.on('render-process-gone', (event, details) => {
      console.error('Renderer process crashed:', details)
      // Restart app, show dialog, log error, etc.
    })



    // Add other relevant error handlers as needed
})

ipcMain.on('open-file-dialog', async (event) => {
  console.log('open-file-dialog event received');
  const mainWindow = BrowserWindow.fromWebContents(event.sender);
  
  if (!mainWindow) {
      console.error('Could not find mainWindow for file dialog.');
      return;
  }

  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'multiSelections'], // Only allow selecting folders, and multiple folders if desired
  });
  console.log('Dialog result:', result); 
  // Send the selected paths back to the renderer process
  // result.filePaths will be an array of strings or undefined if cancelled
  event.sender.send('selected-file-paths', result.filePaths);
});

ipcMain.on('processFiles', async (event, paths: string[]) => {
  console.log('processFiles event received');
  const allFiles = await getAllFilesInPaths(paths);
  console.log('All files:', allFiles);
  await processAndStoreFiles(allFiles);
});

async function getAllFilesInPaths(paths: string[]): Promise<string[]> {
  const allFiles: string[] = [];
  for (const singlePath of paths) {
    try {
      const files = await fs.promises.readdir(singlePath, { withFileTypes: true });
      for (const file of files) {
        const fullPath = path.join(singlePath, file.name);
        if (file.isDirectory()) {
          const subFiles = await getAllFilesInPaths([fullPath]);
          allFiles.push(...subFiles);
        } else {
          allFiles.push(fullPath);
        }
      }
    } catch (error) {
      console.error('Error reading directory:', error);
    }
  }
  return allFiles;
}
      

async function processAndStoreFiles(files: string[]) {
  try {
    await initChromaDB();
    const collection = await getOrCreateCollection('fileEmbeddings');
    // Generate embeddings for each file
    const embeddings = files.map(getEmbeddingForFile);
    await storeFiles(collection, files, embeddings);
  } catch (e) {
    console.error('Error with ChromaDB collection:', e);
  }
}

// Placeholder: Replace with actual embedding logic later
function getEmbeddingForFile(filePath: string): string {
  // For now, just return an empty string or dummy embedding
  return '';
}