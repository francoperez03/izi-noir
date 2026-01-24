import { Chain } from './chain.js';

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
  /** Circuit paths - required for Sunspot provider */
  circuitPaths?: CircuitPaths;
}

// Re-export Chain for convenience
export { Chain };
