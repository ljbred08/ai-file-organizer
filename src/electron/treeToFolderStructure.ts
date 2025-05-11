import * as fs from 'fs';
import * as path from 'path';
import { addVector, findItemByFilename, getVectraIndex } from './vectra-db';

async function removeEmptyDirectories(directory: string) {
 try {
 const files = await fs.promises.readdir(directory);
 if (files.length ===0) {
 // Directory is empty, remove it
 await fs.promises.rmdir(directory);
 console.log(`Removed empty directory: ${directory}`);
 } else {
 // Recursively check subdirectories
 for (const file of files) {
 const filePath = path.join(directory, file);
 const stats = await fs.promises.stat(filePath);
 if (stats.isDirectory()) {
 await removeEmptyDirectories(filePath);
 }
 }
 // After checking subdirectories, check if the current directory is empty
 const updatedFiles = await fs.promises.readdir(directory);
 if (updatedFiles.length ===0) {
 await fs.promises.rmdir(directory);
 console.log(`Removed empty directory: ${directory}`);
 }
 }
 } catch (error) {
 console.error(`Error removing empty directory ${directory}:`, error);
 }
}

export async function createFolderStructureFromTree(tree: any, metadata: any[], rootDir: string) {
 if (!tree) {
 console.error('No tree provided');
 return;
 }

  // Create the root directory if it doesn't exist
  if (!fs.existsSync(rootDir)) {
    fs.mkdirSync(rootDir, { recursive: true });
  }

// Function to recursively create folder structure
async function recursiveCreateFolderStructure(node: any, currentDir: string, metadata: any[]) {
 console.log('Processing node:', node);
    if (node.indexes && node.indexes.length === 1) {
const itemIndex = node.indexes[0];
const itemMetadata = metadata[itemIndex];
console.log('itemMetadata:', itemMetadata);
console.log('itemMetadata.path:', itemMetadata.path);

if (!itemMetadata.path || itemMetadata.path.trim() === '') {
 console.error(`itemMetadata.path is empty for itemIndex ${itemIndex}`);
 return;
}

const oldPath = itemMetadata.path;
const fileName = path.basename(oldPath);
console.log('Moving file from', oldPath, 'to', path.join(currentDir, fileName));
const newPath = path.join(currentDir, fileName);

// Move the file to the new location and update Vectra DB
try {

 fs.renameSync(oldPath, newPath);
 console.log(`Moved file from ${oldPath} to ${newPath}`);

 // Update Vectra DB
 try {
const items = await findItemByFilename(path.basename(oldPath));
if (items.length >0) {
const updatedMetadata = { ...itemMetadata, path: newPath };
await getVectraIndex().deleteItem(items[0].id);
await addVector(items[0].vector, updatedMetadata);
  await getVectraIndex().deleteItem(items[0].id);
     console.log(`Updated Vectra DB for file: ${newPath}`);
 
 
}
 } catch (dbError) {
 console.error(`Error updating Vectra DB for file ${newPath}:`, dbError);
 }
 } catch (error) {
 console.error(`Error moving file from ${oldPath} to ${newPath}:`, error);
 }
 } else {
 // Create a new directory for the cluster
 const dirName = getHclustNodeName(node, metadata);
 const sanitizedDirName = dirName.replace(/[^a-zA-Z0-9\s.]/g, '').trim();
 const newDir = path.join(currentDir, sanitizedDirName);
 if (!fs.existsSync(newDir)) {
        fs.mkdirSync(newDir, { recursive: true });
      }

      // Recursively process children
      if (node.children) {
 node.children.forEach((child: any) => {
 recursiveCreateFolderStructure(child, newDir, metadata);
 });
 }
 }
 }

 // Start the recursive process
 await recursiveCreateFolderStructure(tree, rootDir, metadata);
 await removeEmptyDirectories(rootDir);
}

// Reusing the getHclustNodeName function from hdbscan.ts
function getHclustNodeName(node: any, metadata: any[]) {
  if (node.isLeaf) {
    if (node.indexes && node.indexes.length === 1 && metadata[node.indexes[0]]) {
      return metadata[node.indexes[0]].filename || `Item ${node.indexes[0]}`;
    }
    return `Leaf (idx ${node.indexes ? node.indexes.join(',') : 'N/A'})`;
  }
  if (node.indexes && node.indexes.length > 0) {
    if (node.indexes.length <= 3) {
 return `Cluster: ${node.indexes.map((i: number) => metadata[i] ? metadata[i].filename : `Item ${i}`).join(', ')}\n`;
    }
    return `Cluster (size ${node.indexes.length})`;
  }
  return "Internal Node";
}
