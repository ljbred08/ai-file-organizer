import { defineConfig } from 'vite'
import { builtinModules } from 'module';
import vue from '@vitejs/plugin-vue'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
  const isServe = command === 'serve'
  const isBuild = command === 'build'
  const sourcemap = isServe || isBuild
  return {
    plugins: [
      vue(),
      electron([
        {
          // Main-Process entry file of the Electron App.
          entry: 'src/electron/main.ts',
        },
        {
          entry: 'src/electron/preload.ts',
          onstart(options) {
            // Notify the Renderer-Process to reload the page when the Preload-Scripts build is complete, 
            // instead of restarting the entire Electron App.
            options.reload()
          },
        },
      ]),
      // Use Node.js API in the Renderer-process
      renderer({
        nodeIntegration: true,
      }),
    ],
    resolve: {
        alias: {
          '@': '/src',
          '@r': '/electron'
        }
      },
    output: {
      // To avoid conflicts with the compiled version of `electron/main.ts`.
      // Remove this if you don't plan to use the compiled version of `electron/main.ts`.
      manualChunks: {
        main: ['./electron/main.ts'],
        preload: ['./electron/preload.ts'],
      },
    },
    server: isServe ? {
      port: 5174,
    } : undefined,
    build: isBuild ? {
      // For the compiled version of `electron/main.ts`
      rollupOptions: {
        external: [
          'electron',
          ...builtinModules,
        ],
      },
      outDir: 'dist-electron', // Specify a dedicated Electron output directory
    } : undefined,
  }
})
