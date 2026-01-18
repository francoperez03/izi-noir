import { compile, createFileManager } from '@noir-lang/noir_wasm';
import { Noir } from '@noir-lang/noir_js';
import { Barretenberg as BarretenbergBackend, UltraHonkBackend } from '@aztec/bb.js';
import type { IProvingSystem } from '../../domain/interfaces/proving/IProvingSystem.js';
import type { CompiledCircuit, InputMap, ProofData } from '../../domain/types.js';
import { createNoirProject, cleanupNoirProject } from './shared/noirProjectUtils.js';

/**
 * Barretenberg proving system using WASM.
 * Browser compatible, produces UltraHonk proofs (~16KB).
 */
export class Barretenberg implements IProvingSystem {
  async compile(noirCode: string): Promise<CompiledCircuit> {
    const project = await createNoirProject(noirCode, 'noir-circuit-', 'js_circuit');

    try {
      const fm = createFileManager(project.rootDir);
      const result = await compile(fm);
      const compiled = (result as any).program as CompiledCircuit;

      if (!compiled || !compiled.bytecode) {
        throw new Error('Compilation failed: no bytecode generated');
      }

      return compiled;
    } finally {
      await cleanupNoirProject(project);
    }
  }

  async generateProof(circuit: CompiledCircuit, inputs: InputMap): Promise<ProofData> {
    const noir = new Noir(circuit);
    const { witness } = await noir.execute(inputs);

    const barretenberg = await BarretenbergBackend.new({ threads: 1 });
    const backend = new UltraHonkBackend(circuit.bytecode, barretenberg);

    try {
      const proofData = await backend.generateProof(witness);
      return {
        proof: proofData.proof,
        publicInputs: proofData.publicInputs || [],
      };
    } finally {
      await barretenberg.destroy();
    }
  }

  async verifyProof(
    circuit: CompiledCircuit,
    proof: Uint8Array,
    publicInputs: string[]
  ): Promise<boolean> {
    const barretenberg = await BarretenbergBackend.new({ threads: 1 });
    const backend = new UltraHonkBackend(circuit.bytecode, barretenberg);

    try {
      return await backend.verifyProof({ proof, publicInputs });
    } finally {
      await barretenberg.destroy();
    }
  }
}
