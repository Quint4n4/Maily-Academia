import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import vitePluginQR from './vite-plugin-qr.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), vitePluginQR()],
  server: {
    host: '0.0.0.0', // Permite acceso desde cualquier IP de la red local
    port: 5173,
    strictPort: false,
  },
})
