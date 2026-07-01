import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

// Single `@` → ./src alias (Shape A). PostCSS (Tailwind v4 via
// @tailwindcss/postcss) is picked up automatically from postcss.config.mjs.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
