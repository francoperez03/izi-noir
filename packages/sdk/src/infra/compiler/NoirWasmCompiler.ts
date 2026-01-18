import { compile, createFileManager } from '@noir-lang/noir_wasm';
import { mkdtemp, writeFile, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ICompiler } from '../../domain/interfaces/ICompiler.js';
import type { CompiledCircuit } from '../../domain/types.js';

const NARGO_TOML = `[package]
name = "js_circuit"
type = "bin"
authors = [""]

[dependencies]
`;

export class NoirWasmCompiler implements ICompiler {
  async compile(noirCode: string): Promise<CompiledCircuit> {
    // Create a temporary directory for the Noir project
    const tempDir = await mkdtemp(join(tmpdir(), 'noir-circuit-'));

    try {
      // Write Nargo.toml
      await writeFile(join(tempDir, 'Nargo.toml'), NARGO_TOML);

      // Create src directory and write main.nr
      const srcDir = join(tempDir, 'src');
      await mkdir(srcDir, { recursive: true });
      await writeFile(join(srcDir, 'main.nr'), noirCode);

      // Create file manager pointing to the temp directory
      const fm = createFileManager(tempDir);

      // Compile
      const result = await compile(fm);

      // The compile result has a program property with the compiled circuit
      const compiled = (result as any).program as CompiledCircuit;

      if (!compiled || !compiled.bytecode) {
        throw new Error('Compilation failed: no bytecode generated');
      }

      return compiled;
    } finally {
      // Clean up temp directory
      await rm(tempDir, { recursive: true, force: true });
    }
  }
}
