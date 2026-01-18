import type { CompiledCircuit } from '../../types.js';

/**
 * Interface for verifying zero-knowledge proofs
 */
export interface IVerifier {
  /**
   * Verify a proof against a compiled circuit
   *
   * @param circuit - The compiled circuit used to generate the proof
   * @param proof - The proof bytes to verify
   * @param publicInputs - The public inputs that were used
   * @returns true if the proof is valid, false otherwise
   */
  verifyProof(
    circuit: CompiledCircuit,
    proof: Uint8Array,
    publicInputs: string[]
  ): Promise<boolean>;
}
