import { app, ipcMain, BrowserWindow, dialog } from 'electron'
import { MainWindow } from './main/MainWindow'  // Corrected relative path
import { getAllFilesInPaths, processAndStoreFiles, searchFiles } from './fileProcessing';
import { performClustering } from './hdbscan';
import { createFolderStructureFromTree } from './treeToFolderStructure';
import { smartRenameFolders } from './smartRenameFolders';
import 'dotenv/config';
import { semanticTextSearch, listItems } from './vectra-db';
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

ipcMain.on('process-files', async (event, paths: string[]) => {
  console.log('[process-files] Received paths:', paths);

  const files = await getAllFilesInPaths(paths);
  console.log('[process-files] Found files:', files);

  await processAndStoreFiles(files);
  console.log('[process-files] Files processed and stored in Vectra.');

  return { success: true };
});

ipcMain.handle('search-files', async (event, query: string, limit: number = 5) => {
  console.log('[search-files] Received query:', query);
  return await semanticTextSearch(query, limit);
});

ipcMain.handle('cluster-files', async () => {
 console.log('cluster-files event received');
 // Call the function to cluster files
 const tree = await performClustering();
 // Return the result
 return tree;
});

ipcMain.handle('create-folder-structure', async (event) => {
 console.log('create-folder-structure event received');
 const mainWindow = BrowserWindow.fromWebContents(event.sender);

 if (!mainWindow) {
 console.error('Could not find mainWindow for folder structure creation.');
 return;
 }

 const result = await dialog.showOpenDialog(mainWindow, {
 properties: ['openDirectory'], // Only allow selecting a single directory
 title: 'Select Directory to Create Folder Structure'
 });

 if (result.canceled || result.filePaths.length === 0) {
 console.log('Folder structure creation cancelled');
 return;
 }

 const rootDir = result.filePaths[0];
 const tree = await performClustering();
 const embeddings = await listItems();
 const hclustMetadata = embeddings.map(item => item.metadata);
 createFolderStructureFromTree(tree, hclustMetadata, rootDir);
});

ipcMain.handle('smart-rename-folders', async (event) => {
 console.log('smart-rename-folders event received');
 const mainWindow = BrowserWindow.fromWebContents(event.sender);

 if (!mainWindow) {
 console.error('Could not find mainWindow for smart rename folders.');
 return;
}

 const result = await dialog.showOpenDialog(mainWindow, {
 properties: ['openDirectory'], // Only allow selecting a single directory
 title: 'Select Directory to Smart Rename'
 });

 if (result.canceled || result.filePaths.length === 0) {
 console.log('Smart rename folders cancelled');
 return;
}

const rootDir = result.filePaths[0];
await smartRenameFolders(rootDir);
});
