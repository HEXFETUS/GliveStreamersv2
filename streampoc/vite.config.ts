import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react()],
  optimizeDeps: {
    exclude: ['@livekit/components-styles'],
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: (id: string) => {
          if (id.includes('@livekit/components-react') || id.includes('livekit-client') || id.includes('@livekit/components-styles')) {
            return 'livekit';
          }
        },
      },
    },
  },
  server: {
    host: true, // Expose on all network interfaces (0.0.0.0)
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
