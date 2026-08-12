import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icon.svg', 'mask-icon.svg'],
      manifest: {
        name: 'WaveMaker V2 - Modern Writing App',
        short_name: 'WaveMaker V2',
        description: 'A modern, beautiful writing application with visual relationship mapping',
        theme_color: '#e8f4f8',
        background_color: '#e8f4f8',
        display: 'standalone',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}']
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 3434,
    open: true
  },
  // 关键：设置为相对路径，允许构建后在任何路径下运行
  base: './',
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['vue', 'dexie'],
          editor: ['@tiptap/core', '@tiptap/starter-kit']
        }
      }
    }
  }
})
