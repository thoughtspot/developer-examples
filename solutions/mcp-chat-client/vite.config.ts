import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    "process.env": process.env,
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
        headers: {
          "X-Forwarded-Proto": "http",
          "X-Forwarded-Host": "localhost:5173",
        },
        bypass: (req, res, proxyOptions) => {
          if (req.url?.includes('/api/types')) {
            return req.url;
          }
        }
      },
    },
  },
})
