import type { ProofData, SolanaProofData, CompiledCircuit } from '../../types';
import type { CircuitMetadata, ChainId, ChainMetadataFor } from '../../types/chain';

/**
 * Interface for chain-specific proof formatters.
 *
 * Chain formatters convert generic ProofData into chain-specific formats
 * suitable for on-chain verification on different blockchains.
 *
 * @example
 * ```typescript
 * class SolanaFormatter implements IChainFormatter<'solana'> {
 *   readonly chainId = 'solana';
 *   async formatProof(proofData, circuit, metadata) {
 *     // Convert to gnark format for Solana
 *     return solanaProofData;
 *   }
 * }
 * ```
 */
export interface IChainFormatter<TChain extends ChainId = ChainId> {
  /**
   * Unique identifier for this chain
   */
  readonly chainId: TChain;

  /**
   * Format a generic proof for this chain's verification system
   *
   * @param proofData - Generic proof data from the proving system
   * @param circuit - The compiled circuit used for proving
   * @param metadata - Circuit metadata (public input count, etc.)
   * @returns Chain-specific proof data ready for on-chain verification
   */
  formatProof(
    proofData: ProofData,
    circuit: CompiledCircuit,
    metadata: CircuitMetadata
  ): Promise<ChainProofDataFor<TChain>>;

  /**
   * Get chain-specific metadata for a circuit
   *
   * @param publicInputCount - Number of public inputs in the circuit
   * @returns Chain-specific metadata (account size, gas estimates, etc.)
   */
  getChainMetadata(publicInputCount: number): ChainMetadataFor<TChain>;
}

/**
 * Type helper to get chain-specific proof data type
 */
export type ChainProofDataFor<T extends ChainId> = T extends 'solana'
  ? SolanaProofData
  : ProofData; // Default to generic for unknown chains
