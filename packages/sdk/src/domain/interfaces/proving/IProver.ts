import type { CompiledCircuit, InputMap, ProofData } from '../../types.js';

/**
 * Interface for generating zero-knowledge proofs
 */
export interface IProver {
  /**
   * Generate a proof for the given circuit and inputs
   *
   * @param circuit - The compiled circuit to prove
   * @param inputs - The inputs (both public and private) for the circuit
   * @returns The proof data including proof bytes and public inputs
   */
  generateProof(circuit: CompiledCircuit, inputs: InputMap): Promise<ProofData>;
}
