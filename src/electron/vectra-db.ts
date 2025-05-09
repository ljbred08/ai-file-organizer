import { LocalIndex } from 'vectra';
import type { IndexItem } from 'vectra';
import * as path from 'path';
import { app } from 'electron';
import { getEmbedding } from './embeddingUtils';


// Path for the Vectra index folder
function getVectraIndexPath(): string {
  if (app && typeof app.getPath === 'function') {
    return path.join(app.getPath('userData'), 'vectra-index');
  }
  // Use APPDATA environment variable for CLI/Node.js context
  if (process.env.APPDATA) {
    return path.join(process.env.APPDATA, 'ai-file-organizer', 'vectra-index');
  }
  throw new Error('Could not determine app data directory!');
}

// Singleton instance of LocalIndex
let vectraIndex: LocalIndex | null = null;

function getVectraIndex(): LocalIndex {
  if (!vectraIndex) {
    vectraIndex = new LocalIndex(getVectraIndexPath());
  }
  return vectraIndex;
}

// Ensure the index exists before any operation
export async function ensureVectraIndexCreated() {
  const index = getVectraIndex();
  if (!(await index.isIndexCreated())) {
    await index.createIndex();
    console.log('[vectra-db] Created new Vectra index at', getVectraIndexPath());
  }
}

// Add a vector with metadata
export async function addVector(vector: number[], metadata: Record<string, any> = {}): Promise<IndexItem<Record<string, any>>> {  
  await ensureVectraIndexCreated();  
  const index = getVectraIndex();  
  const result = await index.insertItem({ vector, metadata });  
  console.log('[vectra-db] Inserted item:', result);  
  return result;  
}

// Batch add vectors
export async function addVectors(items: { vector: number[], metadata?: Record<string, any> }[]) {
  await ensureVectraIndexCreated();
  const index = getVectraIndex();
  for (const item of items) {
    await index.insertItem({ vector: item.vector, metadata: item.metadata || {} });
    console.log('[vectra-db] Inserted item:', item);
  }
}

// Search for similar vectors
export async function searchVectors(queryVector: number[], limit = 15) {
  await ensureVectraIndexCreated();
  const index = getVectraIndex();
  const results = await index.queryItems(queryVector, limit);
  console.log('[vectra-db] Search results:', results);
  return results;
}

export async function semanticTextSearch(query: string, limit = 5) {
  const embedding = await getEmbedding({
    input: Buffer.from(query, "utf8"),
    modality: "text"
  });
  if (embedding.length === 0) {
    console.warn(`[semanticTextSearch] No embedding generated for query: "${query}"`);
    return [];
  }
  // Search the vectra index using the embedding
  return await searchVectors(embedding, limit);
}

export async function logAllVectraItems() {
  const items = await getVectraIndex().listItems();
  const summarized = items.map(item => ({
    ...item,
    vector: `[${item.vector.slice(0, 5).join(', ')}${item.vector.length > 5 ? ', ...' : ''}] (length ${item.vector.length})`
  }));
  console.log('All items in Vectra DB:', JSON.stringify(summarized, null, 2));
}

export async function clearVectraDb() {
  await ensureVectraIndexCreated();
  const index = getVectraIndex();
  // Get the current data to preserve version and metadata_config
  const stats = await index.getIndexStats();
  // Overwrite the index file with an empty items array
  const fs = await import('fs/promises');
  const path = await import('path');
  const indexPath = path.join(index.folderPath, index.indexName);
  const emptyData = {
    version: stats.version,
    metadata_config: stats.metadata_config,
    items: []
  };
  await fs.writeFile(indexPath, JSON.stringify(emptyData));
  console.log('Vectra DB cleared.');
}

export async function findItemByFilename(filename: string) {
  await ensureVectraIndexCreated();
  const index = getVectraIndex();
  // Pure metadata search (no vector similarity)
  const items = await index.listItemsByMetadata({
    filename: filename
  });
  const summarized = items.map(item => ({
      ...item,
    vector: `[${item.vector.slice(0, 5).join(', ')}${item.vector.length > 5 ? ', ...' : ''}] (length ${item.vector.length})`
  }));
  //console.log('[findItemByFilename] Search results:', JSON.stringify(summarized, null, 2));  
  return items;
}