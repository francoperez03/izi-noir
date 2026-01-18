/**
 * Sunspot entry point for Node.js.
 *
 * This module provides Sunspot support which is NOT available in the main
 * `@izi-noir/sdk` entry point due to Node.js-only dependencies.
 *
 * Note: Sunspot requires nargo and sunspot CLI tools to be installed.
 *
 * @example Using Sunspot directly
 * ```typescript
 * import { Sunspot } from '@izi-noir/sdk/sunspot';
 *
 * // Full compilation mode
 * const sunspot = new Sunspot();
 * const circuit = await sunspot.compile(noirCode);
 * const proof = await sunspot.generateProof(circuit, inputs);
 * const verified = await sunspot.verifyProof(circuit, proof.proof, proof.publicInputs);
 *
 * // Pre-compiled mode
 * const sunspot = new Sunspot({
 *   pkPath: './circuit/circuit.pk',
 *   vkPath: './circuit/circuit.vk',
 *   circuitPath: './circuit/circuit.json',
 * });
 * ```
 *
 * @example Using initSunspotIziNoir helper
 * ```typescript
 * import { initSunspotIziNoir } from '@izi-noir/sdk/sunspot';
 *
 * const izi = await initSunspotIziNoir({
 *   pkPath: './circuit/circuit.pk',
 *   vkPath: './circuit/circuit.vk',
 *   circuitPath: './circuit/circuit.json',
 * });
 *
 * // Use like regular IziNoir (but only prove/verify, not compile)
 * const proof = await izi.prove(inputs);
 * const verified = await izi.verify(proof.proof, proof.publicInputs);
 * ```
 *
 * @module @izi-noir/sdk/sunspot
 */

import type { IProvingSystem } from '../domain/interfaces/proving/IProvingSystem.js';
import type { CompiledCircuit, InputMap, ProofData } from '../domain/types.js';
import type { CircuitPaths } from '../domain/types/provider.js';
import { Sunspot } from '../infra/provingSystems/Sunspot.js';

export { Sunspot } from '../infra/provingSystems/Sunspot.js';
export type { SunspotInitConfig } from '../infra/provingSystems/Sunspot.js';
export type {
  SunspotConfig,
  SunspotCircuitPaths,
  SunspotCompiledCircuit,
} from '../infra/sunspot/types.js';
export { isSunspotCircuit, SunspotCliError } from '../infra/sunspot/types.js';

// Re-export common types
export { Provider, type IziNoirConfig, type CircuitPaths } from '../domain/types/provider.js';
export type { CompiledCircuit, InputMap, ProofData } from '../domain/types.js';
export type { IProvingSystem } from '../domain/interfaces/proving/IProvingSystem.js';

/**
 * IziNoir-like wrapper for Sunspot.
 * Provides a similar API to IziNoir but backed by the Sunspot proving system.
 */
export class IziNoirSunspot {
  private provingSystem: IProvingSystem;
  private compiledCircuit: CompiledCircuit | null = null;

  private constructor(provingSystem: IProvingSystem) {
    this.provingSystem = provingSystem;
  }

  /**
   * Initialize IziNoirSunspot with pre-compiled circuit paths.
   * Note: Sunspot requires pre-compiled circuits for prove/verify operations.
   *
   * @param circuitPaths - Paths to the pre-compiled circuit files
   */
  static async init(circuitPaths: CircuitPaths): Promise<IziNoirSunspot> {
    const sunspot = new Sunspot(circuitPaths);
    return new IziNoirSunspot(sunspot);
  }

  /**
   * Initialize IziNoirSunspot for full compilation mode.
   * Requires nargo and sunspot CLI tools to be installed.
   */
  static async initForCompilation(): Promise<IziNoirSunspot> {
    const sunspot = new Sunspot();
    return new IziNoirSunspot(sunspot);
  }

  getProvingSystem(): IProvingSystem {
    return this.provingSystem;
  }

  getCompiledCircuit(): CompiledCircuit | null {
    return this.compiledCircuit;
  }

  async compile(noirCode: string): Promise<CompiledCircuit> {
    this.compiledCircuit = await this.provingSystem.compile(noirCode);
    return this.compiledCircuit;
  }

  async prove(inputs: InputMap, circuit?: CompiledCircuit): Promise<ProofData> {
    const circuitToUse = circuit || this.compiledCircuit;
    if (!circuitToUse) {
      throw new Error('No circuit available. Call compile() first or provide a circuit.');
    }
    return this.provingSystem.generateProof(circuitToUse, inputs);
  }

  async verify(
    proof: Uint8Array,
    publicInputs: string[],
    circuit?: CompiledCircuit
  ): Promise<boolean> {
    const circuitToUse = circuit || this.compiledCircuit;
    if (!circuitToUse) {
      throw new Error('No circuit available. Call compile() first or provide a circuit.');
    }
    return this.provingSystem.verifyProof(circuitToUse, proof, publicInputs);
  }

  async createProof(
    noirCode: string,
    inputs: InputMap
  ): Promise<{ proof: ProofData; verified: boolean }> {
    const circuit = await this.compile(noirCode);
    const proof = await this.prove(inputs, circuit);
    const verified = await this.verify(proof.proof, proof.publicInputs, circuit);
    return { proof, verified };
  }
}

/**
 * Helper function to create an IziNoirSunspot instance with pre-compiled circuit paths.
 * @deprecated Use `IziNoirSunspot.init(circuitPaths)` instead.
 */
export async function initSunspotIziNoir(circuitPaths: CircuitPaths): Promise<IziNoirSunspot> {
  return IziNoirSunspot.init(circuitPaths);
}
