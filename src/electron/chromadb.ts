// chromadb.js
import { ChromaClient } from "chromadb";
const chroma = new ChromaClient();

import { app } from 'electron';
import { spawn } from 'child_process';
import * as path from 'path';

let chromaProcess: any = null;

function startChromaDBServer() {
  const chromaPath = getChromaDBServerPath();
  chromaProcess = spawn(chromaPath, [], {
    cwd: path.dirname(chromaPath),
    stdio: 'inherit',
    shell: false
  });

  chromaProcess.on('error', (err: Error) => {
    console.error('Failed to start ChromaDB server:', err);
  });

  chromaProcess.on('exit', (code: number) => {
    console.log(`ChromaDB server exited with code ${code}`);
  });
}

async function initChromaDB() {
  try {
    // Initialize ChromaDB
    startChromaDBServer();
    await chroma.heartbeat();
    console.log('ChromaDB is alive!');
  } catch (error) {
    console.error('Error initializing ChromaDB:', error);
  }
}
}

async function getOrCreateCollection(name: string) {
 try {
 const collection = await chroma.getCollection({ name });
 if (!collection) {
 const newCollection = await chroma.createCollection({ name });
 return newCollection;
 }
 return collection;
 } catch (error) {
 console.error(`Error getting or creating collection ${name}:`, error);
 }
}

async function storeFiles(collection: any, files: string[], embeddings: string[]) {
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const embedding = embeddings[i];
    await collection.upsert({
      ids: [file],
      embeddings: [embedding],
      metadatas: [{ path: file }],
    });
    console.log(`Added ${file} to ChromaDB`);
  }
}

function getChromaDBServerPath(): string {
  if (process.env.NODE_ENV === 'development') {
    // Adjust this path if your dev executable is elsewhere
    return path.resolve(__dirname, '../../chromadb_server.exe');
  } else {
    // In production, it's in the resources directory
    return path.join(process.resourcesPath, 'chromadb_server.exe');
  }
}

export { initChromaDB, getOrCreateCollection, storeFiles };