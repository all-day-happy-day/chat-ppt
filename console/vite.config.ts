import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { defineConfig } from 'vite'
import removeConsole from 'vite-plugin-remove-console'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), removeConsole()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  }
})
