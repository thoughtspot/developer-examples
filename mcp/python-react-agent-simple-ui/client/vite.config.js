import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  envDir: "..",
  server: {
    // Port 8000 is the origin allowlisted in the ThoughtSpot cluster's CSP
    // `frame-ancestors`. Serving the app from anywhere else makes Chrome block the
    // embed iframe. `strictPort` so we fail loudly instead of sliding to 8001.
    port: 8000,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://localhost:8001",
        changeOrigin: true,
      },
    },
  },
});
