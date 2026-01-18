import type { CompiledCircuit } from '@noir-lang/types';

/**
 * Configuration for Sunspot CLI execution
 */
export interface SunspotConfig {
  /** Path to nargo binary (default: 'nargo') */
  nargoBinaryPath: string;
  /** Path to sunspot binary (default: 'sunspot') */
  sunspotBinaryPath: string;
  /** Keep temp artifacts for debugging (default: false) */
  keepArtifacts: boolean;
  /** Timeout for CLI commands in ms (default: 120000) */
  timeoutMs: number;
}

export const DEFAULT_SUNSPOT_CONFIG: SunspotConfig = {
  nargoBinaryPath: process.env.NARGO_PATH || 'nargo',
  sunspotBinaryPath: process.env.SUNSPOT_PATH || 'sunspot',
  keepArtifacts: process.env.SUNSPOT_KEEP_ARTIFACTS === 'true',
  timeoutMs: 120000,
};

/**
 * Paths to all Sunspot artifacts in the temp directory
 */
export interface SunspotCircuitPaths {
  /** Base temp directory */
  workDir: string;
  /** Noir project directory with Nargo.toml */
  noirProjectDir: string;
  /** Path to compiled circuit.json (ACIR) */
  circuitJsonPath: string;
  /** Path to witness.gz */
  witnessPath: string;
  /** Path to circuit.ccs */
  ccsPath: string;
  /** Path to proving key */
  pkPath: string;
  /** Path to verification key */
  vkPath: string;
  /** Path to proof file */
  proofPath: string;
  /** Path to public witness file */
  publicWitnessPath: string;
  /** Path to Prover.toml */
  proverTomlPath: string;
}

/**
 * Extended CompiledCircuit for Sunspot backend
 */
export interface SunspotCompiledCircuit extends CompiledCircuit {
  /** Marker to identify Sunspot circuits */
  __sunspot: true;
  /** Paths to all artifacts */
  paths: SunspotCircuitPaths;
}

/**
 * Type guard to check if a circuit is a Sunspot circuit
 */
export function isSunspotCircuit(circuit: CompiledCircuit): circuit is SunspotCompiledCircuit {
  return '__sunspot' in circuit && (circuit as SunspotCompiledCircuit).__sunspot === true;
}

/**
 * Result of CLI command execution
 */
export interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Error thrown when CLI command fails
 */
export class SunspotCliError extends Error {
  constructor(
    message: string,
    public readonly command: string,
    public readonly exitCode: number,
    public readonly stderr: string
  ) {
    super(message);
    this.name = 'SunspotCliError';
  }
}
