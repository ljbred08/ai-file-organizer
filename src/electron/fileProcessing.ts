import * as fs from 'fs';
import * as path from 'path';
import * as vectraDb from './vectra-db';
import { getEmbedding } from './embeddingUtils';
import { universalFileReader } from './fileReader';
import { logAllVectraItems } from './vectra-db';

// Recursively collect all files from given paths
async function getAllFilesInPaths(paths: string[]): Promise<string[]> {
  console.log('[getAllFilesInPaths] Called with:', paths);
  const allFiles: string[] = [];
  for (const singlePath of paths) {
    try {
      console.log(`[getAllFilesInPaths] Reading directory: ${singlePath}`);
      const files = await fs.promises.readdir(singlePath, { withFileTypes: true });
      for (const file of files) {
        const fullPath = path.join(singlePath, file.name);
        if (file.isDirectory()) {
          console.log(`[getAllFilesInPaths] Entering subdirectory: ${fullPath}`);
          const subFiles = await getAllFilesInPaths([fullPath]);
          allFiles.push(...subFiles);
        } else {
          console.log(`[getAllFilesInPaths] Found file: ${fullPath}`);
          allFiles.push(fullPath);
        }
      }
    } catch (error) {
      console.error(`[getAllFilesInPaths] Error reading directory ${singlePath}:`, error);
    }
  }
  console.log('[getAllFilesInPaths] All files found:', allFiles);
  return allFiles;
}


async function getEmbeddingForFile(inputBuffer: Buffer, modality: string): Promise<number[]> {
  return await getEmbedding({ input: inputBuffer, modality });
}

async function processAndStoreFiles(files: string[]) {
    console.log('[processAndStoreFiles] Called with files:', files);
    const chunkSize = 20;
    let items: { vector: number[]; metadata: { path: string; filename: string; modality: string } }[] = [];
    let processedCount = 0;

    try {
        for (const file of files) {
            // Check if file already exists in Vectra DB by filename
            const existing = await vectraDb.findItemByFilename(path.basename(file));
            if (existing && existing.length > 0) {
                console.log(`[processAndStoreFiles] File already in Vectra DB, skipping: ${file}`);
                continue;
            }
            // Read the file and get modality
            const { buffer: inputBuffer, modality } = await universalFileReader(file);
            
            // Only log text for text-based modalities
            if (modality === 'text') {
                const text = inputBuffer.toString('utf8');
                const previewLength = 300;
                const preview = text.length > previewLength ? text.slice(0, previewLength) + '...' : text;
                console.log(`[processAndStoreFiles] First ${previewLength} chars of ${file}:
${preview}`);
            }

            if (!modality) {
                console.warn(`[processAndStoreFiles] Unsupported file type for ${file}, skipping.`);
                continue;
            }

            const vector = await getEmbeddingForFile(inputBuffer, modality);
            const item = {
                vector,
                metadata: { path: file, filename: path.basename(file), modality }
            };

            console.log(
                `[processAndStoreFiles] Prepared item for storage:`,
                {
                    ...item,
                    vector: `[${item.vector.slice(0, 5).join(', ')}${item.vector.length > 5 ? ', ...' : ''}] (length ${item.vector.length})`
                }
            );
            items.push(item);
            processedCount++;

            if (items.length >= chunkSize || processedCount === files.length) {
                try {
                    console.log(`[processAndStoreFiles] Storing ${items.length} items in Vectra`);
                    await vectraDb.addVectors(items);
                    console.log(`[processAndStoreFiles] Stored ${items.length} file embeddings in Vectra`);
                } catch (error) {
                    console.error(`[processAndStoreFiles] Error storing ${items.length} items in Vectra:`, error);
                }
                items = []; // Reset the chunk after storing
            }
        }

        // Store any remaining items
        if (items.length > 0) {
            try {
                console.log(`[processAndStoreFiles] Storing remaining ${items.length} items in Vectra`);
                await vectraDb.addVectors(items);
                console.log(`[processAndStoreFiles] Stored remaining ${items.length} file embeddings in Vectra`);
            } catch (error) {
                console.error(`[processAndStoreFiles] Error storing remaining ${items.length} items in Vectra:`, error);
            }
        }

        console.log('[processAndStoreFiles] Completed processing files');
        await logAllVectraItems();
    } catch (error) {
        console.error('[processAndStoreFiles] Error processing files:', error);
    }
}

// Example: Search for similar files given a query embedding
async function searchFiles(queryEmbedding: number[], limit = 5) {
    console.log('[searchFiles] Called with queryEmbedding:', queryEmbedding, 'limit:', limit);
    const results = await vectraDb.searchVectors(queryEmbedding, limit);
    console.log('[searchFiles] Search results:', results);
    results.forEach(result => {
        console.log('Found file:', result.item?.metadata?.path, 'with score:', result.score);
    });
}

export { getAllFilesInPaths, processAndStoreFiles, searchFiles }
