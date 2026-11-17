import { fileURLToPath, URL } from 'node:url'

import vue from '@vitejs/plugin-vue'
import { configDefaults, defineConfig } from 'vitest/config'

/**
 * 单测单独配置，不再 merge `vite.config.ts`：
 * 那边导出的是一份函数式配置（按 dev/build 切 base），而 `mergeConfig` 只吃对象。
 * 这里把测试真正需要的两样东西重新声明一遍——Vue 插件、`@` 别名。
 */
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    exclude: [...configDefaults.exclude, 'e2e/**'],
    root: fileURLToPath(new URL('./', import.meta.url)),
  },
})
