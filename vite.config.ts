import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const PROJECT_ROOT = path.dirname(fileURLToPath(import.meta.url));
const plugins = [react(), tailwindcss(), jsxLocPlugin()];

export default defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(PROJECT_ROOT, "client", "src"),
      "@shared": path.resolve(PROJECT_ROOT, "shared"),
      "@assets": path.resolve(PROJECT_ROOT, "attached_assets"),
    },
  },
  envDir: path.resolve(PROJECT_ROOT),
  root: path.resolve(PROJECT_ROOT, "client"),
  publicDir: path.resolve(PROJECT_ROOT, "client", "public"),
  build: {
    outDir: path.resolve(PROJECT_ROOT, "dist/public"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 1700,
  },
  server: {
    host: true,
    allowedHosts: [
      "localhost",
      "127.0.0.1",
    ],
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
