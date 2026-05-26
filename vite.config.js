import { defineConfig } from "vite";

export default defineConfig({
  base: "/New-project/",
  server: {
    host: "127.0.0.1",
    port: 5173,
  },
  preview: {
    host: "127.0.0.1",
    port: 4173,
  },
});
