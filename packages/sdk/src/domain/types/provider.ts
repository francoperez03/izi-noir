import { Chain } from './chain.js';
import { Network } from '../../solana/config.js';

/**
 * Available proving system providers
 */
export enum Provider {
  /** Barretenberg backend - browser compatible, UltraHonk proofs (~16KB) */
  Barretenberg = 'barretenberg',
  /** Arkworks WASM backend - browser compatible, Groth16 proofs (~256 bytes) */
  Arkworks = 'arkworks',
  /** Sunspot CLI backend - Node.js only, Groth16 proofs (~256 bytes) */
  Sunspot = 'sunspot',
}

/**
 * Configuration for circuit paths (required for Sunspot)
 */
export interface CircuitPaths {
  /** Path to the proving key file */
  pkPath: string;
  /** Path to the verification key file */
  vkPath: string;
  /** Path to the compiled circuit JSON file */
  circuitPath: string;
}

/**
 * Configuration for IziNoir initialization
 */
export interface IziNoirConfig {
  /** The proving system provider to use */
  provider: Provider;
  /**
   * Target blockchain for proof formatting.
   * If omitted, operates in offchain mode (raw proofs, no chain formatting).
   */
  chain?: Chain;
  /**
   * Solana network for deploy/verify operations.
   * Only used when chain is Chain.Solana.
   * Default: Network.Devnet
   */
  network?: Network;
  /** Circuit paths - required for Sunspot provider */
  circuitPaths?: CircuitPaths;
}

// Re-export Chain and Network for convenience
export { Chain };
export { Network };
