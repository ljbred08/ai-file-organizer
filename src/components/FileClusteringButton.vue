<template>
 <button @click="clusterFiles">Cluster Files</button>
 <!-- <div v-if="clusteredFiles">Clustered Files: {{ clusteredFiles }}</div> -->
 <button @click="createFolderStructure">Create Folder Structure</button>
 <button @click="smartRenameFolders">Smart Rename Folders</button>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const clusteredFiles = ref(null)

const clusterFiles = () => {
 // Call the main process to cluster files
 if (window.electronAPI) {
 window.electronAPI.invoke('cluster-files').then((files) => {
 clusteredFiles.value = files;
 });
 } else {
 console.error('electronAPI is not defined');
 }
}

const createFolderStructure = () => {
 // Call the main process to create folder structure
 if (window.electronAPI) {
 window.electronAPI.invoke('create-folder-structure').then(() => {
 console.log('Folder structure created');
 });
 } else {
 console.error('electronAPI is not defined');
 }
}

const smartRenameFolders = () => {
 // Call the main process to smart rename folders
 if (window.electronAPI) {
 window.electronAPI.invoke('smart-rename-folders').then(() => {
 console.log('Folders renamed');
 });
 } else {
 console.error('electronAPI is not defined');
 }
}
</script>
