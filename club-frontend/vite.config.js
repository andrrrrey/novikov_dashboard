import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Приложение раздаётся под подпапкой /club, поэтому base и прокси API — с этим префиксом.
export default defineConfig({
  base: "/club/",
  plugins: [react()],
  server: {
    proxy: {
      "/club/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/club\/api/, ""),
      },
    },
  },
});
