<template>
  <div class="app-bg">
    <div class="center-container">
      <div class="search-card">
        <FileSearch />
      </div>
      <h1 class="main-title">My File Organizer</h1>
      <div class="subtitle">Organize your files effortlessly</div>
      <div class="actions-row">
        <FileSelector />
        <FileClusteringButton />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import FileSelector from './components/FileSelector.vue';
import FileSearch from './components/FileSearch.vue';
import FileClusteringButton from './components/FileClusteringButton.vue';
// Other imports and setup
</script>

<style>
/* Global styles */
</style>
