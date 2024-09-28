import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  host: "0.0.0.0",
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8000", // Your FastAPI server address, for local development
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
