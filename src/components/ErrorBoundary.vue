<!-- ErrorBoundary.vue -->
<template>
  <div v-if="!error">
    <slot /> </div>
  <div v-else>
    <h2>Oops! Something went wrong.</h2>
    <p>{{ errorMessage }}</p>
    <button @click="resetError">Retry</button>  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue'

export default defineComponent({
    name: 'ErrorBoundary',
    setup() {
        const error = ref(null)
        const errorMessage = ref('')

        const errorHandler = (err, instance, info) => {
            console.error('Caught error:', err, instance, info) // Log the error details.
            error.value = err
            errorMessage.value = err.message || 'Unknown error occurred.'
        }

        const resetError = () => {
            error.value = null
            errorMessage.value = '' // Clear the error messages
        }

        return { error, errorMessage, errorHandler, resetError }

    },
    errorCaptured(err, instance, info) {
        this.errorHandler(err, instance, info) // Call errorHandler for consistent handling.
        // Prevent the error from propagating further up the component tree
        return false 
    }
})

</script>

