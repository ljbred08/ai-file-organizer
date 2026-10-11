import * as fs from 'fs';
import * as path from 'path';
import { getChatCompletions } from './AIChatCompletions';

async function smartRenameFolders(rootDir: string): Promise<void> {
  async function traverseAndRename(dir: string): Promise<void> {
    // Get fresh directory contents
    const files = await fs.promises.readdir(dir);
    const subDirs = files.filter(file => {
      const fullPath = path.join(dir, file);
      return fs.statSync(fullPath).isDirectory();
    });

    // Process subdirectories first
    for (const subDir of subDirs) {
      const subDirPath = path.join(dir, subDir);
      await traverseAndRename(subDirPath);
      
      // Refresh directory contents after renaming subdirectory
      const updatedFiles = await fs.promises.readdir(dir);
      const updatedSubDirs = updatedFiles.filter(file => {
        const fullPath = path.join(dir, file);
        return fs.statSync(fullPath).isDirectory();
      });
    }

    // Now rename the current directory based on its contents
    // Use the latest directory contents after processing all subdirectories
    const latestFiles = await fs.promises.readdir(dir);
    if (latestFiles.length > 0) {
      console.log('Folder contents:', latestFiles);
      let errorCount = 0;
      let suggestedName;
      let attempts = 4;
      while (errorCount < attempts) {
        try {
          suggestedName = await getFolderNameSuggestion(latestFiles);
          await renameDirectory(dir, suggestedName);
          break;
        } catch (error) {
          console.error(`Error renaming directory ${dir}:`, error);
          errorCount++;
        }
      }
      if (errorCount >= attempts) {
        console.error(`Failed to rename directory ${dir} after ${errorCount} attempts`);
      }
    }
  }

  async function getFolderNameSuggestion(fileNames: string[]): Promise<string> {
    const messages = [{
      role: 'system',
      content: `You are a folder naming assistant. Your task is to suggest a folder name based on the given files.

Output format: Return ONLY the folder name as a string. Do not include any additional text or explanation.

The folder name should be:
- Concise and descriptive
- Based on the file names
- Free of special characters that are not allowed in Windows folder names
- A single string without any additional text or explanation

Example output:
My Documents`
    }, {
      role: 'user',
      content: `Suggest a folder name based on these files: ${fileNames.join(', ')}`
    }];

    const completion = await getChatCompletions(messages);

    if (completion && completion.choices[0].message && completion.choices[0].message.content) {
      // Clean the folder name
      let cleanedName = completion.choices[0].message.content.trim();
      cleanedName = cleanedName.replace(/[<>:"/\\|?*]/g, '');
      cleanedName = cleanedName.replace(/\s+/g, ' ').trim();
      
      // If the name is empty after cleaning, use a default
      if (cleanedName.length === 0) {
        console.log('Empty folder name after cleaning, using default');
        return 'Unnamed Folder';
      }
      
      return cleanedName;
    } else {
      console.error('Failed to get a valid folder name suggestion from OpenRouter.');
      return 'Unnamed Folder';
    }
  }

  async function renameDirectory(oldPath: string, newName: string): Promise<void> {
    const parentDir = path.dirname(oldPath);
    const newPath = path.join(parentDir, newName);
    await fs.promises.rename(oldPath, newPath);
    console.log(`Renamed ${oldPath} to ${newName}`);
  }

  await traverseAndRename(rootDir);
}

async function smartRenameFiles(rootDir: string): Promise<void> {
  
}

export { smartRenameFolders };
