import { defineConfig } from "vite";

export default defineConfig({
  // Reads the .env shared with react/ and the token server from the example root.
  envDir: "..",
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
