<template>
  <button @click="sendMessage">Send Message to Main</button>
  <p>{{ messageFromMain }}</p>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const messageFromMain = ref('');

window.electronAPI.receive('fromMain', (data) => {
  messageFromMain.value = data;
});

function sendMessage() {
    window.electronAPI.send('toMain', 'Hello from Vue!');
}

</script>
