import * as fs from 'fs';
import * as path from 'path';
import { getChatCompletions } from './groqChatCompletions';
import { universalFileReader } from './fileReader';

async function smartRenameFolders(rootDir: string, readFileContents: boolean = true) {
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
      while (errorCount < 3) {
        try {
          suggestedName = await getFolderNameSuggestion(dir, latestFiles, readFileContents);
          await renameDirectory(dir, suggestedName);
          break;
        } catch (error) {
          console.error(`Error renaming directory ${dir}:`, error);
          errorCount++;
        }
      }
      if (errorCount >= 3) {
        console.error(`Failed to rename directory ${dir} after 3 attempts`);
      }
    }
  }

  async function getFolderNameSuggestion(dir: string, fileNames: string[], readFileContents: boolean): Promise<string> {
    const messages = [{
      role: 'system',
      content: `You are a folder naming assistant. Your task is to suggest a folder name based on the given files.

Output format: Return ONLY the folder name as a string. Do not include any additional text or explanation.

The folder name should be:
- Concise and descriptive
- Based on the file names and contents (if available)
- Free of special characters that are not allowed in Windows folder names
- A single string without any additional text or explanation

You have tools available:
1. read_file_content(file_name: string): Reads the first 300 characters of a file
2. format_response(folder_name: string): Formats the folder name and returns it

Use the read_file_content tool to get more context about the files if needed (if the file has a non-descriptive name). You can only read files that can be read as text, so don't try to read .zip, .mp3, etc. (this includes folders which have no extension).
Use the format_response tool to return the final folder name. Do not return any text other than the folder name - the format_response tool will handle the formatting.`
    }, {
      role: 'user',
      content: `Suggest a folder name based on these files: ${fileNames.join(', ')}

Example output:
My Documents`
    }];

    const tools = [
      {
        name: 'read_file_content',
        description: 'Reads the first 300 characters of a file',
        parameters: {
          type: 'object',
          properties: {
            file_name: {
              type: 'string',
              description: 'The name of the file to read'
            }
          },
          required: ['file_name']
        },
        function: async (args: { file_name: string }) => {
          try {
            console.log(`Reading file ${args.file_name}`);
            const { buffer } = await universalFileReader(path.join(dir, args.file_name));
            const content = buffer.toString('utf8');
            return content.substring(0, 300);
          } catch (error) {
            console.error(`Error reading file ${args.file_name}:`, error);
            return 'Error reading file';
          }
        }
      },
      {
        name: 'format_response',
        description: 'Formats the folder name and returns it',
        parameters: {
          type: 'object',
          properties: {
            folder_name: {
              type: 'string',
              description: 'The folder name to format'
            }
          },
          required: ['folder_name']
        },
        function: async (args: { folder_name: string }) => {
          // Clean the folder name
          let cleanedName = args.folder_name.trim();
          cleanedName = cleanedName.replace(/[<>:"/\\|?*]/g, '');
          cleanedName = cleanedName.replace(/\s+/g, ' ').trim();
          
          // If the name is empty after cleaning, use a default
          if (cleanedName.length === 0) {
            console.log('Empty folder name after cleaning, using default');
            return 'Unnamed Folder';
          }
          
          return cleanedName;
        }
      }
    ].filter(tool => {
      // Only include the file reading tool if readFileContents is true
      return !(tool.name === 'read_file_content' && !readFileContents);
    });

    let completion = await getChatCompletions(messages, tools);
    
    // If the model wants to use a tool
    if (completion.choices[0].message.tool_calls) {
      for (const toolCall of completion.choices[0].message.tool_calls) {
        const args = JSON.parse(toolCall.function.arguments);
        const tool = tools.find(t => t.name === toolCall.function.name);
        if (!tool) {
          console.error(`Tool ${toolCall.function.name} not found`);
          return 'Unnamed Folder';
        }
        
        // Execute the tool function
        const result = await tool.function(args);
        
        // If it's the format_response tool, return the result immediately
        if (toolCall.function.name === 'format_response') {
          return result;
        }
        
        // For other tools, add the result to the conversation
        messages.push({
          role: 'assistant',
          content: `Tool response: ${result}`
        });
        
        // Get a new completion with the tool result
        completion = await getChatCompletions(messages, tools);
      }
    }

    if (completion && completion.choices[0].message && completion.choices[0].message.content) {
      return completion.choices[0].message.content.trim();
    } else {
      console.error('Failed to get a valid folder name suggestion from Groq.');
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

export { smartRenameFolders };
