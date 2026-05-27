import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Mở cổng truy cập cho toàn bộ thiết bị trong mạng LAN
    port: 5173
  }
})
