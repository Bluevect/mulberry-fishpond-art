import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? 'mulberry-fishpond-art'
const buildBase = process.env.VITE_BASE ?? `/${repoName}/`

// https://vite.dev/config/
export default defineConfig(({ command, isPreview }) => ({
  plugins: [vue(), vueDevTools()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  base: command === 'build' || isPreview ? buildBase : '/',
}))
