/*
 * @Author: Xu Ning
 * @Date: 2024-01-12 11:15:15
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-03-10 22:31:18
 * @FilePath: \spx-gui\vite.config.ts
 * @Description:
 */

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import VueDevTools from 'vite-plugin-vue-devtools'
import path from 'path'
// https://vitejs.dev/config/
const resolve = (dir: string) => path.join(__dirname, dir)
export default defineConfig(() => {
  return {
    plugins: [vue(), VueDevTools()],
    // base: env.VITE_PUBLISH_BASE_URL,
    build: {
      rollupOptions: {
        input: {
          'spx-runner': resolve('src/widgets/spx-runner/index.ts'),
          main: resolve('index.html')
        },
        output: {
          entryFileNames: (chunkInfo) => {
            if (chunkInfo.name === 'main') {
              return 'assets/[name]-[hash].js'
            }
            return 'widgets/[name].js'
          },
          manualChunks: {
            'monaco-editor': ['monaco-editor']
          }
        }
      }
    },
    resolve: {
      alias: {
        '@': resolve('src'),
        comps: resolve('src/components'),
        apis: resolve('src/apis'),
        views: resolve('src/views'),
        utils: resolve('src/utils'),
        routes: resolve('src/routes'),
        styles: resolve('src/styles'),
        store: resolve('src/store'),
        assets: resolve('/src/assets')
      }
    },
    optimizeDeps: {
      // include: [`monaco-editor/esm/vs/editor/editor.worker`]
    }
  }
})
