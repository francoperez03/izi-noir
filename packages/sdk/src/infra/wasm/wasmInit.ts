let wasmInitPromise: Promise<void> | null = null;
let wasmInitialized = false;

/**
 * Check if running in Node.js environment
 */
function isNodeJs(): boolean {
  return (
    typeof globalThis.process !== 'undefined' &&
    globalThis.process.versions != null &&
    globalThis.process.versions.node != null
  );
}

/**
 * Initialize WASM modules for Noir compilation and execution.
 * Automatically detects Node.js vs browser and uses the appropriate WASM target.
 *
 * Uses lazy loading with singleton pattern - safe to call multiple times.
 * Only initializes once, subsequent calls return immediately.
 */
export async function initNoirWasm(): Promise<void> {
  if (wasmInitialized) return;

  if (!wasmInitPromise) {
    wasmInitPromise = initWasmInternal();
  }

  await wasmInitPromise;
  wasmInitialized = true;
}

async function initWasmInternal(): Promise<void> {
  if (isNodeJs()) {
    // Node.js: use the nodejs target which doesn't require fetch
    // The nodejs target auto-initializes when imported
    await import('@noir-lang/acvm_js/nodejs/acvm_js.js');
    await import('@noir-lang/noirc_abi/nodejs/noirc_abi_wasm.js');
  } else {
    // Browser: use the web target with default initialization
    // Note: For Vite/bundlers, external initialization with WASM URLs is preferred
    // Use markWasmInitialized() after initializing externally
    const [{ default: initACVM }, { default: initNoirC }] = await Promise.all([
      import('@noir-lang/acvm_js'),
      import('@noir-lang/noirc_abi'),
    ]);
    await Promise.all([initACVM(), initNoirC()]);
  }
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
