import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/providers/barretenberg.ts",
    "src/providers/arkworks.ts",
    "src/providers/sunspot.ts",
    "src/providers/solana.ts",
  ],
  format: ["esm", "cjs"],
  // Use resolve strategy for DTS to avoid worker issues in CI
  dts: {
    resolve: true,
    compilerOptions: {
      skipLibCheck: true,
    },
  },
  splitting: false,
  sourcemap: true,
  clean: true,
  minify: false,
  // Don't bundle Noir WASM modules - they have different entry points for web/nodejs
  // Local WASM loaders are bundled inline
  external: [
    "@noir-lang/acvm_js",
    "@noir-lang/acvm_js/nodejs/acvm_js.js",
    "@noir-lang/noirc_abi",
    "@noir-lang/noirc_abi/nodejs/noirc_abi_wasm.js",
    "@noir-lang/noir_wasm",
    "@noir-lang/noir_js",
    "@noir-lang/types",
  ],
  // Copy WASM binary files to dist (they're loaded by the bundled JS loaders)
  async onSuccess() {
    const { copyFile, mkdir, readdir } = await import("fs/promises");

    // Copy all WASM files to dist/wasm/ for runtime loading
    await mkdir("dist/wasm/nodejs", { recursive: true });
    await mkdir("dist/wasm/web", { recursive: true });

    const nodejsFiles = await readdir("src/wasm/nodejs");
    for (const file of nodejsFiles) {
      await copyFile(`src/wasm/nodejs/${file}`, `dist/wasm/nodejs/${file}`);
    }

    const webFiles = await readdir("src/wasm/web");
    for (const file of webFiles) {
      await copyFile(`src/wasm/web/${file}`, `dist/wasm/web/${file}`);
    }

    console.log("✓ Copied WASM files to dist/wasm/");
  },
});
