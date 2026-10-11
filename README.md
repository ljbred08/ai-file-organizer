# AI File Organizer

A desktop app that reads a folder full of files, embeds what's *inside* them, then uses clustering and an LLM to reorganize them into sensibly named folders.

Point it at a directory of messy files, let it index them, and it will group related documents together by semantic content — not by filename or extension — and move each group into its own folder with a name it picks itself.

> **Status:** working prototype. The indexing → search → cluster → reorganize pipeline runs end to end, but this is pre-1.0 software with no tests and rough edges. See [Known limitations](#known-limitations).

---

## How it works

```
folders ──▶ read & extract ──▶ embed ──▶ local vector index
                                             │
                        ┌────────────────────┴────────────────────┐
                        ▼                                         ▼
                 semantic search                     hierarchical clustering
                     (query)                        (cosine distance, avg linkage)
                                                                  │
                                                                  ▼
                                                     build folder tree + move files
                                                                  │
                                                                  ▼
                                                        LLM names each folder
```

| Stage | What happens | Module |
| --- | --- | --- |
| **Ingest** | Recursively walks the folders you select and collects every file path. | `src/electron/fileProcessing.ts` |
| **Extract** | Reads each file and normalizes it to text. PDFs via `unpdf`, Word docs via `word-extractor`, plain text as-is. Unreadable or unsupported files fall back to embedding their filename. | `src/electron/fileReader.ts`, `src/electron/pdfExport.ts` |
| **Embed** | Converts the extracted text into a vector. Default model is Voyage AI's `voyage-multimodal-3`. | `src/electron/embeddingUtils.ts` |
| **Store** | Persists `{ vector, metadata: { path, filename, modality } }` into a local, file-backed vector index. Batched 20 files at a time. | `src/electron/vectra-db.ts` |
| **Search** | Embeds your query the same way and returns the nearest stored files. | `src/electron/vectra-db.ts` |
| **Cluster** | Builds a hierarchical cluster tree over all stored vectors using cosine distance and average linkage. | `src/electron/hdbscan.ts` |
| **Reorganize** | Walks the tree and moves each file into a directory named after its cluster. | `src/electron/treeToFolderStructure.ts` |
| **Rename** | Asks an LLM for a descriptive name for each folder based on its contents, bottom-up. | `src/electron/smartRenameFolders.ts` |

## Features

- **Recursive indexing** of any number of folders, with duplicate-file skipping
- **Text extraction** from PDF, DOCX/DOC, and plain-text files
- **Local vector index** via [Vectra](https://github.com/Stevenic/vectra) — no database server, no cloud storage of your file contents
- **Semantic search** UI with a live results overlay
- **Hierarchical clustering** of your entire index with a cosine-distance, average-linkage dendrogram
- **Automatic folder creation and file moves** driven by the cluster tree
- **LLM-generated folder names**, retried up to 4 times and sanitized for Windows-invalid characters
- **Pluggable embedding backends** — Voyage AI by default, with Replicate-hosted `jina-clip-v2` and `imagebind` paths in the same interface
- **Pluggable LLM provider** — anything OpenAI-compatible, defaulting to OpenRouter
- **Optional HDBSCAN** clustering path alongside the default agglomerative clustering

## Tech stack

| Layer | Choice |
| --- | --- |
| Shell | Electron 35 (`vite-plugin-electron`, `electron-builder`, `electron-updater`) |
| UI | Vue 3 (`<script setup>` SFCs) |
| Language | TypeScript 5 |
| Bundler | Vite 4 |
| Vector store | Vectra (`LocalIndex`, on-disk JSON) |
| Clustering | `@greenelab/hclust` (default), `hdbscanjs` (optional) |
| Embeddings | Voyage AI (`voyageai`), Replicate (`replicate`) |
| LLM | `openai` SDK pointed at an OpenAI-compatible endpoint (OpenRouter by default) |
| File parsing | `file-type`, `mime-types`, `unpdf`, `word-extractor` |

## Requirements

- **Node.js 18+** (no `engines` field is declared, so nothing enforces this — 20+ recommended for Electron 35 tooling)
- **pnpm** — the repo ships a `pnpm-lock.yaml` and is developed with pnpm
- **API keys** for at least one embedding provider and one chat provider (see below)

## Setup

```bash
git clone https://github.com/ljbred08/ai-file-organizer.git
cd ai-file-organizer
pnpm install
```

Copy the example env file and fill in your keys:

```bash
cp .env.example .env
```

`.env` is gitignored — it must never be committed. The variables it can hold:

```dotenv
# Chat / LLM provider (OpenAI-compatible). Defaults to OpenRouter if unset.
AI_API_KEY=your_llm_key
AI_BASE_URL=https://openrouter.ai/api/v1
AI_MODEL=meta-llama/llama-3.1-8b-instruct

# Embeddings (required — this is the default embedding provider)
VOYAGE_API_KEY=your_voyage_key

# Only needed if you switch to the jina-clip-v2 or imagebind embedding models
REPLICATE_API_TOKEN=your_replicate_token
```

Then run the app:

```bash
pnpm dev
```

### Environment variables

| Variable | Read by | Required | Purpose |
| --- | --- | --- | --- |
| `AI_API_KEY` | `AIChatCompletions.ts` | Yes\* | API key for the chat provider. Canonical name. |
| `OPENROUTER_API_KEY` | `AIChatCompletions.ts` | — | Accepted as a fallback for `AI_API_KEY` (legacy name from before the OpenAI SDK switch). |
| `AI_BASE_URL` | `AIChatCompletions.ts` | No | OpenAI-compatible base URL. Defaults to `https://openrouter.ai/api/v1`. |
| `AI_MODEL` | `AIChatCompletions.ts` | No | Chat model. Defaults to `meta-llama/llama-3.1-8b-instruct`. |
| `VOYAGE_API_KEY` | `embeddingUtils.ts` | Yes | Voyage AI key for text and multimodal embeddings. |
| `REPLICATE_API_TOKEN` | `replicate` SDK | No | Only for the `jina-clip-v2` / `imagebind` embedding paths. |

\* Only required for **Smart Rename Folders**. The key is resolved lazily when the LLM is first called, so a missing key no longer prevents the app from starting — indexing, search, and clustering all work without it. If no key is found, folder naming fails with `Missing chat API key: set AI_API_KEY (or OPENROUTER_API_KEY) in your .env file.`

## Usage

Launch the app with `pnpm dev` (or run a packaged build). The window has three controls:

1. **Select Files/Folders → Process Files** — opens a folder picker, then walks every selected folder recursively. Each file is read, embedded, and written to the local vector index. Files whose basename is already indexed are skipped, so re-running is cheap-ish but does not re-embed changed files.
2. **Search files…** — embeds your query and shows the nearest indexed files in a dropdown overlay. Each result displays its filename and modality.
3. **Cluster Files** — clusters the entire index and prints the cluster tree to the console. Useful as a dry run before moving anything.
4. **Create Folder Structure** — clusters the index, asks you to pick a destination directory, then **moves** every indexed file into a folder tree matching the cluster structure.
5. **Smart Rename Folders** — asks you to pick a directory, then walks it bottom-up and asks the LLM to name each folder based on the files inside it.

### ⚠️ "Create Folder Structure" moves files, it does not copy them

`treeToFolderStructure.ts` calls `fs.renameSync(oldPath, newPath)` on every indexed file. Files leave their original location, there is no undo, and `renameSync` fails across filesystem/volume boundaries.

**Test on a copy of your data first.**

## Supported file types

| Input | Handling | Modality |
| --- | --- | --- |
| `text/*` (`.txt`, `.md`, `.csv`, …) | Read as UTF-8 | `text` |
| `.pdf` | Text extracted with `unpdf` | `text` |
| `.doc`, `.docx` | Text extracted with `word-extractor` | `text` |
| Anything else / unknown | Filename is embedded instead of contents | `text` |
| Images | Vision embedding path exists but is **commented out** in `fileReader.ts` | — |

## Project structure

```
src/
├── App.vue                        # Root layout: search bar, file selector, action buttons
├── components/
│   ├── FileSelector.vue           # Folder picker + "Process Files"
│   ├── FileSearch.vue             # Semantic search input + results overlay
│   ├── FileClusteringButton.vue   # Cluster / Create Folder Structure / Smart Rename
│   └── ErrorBoundary.vue          # errorCaptured wrapper
├── electron/
│   ├── main.ts                    # Main process entry, IPC handlers, auto-updater
│   ├── main/MainWindow.ts         # BrowserWindow creation, devtools, single-instance lock
│   ├── preload.ts                 # contextBridge -> window.electronAPI
│   ├── fileProcessing.ts          # Recursive walk, embed, store, dedupe
│   ├── fileReader.ts              # Extension/MIME routing to text extractors
│   ├── pdfExport.ts               # PDF -> text via unpdf
│   ├── embeddingUtils.ts          # Voyage / Replicate embedding backends
│   ├── vectra-db.ts               # Vectra LocalIndex wrapper (add, query, clear)
│   ├── hdbscan.ts                 # Clustering (hclust + optional HDBSCAN), cosine distance
│   ├── treeToFolderStructure.ts   # Cluster tree -> real directories + file moves
│   ├── smartRenameFolders.ts      # LLM-driven folder renaming
│   ├── AIChatCompletions.ts       # OpenAI-compatible chat client
│   └── clear-db.ts                # CLI script to wipe the vector index
└── types/                         # Ambient type declarations
```

## IPC surface

The renderer talks to the main process over these channels (`preload.ts` exposes `window.electronAPI`):

| Channel | Direction | Handler |
| --- | --- | --- |
| `open-file-dialog` | renderer → main (send) | Opens a multi-select folder dialog |
| `selected-file-paths` | main → renderer | Returns the chosen paths |
| `process-files` | renderer → main (send) | `getAllFilesInPaths` → `processAndStoreFiles` |
| `search-files` | renderer → main (invoke) | `semanticTextSearch(query, limit)` |
| `cluster-files` | renderer → main (invoke) | `performClustering()` — returns the cluster tree |
| `create-folder-structure` | renderer → main (invoke) | Clusters, picks a destination, moves files |
| `smart-rename-folders` | renderer → main (invoke) | LLM-renames folders under a chosen directory |

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Vite dev server + Electron main/preload, with hot reload |
| `pnpm build` | `vite build && electron-builder` |
| `pnpm preview` | Preview the Vite build |
| `pnpm clear-db` | Wipe the local vector index (`ts-node src/electron/clear-db.ts`) |

## Where data is stored

The Vectra index lives on disk in the Electron user-data directory:

- **Inside Electron:** `<userData>/vectra-index`
- **From the CLI (e.g. `pnpm clear-db`):** `%APPDATA%/ai-file-organizer/vectra-index`

`clear-db` relies on `%APPDATA%`, so on non-Windows platforms it will fail with `Could not determine app data directory!`. To reset the index elsewhere, delete the `vectra-index` folder manually.

## Known limitations

- **Windows-leaning.** The CLI path fallback uses `%APPDATA%`, and the LLM folder-name prompt is written around Windows-invalid characters.
- **Vision is disabled.** `fileReader.ts` has the `image/*` branch commented out, so images are indexed by filename only. The Voyage multimodal embedding path is still wired up.
- **Dedup is filename-only.** Files are skipped if a file with the same basename is already indexed, so same-named files in different folders collide.
- **No re-indexing of changed files.** Editing a file after indexing leaves the stale embedding in place.
- **`cluster-files` always uses hclust.** `performClustering` accepts a `clusteringAlgorithm` argument, but the IPC handler never passes one, so the HDBSCAN path is only reachable by direct import.
- **`pnpm build` has no `electron-builder` config.** There is no `build` key in `package.json` and no `electron-builder.yml`, so packaging uses electron-builder defaults (no app ID, no icon, no explicit file list).
- **`dist-electron/` is committed but gitignored,** and the checked-in bundle is stale — it predates the switch to the OpenAI SDK.
- **No tests, and no license file.**

## Security

`.env` is **not tracked** by git and is excluded via `.gitignore`. Secrets belong in `.env` only — never in tracked files, logs, or issue reports. Use `.env.example` as the template for what to set.

### ⚠️ Previously leaked keys must still be rotated

`.env` **was** committed to this public repository, including values for `REPLICATE_API_TOKEN`, `VOYAGE_API_KEY`, and `OPENROUTER_API_KEY`. It appears in history at commits `06f996a` and `25499e0`. Untracking the file stops future leaks but does **not** invalidate the exposed values.

If those keys were ever live, treat them as compromised:

1. **Rotate them** in the Voyage AI, Replicate, and OpenRouter dashboards. This is the only step that actually revokes access.
2. Anyone with read access to a public repo — and any fork or cache of it — may already have copied them.

Optional cleanup: purge `.env` from history (`git filter-repo --path .env --invert-paths`) and force-push. This is **not** a substitute for rotation, because forks and caches keep their own copies.

## Not yet implemented

Fragmentary stubs and dead code that hint at intended direction:

- `smartRenameFiles()` in `smartRenameFolders.ts` is an empty function
- Audio modality is referenced in the search UI icons but never produced by the reader
- `wink-bm25-text-search`, `fs-xattr`, `ml-hclust`, and `@mixmark-io/domino` are installed but unused in `src/`

## License

No license file is included in this repository. Until one is added, all rights are reserved. If you intend for others to use this code, add a `LICENSE` file (MIT and Apache-2.0 are common choices for projects like this).
