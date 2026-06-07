import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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