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
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  minify: false,
  // Don't bundle Noir WASM modules - they have different entry points for web/nodejs
  external: [
    "@noir-lang/acvm_js",
    "@noir-lang/acvm_js/nodejs/acvm_js.js",
    "@noir-lang/noirc_abi",
    "@noir-lang/noirc_abi/nodejs/noirc_abi_wasm.js",
    "@noir-lang/noir_wasm",
    "@noir-lang/noir_js",
    "@noir-lang/types",
    "@izi-noir/arkworks-groth16-wasm",
    "@izi-noir/arkworks-groth16-wasm/nodejs",
  ],
});
