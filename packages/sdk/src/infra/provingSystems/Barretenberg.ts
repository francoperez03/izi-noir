import { compile, createFileManager } from '@noir-lang/noir_wasm';
import { Noir } from '@noir-lang/noir_js';
import { Barretenberg as BarretenbergBackend, UltraHonkBackend } from '@aztec/bb.js';
import type { IProvingSystem } from '../../domain/interfaces/proving/IProvingSystem.js';
import type { CompiledCircuit, InputMap, ProofData } from '../../domain/types.js';

/**
 * Helper to create a ReadableStream from a string
 * Used to write files to the virtual filesystem (browser-compatible)
 */
function stringToStream(content: string): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(content));
      controller.close();
    },
  });
}

/**
 * Check if running in Node.js environment
 */
function isNodeJs(): boolean {
  return (
    typeof globalThis.process !== 'undefined' &&
    globalThis.process.versions != null &&
    globalThis.process.versions.node != null
  );
}

/**
 * Create temp directory in Node.js, or return '/' for browser virtual fs
 */
async function createTempDir(): Promise<{ basePath: string; cleanup: (() => Promise<void>) | null }> {
  if (!isNodeJs()) {
    // Browser: use virtual filesystem
    return { basePath: '/', cleanup: null };
  }

  // Node.js: create real temp directory
  // Use dynamic import which works in both Node.js ESM and CJS
  const fs = await import('node:fs/promises');
  const os = await import('node:os');
  const path = await import('node:path');

  const basePath = await fs.mkdtemp(path.join(os.tmpdir(), 'noir-circuit-'));
  const cleanup = async () => {
    await fs.rm(basePath, { recursive: true, force: true });
  };

  return { basePath, cleanup };
}

/**
 * Barretenberg proving system using WASM.
 * Browser compatible, produces UltraHonk proofs (~16KB).
 */
export class Barretenberg implements IProvingSystem {
  async compile(noirCode: string): Promise<CompiledCircuit> {
    const { basePath, cleanup } = await createTempDir();
    const fm = createFileManager(basePath);

    const nargoToml = `[package]
name = "circuit"
type = "bin"
authors = [""]

[dependencies]
`;

    try {
      // Write files using ReadableStream (browser-compatible)
      // In Node.js: writeFile is async and must be awaited
      // In browser: writeFile works with virtual fs, should not await for noir_wasm compatibility
      if (isNodeJs()) {
        await fm.writeFile('./src/main.nr', stringToStream(noirCode));
        await fm.writeFile('./Nargo.toml', stringToStream(nargoToml));
      } else {
        fm.writeFile('./src/main.nr', stringToStream(noirCode));
        fm.writeFile('./Nargo.toml', stringToStream(nargoToml));
      }

      const result = await compile(fm);
      const compiled = (result as any).program as CompiledCircuit;

      if (!compiled || !compiled.bytecode) {
        throw new Error('Compilation failed: no bytecode generated');
      }

      return compiled;
    } finally {
      if (cleanup) {
        await cleanup();
      }
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
