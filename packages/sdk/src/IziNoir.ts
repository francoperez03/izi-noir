import { Provider, type IziNoirConfig, type CircuitPaths } from './domain/types/provider.js';
import type { IProvingSystem } from './domain/interfaces/proving/IProvingSystem.js';
import type { CompiledCircuit, InputMap, ProofData } from './domain/types.js';
import { initNoirWasm } from './infra/wasm/wasmInit.js';

/**
 * Main class for ZK proof generation with multiple backend providers.
 *
 * @example
 * ```typescript
 * import { IziNoir, Provider } from '@izi-noir/sdk';
 *
 * // Initialize with Barretenberg (browser-compatible, ~16KB proofs)
 * const izi = await IziNoir.init({ provider: Provider.Barretenberg });
 *
 * // Compile and prove
 * const circuit = await izi.compile(noirCode);
 * const proof = await izi.prove(inputs);
 * const verified = await izi.verify(proof.proof, proof.publicInputs);
 * ```
 */
export class IziNoir {
  private provingSystem: IProvingSystem;
  private compiledCircuit: CompiledCircuit | null = null;

  private constructor(provingSystem: IProvingSystem) {
    this.provingSystem = provingSystem;
  }

  /**
   * Initialize IziNoir with the specified provider.
   * Handles WASM initialization automatically.
   *
   * @param config - Configuration specifying the provider and optional circuit paths
   * @returns Initialized IziNoir instance
   *
   * @example
   * ```typescript
   * // Barretenberg (browser-compatible, ~16KB proofs)
   * const bb = await IziNoir.init({ provider: Provider.Barretenberg });
   *
   * // Arkworks (browser-compatible, ~256 bytes Groth16)
   * const ark = await IziNoir.init({ provider: Provider.Arkworks });
   *
   * // Sunspot (Node.js only, requires circuit paths)
   * const sunspot = await IziNoir.init({
   *   provider: Provider.Sunspot,
   *   circuitPaths: { pkPath: '...', vkPath: '...', circuitPath: '...' }
   * });
   * ```
   */
  static async init(config: IziNoirConfig): Promise<IziNoir> {
    // Initialize WASM (no-op if already initialized)
    await initNoirWasm();

    let provingSystem: IProvingSystem;

    switch (config.provider) {
      case Provider.Barretenberg: {
        const { Barretenberg } = await import('./infra/provingSystems/Barretenberg.js');
        provingSystem = new Barretenberg();
        break;
      }
      case Provider.Arkworks: {
        const { ArkworksWasm } = await import('./infra/provingSystems/ArkworksWasm.js');
        provingSystem = new ArkworksWasm();
        break;
      }
      case Provider.Sunspot: {
        // Sunspot is Node.js only and requires separate import to avoid bundling Node.js dependencies.
        // Import from '@izi-noir/sdk/sunspot' instead.
        throw new Error(
          'Sunspot is not available in the main entry point. ' +
          'Import from "@izi-noir/sdk/sunspot" for Sunspot support.'
        );
      }
      default:
        throw new Error(`Unknown provider: ${config.provider}`);
    }

    return new IziNoir(provingSystem);
  }

  /**
   * Get the underlying proving system instance.
   * Useful for advanced use cases.
   */
  getProvingSystem(): IProvingSystem {
    return this.provingSystem;
  }

  /**
   * Get the currently compiled circuit, if any.
   */
  getCompiledCircuit(): CompiledCircuit | null {
    return this.compiledCircuit;
  }

  /**
   * Compile Noir code into a circuit.
   *
   * @param noirCode - The Noir source code to compile
   * @returns The compiled circuit
   */
  async compile(noirCode: string): Promise<CompiledCircuit> {
    this.compiledCircuit = await this.provingSystem.compile(noirCode);
    return this.compiledCircuit;
  }

  /**
   * Generate a proof for the given inputs.
   *
   * @param inputs - The inputs (both public and private) for the circuit
   * @param circuit - Optional circuit to use (defaults to last compiled circuit)
   * @returns The proof data including proof bytes and public inputs
   * @throws Error if no circuit is available
   */
  async prove(inputs: InputMap, circuit?: CompiledCircuit): Promise<ProofData> {
    const circuitToUse = circuit || this.compiledCircuit;
    if (!circuitToUse) {
      throw new Error('No circuit available. Call compile() first or provide a circuit.');
    }
    return this.provingSystem.generateProof(circuitToUse, inputs);
  }

  /**
   * Verify a proof.
   *
   * @param proof - The proof bytes to verify
   * @param publicInputs - The public inputs that were used
   * @param circuit - Optional circuit to use (defaults to last compiled circuit)
   * @returns true if the proof is valid, false otherwise
   * @throws Error if no circuit is available
   */
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

  /**
   * Convenience method: compile, prove, and verify in one call.
   *
   * @param noirCode - The Noir source code to compile
   * @param inputs - The inputs (both public and private) for the circuit
   * @returns Object containing proof data and verification result
   *
   * @example
   * ```typescript
   * const { proof, verified } = await izi.createProof(noirCode, {
   *   x: '100',
   *   y: '10',
   * });
   * console.log(`Verified: ${verified}`);
   * ```
   */
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

// Re-export Provider and types for convenience
export { Provider, type IziNoirConfig, type CircuitPaths };
