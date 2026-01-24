/**
 * Chain types for multi-chain proof formatting
 */

/**
 * Supported blockchain targets for proof verification
 */
export type ChainId = 'solana' | 'ethereum';

/**
 * Chain enum for IziNoir initialization.
 * Use undefined (don't pass chain) for offchain mode.
 */
export enum Chain {
  /** Solana blockchain - uses Groth16 proofs with gnark format VK */
  Solana = 'solana',
  /** Ethereum blockchain - uses Groth16 proofs (future support) */
  Ethereum = 'ethereum',
}

/**
 * Metadata about the compiled circuit
 */
export interface CircuitMetadata {
  /** Number of public inputs in the circuit */
  numPublicInputs: number;
  /** Optional circuit name for identification */
  circuitName?: string;
}

/**
 * Base interface for chain-specific metadata
 */
export interface ChainMetadata {
  chainId: ChainId;
}

/**
 * Solana-specific metadata for VK account sizing and rent
 */
export interface SolanaChainMetadata extends ChainMetadata {
  chainId: 'solana';
  /** Size of the VK account in bytes */
  accountSize: number;
  /** Estimated rent-exempt balance in lamports */
  estimatedRent: number;
}

/**
 * Ethereum-specific metadata (future)
 */
export interface EthereumChainMetadata extends ChainMetadata {
  chainId: 'ethereum';
  /** Estimated gas for verification */
  estimatedGas: bigint;
}

/**
 * Type helper to get chain-specific metadata
 */
export type ChainMetadataFor<T extends ChainId> = T extends 'solana'
  ? SolanaChainMetadata
  : T extends 'ethereum'
    ? EthereumChainMetadata
    : ChainMetadata;
