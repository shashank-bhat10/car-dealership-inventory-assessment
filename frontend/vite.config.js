import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: { environment: "jsdom" },
  server: { proxy: { "/api": "http://127.0.0.1:8000" } },
});
