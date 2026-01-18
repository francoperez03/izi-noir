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
  /** Circuit paths - required for Sunspot provider */
  circuitPaths?: CircuitPaths;
}
