import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Reads the .env shared with vanilla/ from the example root.
  envDir: "..",
});
