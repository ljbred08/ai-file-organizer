<!-- src/App.vue -->
<template>
  <div>
    <FileSearch />
    <h1>My File Organizer</h1>
    <FileSelector />
    <!-- Other parts of your app -->
  </div>
</template>

<script setup lang="ts">
import FileSelector from './components/FileSelector.vue';
import FileSearch from './components/FileSearch.vue';
// Other imports and setup
</script>

<style>
/* Global styles */
</style>
