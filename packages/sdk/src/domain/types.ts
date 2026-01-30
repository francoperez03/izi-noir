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

// ========== Compilation Result Types ==========

/**
 * Result of compiling a circuit.
 * Contains the compiled circuit and verifying key generated during trusted setup.
 */
export interface CompileResult {
  /** The compiled circuit (includes cached PK/VK) */
  circuit: CompiledCircuit;
  /** Verifying key generated during trusted setup */
  verifyingKey: VerifyingKeyData;
}

// ========== Solana On-Chain Verification Types ==========

/**
 * Verifying key data for on-chain verification.
 * Stored on the IziNoir instance after compile() is called.
 */
export interface VerifyingKeyData {
  /** Base64-encoded VK in gnark format */
  base64: string;
  /** Raw VK bytes */
  bytes: Uint8Array;
  /** Number of public inputs for this circuit */
  nrPublicInputs: number;
}

/**
 * Data ready for Solana on-chain verification.
 *
 * Contains everything needed to:
 * 1. Initialize a VK account (`verifyingKey`)
 * 2. Verify a proof on-chain (`proof` + `publicInputs`)
 *
 * All data is pre-formatted for direct use with the IZI-NOIR Solana program,
 * eliminating the need for manual copy-paste from the frontend.
 *
 * @example
 * ```typescript
 * const izi = await IziNoir.init({ provider: Provider.Arkworks, chain: Chain.Solana });
 * await izi.compile(noirCode);
 * const solanaProof = await izi.prove(inputs);
 *
 * // Use directly in tests or transactions:
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
export interface SolanaProofData {
  /** Verifying key for init_vk instruction */
  verifyingKey: VerifyingKeyData;

  /** Groth16 proof for verify_proof instruction */
  proof: {
    /** Base64-encoded proof (256 bytes) */
    base64: string;
    /** Raw proof bytes */
    bytes: Uint8Array;
  };

  /** Public inputs for the proof */
  publicInputs: {
    /** Hex-encoded inputs (0x prefixed) */
    hex: string[];
    /** 32-byte arrays for each input */
    bytes: Uint8Array[];
  };

  /** Estimated VK account size in bytes */
  accountSize: number;

  /** Estimated rent in lamports for the VK account */
  estimatedRent: number;
}
