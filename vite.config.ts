import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { mkdirSync, existsSync, copyFileSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-manifest-and-static',
      closeBundle() {
        const outDir = resolve(__dirname, 'dist')
        if (!existsSync(outDir)) {
          mkdirSync(outDir, { recursive: true })
        }
        // Copy manifest
        copyFileSync(resolve(__dirname, 'public/manifest.json'), resolve(outDir, 'manifest.json'))
        // Copy icons if they exist
        const iconFiles = ['icon16.png', 'icon48.png', 'icon128.png']
        for (const icon of iconFiles) {
          const src = resolve(__dirname, `public/${icon}`)
          if (existsSync(src)) {
            copyFileSync(src, resolve(outDir, icon))
          }
        }
      }
    }
  ],
  build: {
    rollupOptions: {
      input: {
        background: resolve(__dirname, 'src/background.ts'),
        content: resolve(__dirname, 'src/content.ts'),
        main: resolve(__dirname, 'index.html'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'background') return 'assets/background-v1.js'
          if (chunkInfo.name === 'content') return 'assets/content.js'
          return 'assets/[name]-[hash].js'
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    outDir: 'dist',
    emptyOutDir: true,
  },
})
