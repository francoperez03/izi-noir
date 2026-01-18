import type { CompiledCircuit, InputMap, ProofData } from '../types.js';

export interface IProver {
  generateProof(circuit: CompiledCircuit, inputs: InputMap): Promise<ProofData>;
  verifyProof(circuit: CompiledCircuit, proof: Uint8Array, publicInputs: string[]): Promise<boolean>;
}
