<template>
  <div>
    <button @click="openDialog">Select Files/Folders</button>
    <div v-if="selectedPaths.length > 0">
      <h3>Selected Items:</h3>
      <ul>
        <li v-for="path in selectedPaths" :key="path">{{ path }}</li>
      </ul>
      <button @click="processFiles">Process Files</button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted } from 'vue';

declare global {
  interface Window {
    electronAPI?: {
      send: (channel: string, data: any) => void;
      receive: (channel: string, func: any) => void;
      openFileSelectDialog: () => void;
      onFileSelect: (callback: (paths: string[] | undefined) => void) => void;
    };
  }
}

export default defineComponent({
  name: 'FileSelector',
  setup() {
    const selectedPaths = ref<string[]>([]);

    const openDialog = () => {
      console.log('Button clicked, attempting to open file dialog via Electron API');
      if (window.electronAPI && window.electronAPI.openFileSelectDialog) {
        window.electronAPI.openFileSelectDialog();
      } else {
        console.error('Electron API not available or openFileSelectDialog not exposed.');
        alert('File selection is only available in the Electron application.');
      }
    };

    const handleFileSelect = (paths: string[] | undefined) => {
      console.log('Received file selection result from main process:', paths);
      if (paths && paths.length > 0) {
        selectedPaths.value = paths;
      } else {
        selectedPaths.value = [];
      }
    };

    const processFiles = () => {
      if (window.electronAPI && window.electronAPI.send) {
        window.electronAPI.send('process-files', [...selectedPaths.value]);
      } else {
        console.error('Electron API not available or send not exposed.');
      }
    };

    onMounted(() => {
      console.log('FileSelector mounted, setting up Electron API listener.');
      if (window.electronAPI && window.electronAPI.onFileSelect) {
        window.electronAPI.onFileSelect(handleFileSelect);
      } else {
        console.error('Electron API not available or onFileSelect not exposed.');
      }
    });

    onUnmounted(() => {
      console.log('FileSelector unmounted.');
    });

    return {
      selectedPaths,
      openDialog,
      processFiles,
    };
  },
});
</script>

<style scoped>
ul {
  list-style: none;
  padding: 0;
}

li {
  background-color: #f0f0f0;
  color: black !important;
  margin-bottom: 5px;
  padding: 5px;
  border-radius: 4px;
  word-break: break-all;
}
</style>
