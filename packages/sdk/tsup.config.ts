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
});
