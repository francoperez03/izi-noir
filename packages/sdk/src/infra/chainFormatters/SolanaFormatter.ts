import type { IChainFormatter } from '../../domain/interfaces/chain/IChainFormatter';
import type { ProofData, SolanaProofData, CompiledCircuit } from '../../domain/types';
import type { CircuitMetadata, SolanaChainMetadata } from '../../domain/types/chain';
import type { ArkworksWasm } from '../provingSystems/ArkworksWasm';

// Constants for VK account sizing
const G1_SIZE = 64;
const G2_SIZE = 128;

/**
 * Formatter for Solana-compatible proof data.
 *
 * Converts generic ProofData into SolanaProofData format with:
 * - Verifying key in gnark format (compatible with gnark-verifier-solana)
 * - Proof bytes (256 bytes Groth16)
 * - Public inputs as 32-byte arrays
 * - VK account size and rent estimates
 *
 * @example
 * ```typescript
 * const formatter = new SolanaFormatter(arkworksProvider);
 * const solanaProof = await formatter.formatProof(proofData, circuit, metadata);
 * ```
 */
export class SolanaFormatter implements IChainFormatter<'solana'> {
  readonly chainId = 'solana' as const;

  constructor(private arkworksProvider: ArkworksWasm) {}

  /**
   * Format a generic proof for Solana on-chain verification.
   *
   * @param proofData - Generic proof data from Arkworks
   * @param circuit - The compiled circuit (must be Arkworks circuit)
   * @param metadata - Circuit metadata with public input count
   * @returns SolanaProofData ready for on-chain verification
   */
  async formatProof(
    proofData: ProofData,
    circuit: CompiledCircuit,
    metadata: CircuitMetadata
  ): Promise<SolanaProofData> {
    // Get verifying key in gnark format
    const vkBytes = await this.arkworksProvider.getVerifyingKeyGnark(circuit);
    const vkBase64 = this.uint8ArrayToBase64(vkBytes);

    // Number of public inputs
    const nrPublicInputs = metadata.numPublicInputs;

    // Convert public inputs to 32-byte arrays
    const publicInputsBytes = proofData.publicInputs.map((input) => {
      const hex = input.startsWith('0x') ? input.slice(2) : input;
      return this.hexToBytes(hex.padStart(64, '0'));
    });

    // Calculate account size and rent
    const { accountSize, estimatedRent } = this.getChainMetadata(nrPublicInputs);

    return {
      verifyingKey: {
        base64: vkBase64,
        bytes: vkBytes,
        nrPublicInputs,
      },
      proof: {
        base64: this.uint8ArrayToBase64(proofData.proof),
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

  /**
   * Get Solana-specific metadata for a circuit.
   *
   * @param publicInputCount - Number of public inputs in the circuit
   * @returns Solana metadata with account size and rent estimates
   */
  getChainMetadata(publicInputCount: number): SolanaChainMetadata {
    const accountSize = this.calculateVkAccountSize(publicInputCount);
    const estimatedRent = this.calculateVkAccountRent(publicInputCount);

    return {
      chainId: 'solana',
      accountSize,
      estimatedRent,
    };
  }

  /**
   * Calculate the size of a VK account for a given number of public inputs.
   * Matches the Rust `vk_account_size` function in the Solana program.
   */
  private calculateVkAccountSize(nrPublicInputs: number): number {
    // discriminator (8) + authority (32) + nr_pubinputs (1) + alpha_g1 (64) +
    // beta_g2 (128) + gamma_g2 (128) + delta_g2 (128) + vec_len (4) + k elements
    const fixedSize = 8 + 32 + 1 + G1_SIZE + G2_SIZE * 3 + 4;
    return fixedSize + (nrPublicInputs + 1) * G1_SIZE;
  }

  /**
   * Calculate the minimum rent for a VK account.
   */
  private calculateVkAccountRent(
    nrPublicInputs: number,
    rentExemptionPerByte: number = 6960 // approximate lamports per byte
  ): number {
    const size = this.calculateVkAccountSize(nrPublicInputs);
    return size * rentExemptionPerByte;
  }

  /**
   * Convert Uint8Array to base64 string.
   */
  private uint8ArrayToBase64(bytes: Uint8Array): string {
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
  private hexToBytes(hex: string): Uint8Array {
    const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
    const bytes = new Uint8Array(cleanHex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(cleanHex.substring(i * 2, i * 2 + 2), 16);
    }
    return bytes;
  }
}
