/**
 * Arkworks-only entry point for tree-shaking.
 *
 * Import from this module to only include Arkworks in your bundle,
 * excluding Barretenberg and Sunspot dependencies.
 *
 * @example
 * ```typescript
 * import { IziNoir, Provider } from '@izi-noir/sdk/arkworks';
 *
 * const izi = await IziNoir.init({ provider: Provider.Arkworks });
 * ```
 *
 * @module @izi-noir/sdk/arkworks
 */

export { ArkworksWasm, isArkworksCircuit } from '../infra/provingSystems/ArkworksWasm.js';
export type {
  ArkworksWasmConfig,
  ArkworksCompiledCircuit,
  ArkworksWasmModule,
  ArkworksSetupResult,
  ArkworksProofResult,
} from '../infra/provingSystems/ArkworksWasm.js';
export { IziNoir, Provider, type IziNoirConfig, type CircuitPaths } from '../IziNoir.js';
export { initNoirWasm, isWasmInitialized } from '../infra/wasm/wasmInit.js';
export type { CompiledCircuit, InputMap, ProofData } from '../domain/types.js';
export type { IProvingSystem } from '../domain/interfaces/proving/IProvingSystem.js';
