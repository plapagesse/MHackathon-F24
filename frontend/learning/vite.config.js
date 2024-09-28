import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8000", // Your FastAPI server address, for local development
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
      "/ws": {
        target: "ws://localhost:8000", // Your WebSocket server
        ws: true,
        changeOrigin: true,
        // rewrite: (path) => path.replace(/^\/ws/, ''), // Optional path rewrite
      },
    },
  },
});
