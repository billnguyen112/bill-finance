import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev server proxies the API to the Flask backend (pipeline/server.py).
// On build we use relative asset paths so the site works under a GitHub Pages
// project subpath (https://user.github.io/<repo>/).
export default defineConfig(({ command }) => ({
  base: command === "build" ? "./" : "/",
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
}));
