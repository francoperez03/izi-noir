import { defineConfig, type PluginOption } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Plugin to set correct MIME type for WASM files in dev server
function wasmMimePlugin(): PluginOption {
  return {
    name: "wasm-mime-type",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.endsWith(".wasm")) {
          res.setHeader("Content-Type", "application/wasm");
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), wasmMimePlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      buffer: "buffer/",
      // Resolve SDK locally from source
      "@izi-noir/sdk": path.resolve(__dirname, "../sdk/src/index.ts"),
    },
  },
  define: {
    "global": "globalThis",
  },
  optimizeDeps: {
    exclude: ["@noir-lang/noir_wasm", "@aztec/bb.js", "@izi-noir/sdk"],
    include: ["buffer"],
  },
  build: {
    rollupOptions: {
      // Don't try to resolve dynamic WASM imports statically
      external: [
        /arkworks_groth16_wasm/,
      ],
    },
  },
});
