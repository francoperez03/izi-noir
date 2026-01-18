// Re-export types from @noir-lang/types
import type { CompiledCircuit, InputMap } from '@noir-lang/types';
export type { CompiledCircuit, InputMap };

// Input types for the API
export type InputValue = number | string | bigint;

// Result types
export interface ProofTimings {
  parseMs: number;
  generateMs: number;
  compileMs: number;
  witnessMs: number;
  proofMs: number;
  verifyMs: number;
  totalMs: number;
}

export interface ProofResult {
  proof: Uint8Array;
  publicInputs: string[];
  verified: boolean;
  noirCode: string;
  timings: ProofTimings;
}

// Circuit function signature
export type CircuitFunction = (
  publicArgs: InputValue[],
  privateArgs: InputValue[]
) => void;

// Proof data returned by the prover
export interface ProofData {
  proof: Uint8Array;
  publicInputs: string[];
}

// Options for proof generation
export interface ProverOptions {
  threads?: number;
  verbose?: boolean;
}

// Options for verification
export interface VerifierOptions {
  verbose?: boolean;
}
