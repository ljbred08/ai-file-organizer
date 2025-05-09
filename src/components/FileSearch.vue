<template>
    <div class="file-search-container" ref="container">
      <div class="search-bar">
        <span class="icon">🔍</span>
        <input
          v-model="query"
          @keydown.enter="onSearch"
          type="text"
          placeholder="Search files..."
          class="search-input"
          :disabled="loading"
        />
        <button v-if="query" class="clear-btn" @click="clearSearch">✕</button>
      </div>
      <!-- Overlay for results -->
      <transition name="fade">
        <div
          v-if="showOverlay"
          class="results-overlay"
          tabindex="0"
        >
          <div v-if="loading" class="loading-spinner">Searching...</div>
          <div v-else-if="results.length === 0" class="empty-state">
            No files found.
          </div>
          <div v-else>
            <div
             v-for="result in results"
              :key="result.item.id || result.item.metadata?.filename"
              class="result-card"
              @click="selectFile(result.item)"
            >
              <span class="file-icon">{{ fileIcon(result.item) }}</span>
              <div class="file-info">
                <div class="file-name">{{ result.item.metadata?.filename }}</div>
                <div class="file-meta">
                  <span v-if="result.item.modality">{{ result.item.modality }}</span>
                  <span v-if="result.item.size">• {{ formatSize(result.item.size) }}</span>
                  <span v-if="result.item.date">• {{ formatDate(result.item.date) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </transition>
    </div>
  </template>
  
  <script setup lang="ts">
  import { ref, onMounted, onBeforeUnmount } from 'vue';
  
  const query = ref('');
  const results = ref<any[]>([]);
  const loading = ref(false);
  const showOverlay = ref(false);
  const container = ref<HTMLDivElement | null>(null);
  
  function onSearch() {
    if (!query.value.trim()) {
      clearSearch();
      return;
    }
    loading.value = true;
    showOverlay.value = false;
    // Call the main process via preload's invoke
    window.electronAPI.invoke('search-files', query.value, 15)
      .then((res: any[]) => {
        results.value = res || [];
        showOverlay.value = true;
      })
      .finally(() => {
        loading.value = false;
      });
  }
  
  function clearSearch() {
    query.value = '';
    results.value = [];
    showOverlay.value = false;
  }
  
  function selectFile(file: any) {
    // Placeholder: emit event, open file, etc.
    alert(`Selected file: ${file.name}`);
    showOverlay.value = false;
  }
  
  function fileIcon(file: any) {
    if (file.modality === 'vision') return '🖼️';
    if (file.modality === 'audio') return '🎵';
    if (file.modality === 'text') return '📄';
    return '📁';
  }
  
  function formatSize(size: number) {
    if (!size) return '';
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
  }
  
  function formatDate(date: string | number) {
    if (!date) return '';
    return new Date(date).toLocaleDateString();
  }
  
  // Hide overlay when clicking outside
  function onClickOutside(event: MouseEvent) {
    if (container.value && !container.value.contains(event.target as Node)) {
      showOverlay.value = false;
    }
  }
  
  onMounted(() => {
    document.addEventListener('mousedown', onClickOutside);
  });
  onBeforeUnmount(() => {
    document.removeEventListener('mousedown', onClickOutside);
  });
  </script>
  
  <style scoped>
  .file-search-container {
    position: relative;
    width: 100%;
    max-width: 500px;
    margin: 0 auto;
    color: #222;
  }
  
  .search-bar {
    display: flex;
    align-items: center;
    background: #fff;
    border-radius: 2rem;
    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    padding: 0.25rem 1rem;
    border: 1px solid #e0e0e0;
    position: relative;
  }
  
  .icon {
    font-size: 1.2rem;
    margin-right: 0.5rem;
    color: #888;
  }
  
  .search-input {
    flex: 1;
    border: none;
    outline: none;
    font-size: 1.1rem;
    background: transparent;
    padding: 0.5rem 0;
    color: #222;         /* Ensures text is black */
    caret-color: #222;   /* Ensures cursor is black */

  }
  
  .clear-btn {
    background: none;
    border: none;
    font-size: 1.1rem;
    color: #aaa;
    cursor: pointer;
    margin-left: 0.5rem;
  }
  
  .results-overlay {
    position: absolute;
    top: 110%;
    left: 0;
    width: 100%;
    background: #fff;
    border-radius: 1rem;
    box-shadow: 0 8px 24px rgba(0,0,0,0.13);
    z-index: 10;
    padding: 0.5rem 0;
    max-height: 340px;
    overflow-y: auto;
    animation: fadeIn 0.2s;
  }
  
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-8px);}
    to { opacity: 1; transform: translateY(0);}
  }
  
  .result-card {
    display: flex;
    align-items: center;
    padding: 0.75rem 1.25rem;
    cursor: pointer;
    transition: background 0.14s;
  }
  .result-card:hover {
    background: #f1f5fa;
  }
  .file-icon {
    font-size: 1.5rem;
    margin-right: 1rem;
  }
  .file-info {
    flex: 1;
  }
  .file-name {
    font-weight: 500;
    font-size: 1.07rem;
    color: #222;
  }
  .file-meta {
    color: #888;
    font-size: 0.95rem;
    margin-top: 0.1rem;
  }
  
  .loading-spinner {
    text-align: center;
    padding: 1.5rem 0;
    color: #888;
    font-size: 1.1rem;
  }
  .empty-state {
    text-align: center;
    padding: 1.5rem 0;
    color: #bbb;
    font-size: 1.1rem;
  }
  .fade-enter-active, .fade-leave-active {
    transition: opacity 0.15s;
  }
  .fade-enter-from, .fade-leave-to {
    opacity: 0;
  }
  </style>