import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["tilesets/**/*"],
      manifest: {
        name: "NetHack",
        short_name: "NetHack",
        description: "The Dungeons of Doom, in your browser.",
        theme_color: "#0f1113",
        background_color: "#0f1113",
        display: "standalone",
        orientation: "any",
        icons: [
          { src: "icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
          { src: "icon-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,wasm,woff2,svg,json,png}"],
        maximumFileSizeToCacheInBytes: 16 * 1024 * 1024,
      },
    }),
  ],
  server: { port: 5173 },
  build: { target: "esnext" },
  worker: { format: "es" },
  optimizeDeps: { exclude: ["@nethack-web/engine"] },
});
