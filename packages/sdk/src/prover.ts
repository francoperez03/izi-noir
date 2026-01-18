import { Noir } from '@noir-lang/noir_js';
import { Barretenberg, UltraHonkBackend } from '@aztec/bb.js';
import type { InputMap } from '@noir-lang/types';
import type { CompiledCircuit, ProofData } from './types.js';

export async function generateProof(
  circuit: CompiledCircuit,
  inputs: InputMap
): Promise<ProofData> {
  // Create Noir instance for witness generation
  const noir = new Noir(circuit);

  // Execute to get witness
  const { witness } = await noir.execute(inputs);

  // Create backend for proof generation
  const barretenberg = await Barretenberg.new({
    threads: 1,
  });

  // Create UltraHonkBackend with the bytecode and Barretenberg instance
  const backend = new UltraHonkBackend(circuit.bytecode, barretenberg);

  try {
    // Generate proof
    const proofData = await backend.generateProof(witness);

    return {
      proof: proofData.proof,
      publicInputs: proofData.publicInputs || [],
    };
  } finally {
    // Cleanup Barretenberg instance
    await barretenberg.destroy();
  }
}

export async function verifyProof(
  circuit: CompiledCircuit,
  proof: Uint8Array,
  publicInputs: string[]
): Promise<boolean> {
  const barretenberg = await Barretenberg.new({
    threads: 1,
  });

  const backend = new UltraHonkBackend(circuit.bytecode, barretenberg);

  try {
    const verified = await backend.verifyProof({
      proof,
      publicInputs,
    });

    return verified;
  } finally {
    await barretenberg.destroy();
  }
}
