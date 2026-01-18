import initACVM from '@noir-lang/acvm_js';
import initNoirC from '@noir-lang/noirc_abi';

let wasmInitPromise: Promise<[unknown, unknown]> | null = null;
let wasmInitialized = false;

/**
 * Initialize WASM modules for Noir compilation and execution.
 * Uses lazy loading with singleton pattern - safe to call multiple times.
 * Only initializes once, subsequent calls return immediately.
 */
export async function initNoirWasm(): Promise<void> {
  if (wasmInitialized) return;

  if (!wasmInitPromise) {
    wasmInitPromise = Promise.all([initACVM(), initNoirC()]);
  }

  await wasmInitPromise;
  wasmInitialized = true;
}

/**
 * Check if WASM modules are already initialized
 */
export function isWasmInitialized(): boolean {
  return wasmInitialized;
}

/**
 * Mark WASM as already initialized externally.
 * Use this when WASM has been initialized outside the SDK (e.g., with Vite URL imports).
 *
 * @example
 * ```typescript
 * // In Vite/browser environment
 * import initNoirC from "@noir-lang/noirc_abi";
 * import initACVM from "@noir-lang/acvm_js";
 * import acvm from "@noir-lang/acvm_js/web/acvm_js_bg.wasm?url";
 * import noirc from "@noir-lang/noirc_abi/web/noirc_abi_wasm_bg.wasm?url";
 * import { markWasmInitialized } from "@izi-noir/sdk";
 *
 * await Promise.all([initACVM(fetch(acvm)), initNoirC(fetch(noirc))]);
 * markWasmInitialized();
 * ```
 */
export function markWasmInitialized(): void {
  wasmInitialized = true;
}

/**
 * Reset WASM initialization state (for testing purposes)
 * @internal
 */
export function resetWasmInit(): void {
  wasmInitPromise = null;
  wasmInitialized = false;
}
