import { Provider, type IziNoirConfig, type CircuitPaths } from './domain/types/provider.js';
import type { IProvingSystem } from './domain/interfaces/proving/IProvingSystem.js';
import type { CompiledCircuit, InputMap, ProofData, SolanaProofData } from './domain/types.js';
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

  /**
   * Generate a proof with all data needed for Solana on-chain verification.
   *
   * This method returns everything you need to:
   * 1. Initialize a VK account on Solana
   * 2. Verify the proof on-chain
   *
   * Use this instead of `prove()` when you need on-chain verification.
   *
   * @param inputs - The inputs (both public and private) for the circuit
   * @param circuit - Optional circuit to use (defaults to last compiled circuit)
   * @returns All data needed for Solana verification
   * @throws Error if no circuit is available or if the provider doesn't support Solana
   *
   * @example
   * ```typescript
   * const izi = await IziNoir.init({ provider: Provider.Arkworks });
   * await izi.compile(noirCode);
   *
   * const solanaProof = await izi.proveForSolana({ expected: 100, secret: 10 });
   *
   * // Use directly in Anchor tests:
   * await program.methods.initVkFromBytes(
   *   solanaProof.verifyingKey.nrPublicInputs,
   *   Buffer.from(solanaProof.verifyingKey.bytes)
   * ).rpc();
   *
   * await program.methods.verifyProof(
   *   Buffer.from(solanaProof.proof.bytes),
   *   solanaProof.publicInputs.bytes.map(b => Array.from(b))
   * ).rpc();
   * ```
   */
  async proveForSolana(inputs: InputMap, circuit?: CompiledCircuit): Promise<SolanaProofData> {
    const circuitToUse = circuit || this.compiledCircuit;
    if (!circuitToUse) {
      throw new Error('No circuit available. Call compile() first or provide a circuit.');
    }

    // Check if this is an Arkworks circuit
    const { isArkworksCircuit, ArkworksWasm } = await import('./infra/provingSystems/ArkworksWasm.js');
    if (!isArkworksCircuit(circuitToUse)) {
      throw new Error(
        'proveForSolana() requires the Arkworks provider. ' +
        'Initialize with: IziNoir.init({ provider: Provider.Arkworks })'
      );
    }

    // Get the proving system as ArkworksWasm
    const arkworks = this.provingSystem as InstanceType<typeof ArkworksWasm>;

    // Generate proof
    const proofData = await this.prove(inputs, circuitToUse);

    // Get verifying key in gnark format
    const vkBytes = await arkworks.getVerifyingKeyGnark(circuitToUse);
    const vkBase64 = uint8ArrayToBase64(vkBytes);

    // Get number of public inputs
    const nrPublicInputs = proofData.publicInputs.length;

    // Convert public inputs to bytes
    const publicInputsBytes = proofData.publicInputs.map((input) => {
      const hex = input.startsWith('0x') ? input.slice(2) : input;
      return hexToBytes(hex.padStart(64, '0'));
    });

    // Calculate account size and rent
    const accountSize = calculateVkAccountSize(nrPublicInputs);
    const estimatedRent = calculateVkAccountRent(nrPublicInputs);

    return {
      verifyingKey: {
        base64: vkBase64,
        bytes: vkBytes,
        nrPublicInputs,
      },
      proof: {
        base64: uint8ArrayToBase64(proofData.proof),
        bytes: proofData.proof,
      },
      publicInputs: {
        hex: proofData.publicInputs,
        bytes: publicInputsBytes,
      },
      accountSize,
      estimatedRent,
    };
  }
}

// ========== Helper Functions for Solana ==========

const G1_SIZE = 64;
const G2_SIZE = 128;

/**
 * Calculate the size of a VK account for a given number of public inputs.
 * Matches the Rust `vk_account_size` function.
 */
function calculateVkAccountSize(nrPublicInputs: number): number {
  // discriminator (8) + authority (32) + nr_pubinputs (1) + alpha_g1 (64) +
  // beta_g2 (128) + gamma_g2 (128) + delta_g2 (128) + vec_len (4) + k elements
  const fixedSize = 8 + 32 + 1 + G1_SIZE + G2_SIZE * 3 + 4;
  return fixedSize + (nrPublicInputs + 1) * G1_SIZE;
}

/**
 * Calculate the minimum rent for a VK account.
 */
function calculateVkAccountRent(
  nrPublicInputs: number,
  rentExemptionPerByte: number = 6960 // approximate lamports per byte
): number {
  const size = calculateVkAccountSize(nrPublicInputs);
  return size * rentExemptionPerByte;
}

/**
 * Convert Uint8Array to base64 string.
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  // Browser-compatible
  if (typeof btoa === 'function') {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
  // Node.js fallback
  return Buffer.from(bytes).toString('base64');
}

/**
 * Convert hex string to Uint8Array.
 */
function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

// Re-export Provider and types for convenience
export { Provider, type IziNoirConfig, type CircuitPaths };
export type { SolanaProofData } from './domain/types.js';
