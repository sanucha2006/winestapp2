import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Winest App',
        short_name: 'Winest',
        description: 'Winest Progressive Web App',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone', // แสดงผลแบบเต็มจอ ซ่อนแถบ URL บราวเซอร์
        icons: [
          {
            src: '/winest_logo.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/winest_logo.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/winest_logo.png',
            sizes: '1024x1024',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // แยก supabase
            if (id.includes('@supabase')) {
              return 'supabase'
            }
            // แยก recharts
            if (id.includes('recharts')) {
              return 'recharts'
            }
            // แยก lucide-react
            if (id.includes('lucide-react')) {
              return 'lucide'
            }
            // ยุบ react, react-dom, react-router-dom และ scheduler ไว้ใน chunk เดียวกัน
            if (
              id.includes('react/') ||
              id.includes('react-dom/') ||
              id.includes('react-router-dom/') ||
              id.includes('scheduler/')
            ) {
              return 'react-core'
            }
          }
        }
      }
    }
  }
})