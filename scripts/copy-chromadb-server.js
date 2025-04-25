// scripts/copy-chromadb-server.js
const fs = require('fs');
const path = require('path');

const src = path.resolve(__dirname, '../chromadb_server.exe');
const dest = path.resolve(__dirname, '../dist-electron/chromadb_server.exe'); // Adjust if your output is different

fs.copyFileSync(src, dest);
console.log('ChromaDB server copied to build output.');