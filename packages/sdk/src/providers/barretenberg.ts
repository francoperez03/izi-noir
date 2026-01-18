/**
 * Barretenberg-only entry point for tree-shaking.
 *
 * Import from this module to only include Barretenberg in your bundle,
 * excluding Arkworks and Sunspot dependencies.
 *
 * @example
 * ```typescript
 * import { IziNoir, Provider } from '@izi-noir/sdk/barretenberg';
 *
 * const izi = await IziNoir.init({ provider: Provider.Barretenberg });
 * ```
 *
 * @module @izi-noir/sdk/barretenberg
 */

export { Barretenberg } from '../infra/provingSystems/Barretenberg.js';
export { IziNoir, Provider, type IziNoirConfig, type CircuitPaths } from '../IziNoir.js';
export { initNoirWasm, isWasmInitialized } from '../infra/wasm/wasmInit.js';
export type { CompiledCircuit, InputMap, ProofData } from '../domain/types.js';
export type { IProvingSystem } from '../domain/interfaces/proving/IProvingSystem.js';
