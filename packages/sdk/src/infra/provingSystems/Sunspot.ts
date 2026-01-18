import { readFile, writeFile, rm } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import type { IProvingSystem } from '../../domain/interfaces/proving/IProvingSystem.js';
import type { CompiledCircuit, InputMap, ProofData } from '../../domain/types.js';
import type { SunspotConfig, SunspotCircuitPaths, SunspotCompiledCircuit } from '../sunspot/types.js';
import { DEFAULT_SUNSPOT_CONFIG, isSunspotCircuit, SunspotCliError } from '../sunspot/types.js';
import { SunspotCliExecutor } from '../sunspot/SunspotCliExecutor.js';
import { createNoirProject } from './shared/noirProjectUtils.js';

/**
 * Sunspot proving system using CLI tools.
 * Node.js only (requires nargo and sunspot binaries).
 * Produces Groth16 proofs (~324 bytes) for Solana on-chain verification.
 */
export class Sunspot implements IProvingSystem {
  private readonly config: SunspotConfig;
  private readonly executor: SunspotCliExecutor;

  constructor(config: Partial<SunspotConfig> = {}) {
    this.config = { ...DEFAULT_SUNSPOT_CONFIG, ...config };
    this.executor = new SunspotCliExecutor(this.config);
  }

  async compile(noirCode: string): Promise<CompiledCircuit> {
    // 1. Create temp Noir project
    const project = await createNoirProject(noirCode, 'sunspot-circuit-', 'circuit');
    const targetDir = join(project.rootDir, 'target');

    // 2. Run nargo compile → circuit.json
    await this.executor.nargoCompile(project.rootDir);
    const circuitJsonPath = join(targetDir, 'circuit.json');

    // 3. Run sunspot compile → circuit.ccs
    await this.executor.sunspotCompile(circuitJsonPath);
    const ccsPath = join(dirname(circuitJsonPath), 'circuit.ccs');

    // 4. Run sunspot setup → circuit.pk + circuit.vk
    await this.executor.sunspotSetup(ccsPath);
    const pkPath = join(dirname(ccsPath), 'circuit.pk');
    const vkPath = join(dirname(ccsPath), 'circuit.vk');

    // 5. Read circuit.json to extract ABI
    const circuitJson = JSON.parse(await readFile(circuitJsonPath, 'utf-8'));

    // 6. Build paths object
    const paths: SunspotCircuitPaths = {
      workDir: project.rootDir,
      noirProjectDir: project.rootDir,
      circuitJsonPath,
      witnessPath: join(targetDir, 'circuit.gz'),
      ccsPath,
      pkPath,
      vkPath,
      proofPath: join(dirname(ccsPath), 'circuit.proof'),
      publicWitnessPath: join(dirname(ccsPath), 'circuit.pw'),
      proverTomlPath: join(project.rootDir, 'Prover.toml'),
    };

    // 7. Return SunspotCompiledCircuit (don't cleanup - prover needs the files)
    const sunspotCircuit: SunspotCompiledCircuit = {
      bytecode: circuitJson.bytecode || '',
      abi: circuitJson.abi || {
        parameters: [],
        return_type: null,
        error_types: {},
      },
      debug_symbols: circuitJson.debug_symbols || '',
      file_map: circuitJson.file_map || {},
      __sunspot: true,
      paths,
    };

    return sunspotCircuit;
  }

  async generateProof(circuit: CompiledCircuit, inputs: InputMap): Promise<ProofData> {
    if (!isSunspotCircuit(circuit)) {
      throw new Error(
        'Sunspot.generateProof requires a SunspotCompiledCircuit. Use Sunspot.compile() first.'
      );
    }

    const paths = circuit.paths;

    try {
      // 1. Write Prover.toml with inputs
      const proverToml = this.generateProverToml(inputs);
      await writeFile(paths.proverTomlPath, proverToml);

      // 2. Run nargo execute to generate witness
      await this.executor.nargoExecute(paths.noirProjectDir);

      // 3. Run sunspot prove to generate proof
      await this.executor.sunspotProve(
        paths.circuitJsonPath,
        paths.witnessPath,
        paths.ccsPath,
        paths.pkPath
      );

      // 4. Read proof and public witness files
      const proofBytes = new Uint8Array(await readFile(paths.proofPath));
      const publicWitnessBytes = new Uint8Array(await readFile(paths.publicWitnessPath));

      // 5. Parse public inputs from public witness
      const publicInputs = this.parsePublicWitness(publicWitnessBytes);

      return {
        proof: proofBytes,
        publicInputs,
      };
    } catch (error) {
      if (!this.config.keepArtifacts) {
        await rm(paths.workDir, { recursive: true, force: true }).catch(() => {});
      }
      throw error;
    }
  }

  async verifyProof(
    circuit: CompiledCircuit,
    proof: Uint8Array,
    publicInputs: string[]
  ): Promise<boolean> {
    if (!isSunspotCircuit(circuit)) {
      throw new Error(
        'Sunspot.verifyProof requires a SunspotCompiledCircuit. Use Sunspot.compile() first.'
      );
    }

    const paths = circuit.paths;

    try {
      // Use existing .proof and .pw files from generateProof
      const existingProof = await readFile(paths.proofPath).catch(() => null);
      if (!existingProof || !this.bytesEqual(existingProof, proof)) {
        await writeFile(paths.proofPath, proof);
      }

      await this.executor.sunspotVerify(
        paths.vkPath,
        paths.proofPath,
        paths.publicWitnessPath
      );

      return true;
    } catch (error) {
      if (error instanceof SunspotCliError) {
        if (error.stderr.toLowerCase().includes('verification failed') ||
            error.stderr.toLowerCase().includes('invalid proof')) {
          return false;
        }
      }
      throw error;
    } finally {
      if (!this.config.keepArtifacts) {
        await rm(paths.workDir, { recursive: true, force: true }).catch(() => {});
      }
    }
  }

  private generateProverToml(inputs: InputMap): string {
    const lines: string[] = [];
    for (const [key, value] of Object.entries(inputs)) {
      lines.push(`${key} = ${this.formatTomlValue(value)}`);
    }
    return lines.join('\n') + '\n';
  }

  private formatTomlValue(value: unknown): string {
    if (typeof value === 'string') {
      if (value.startsWith('0x')) return `"${value}"`;
      if (/^\d+$/.test(value)) return value;
      return `"${value}"`;
    }
    if (typeof value === 'number' || typeof value === 'bigint') {
      return value.toString();
    }
    if (Array.isArray(value)) {
      return `[${value.map(v => this.formatTomlValue(v)).join(', ')}]`;
    }
    return String(value);
  }

  private parsePublicWitness(bytes: Uint8Array): string[] {
    const publicInputs: string[] = [];
    const FIELD_SIZE = 32;

    for (let i = 0; i < bytes.length; i += FIELD_SIZE) {
      const fieldBytes = bytes.slice(i, Math.min(i + FIELD_SIZE, bytes.length));
      if (fieldBytes.length === FIELD_SIZE) {
        const hex = '0x' + Array.from(fieldBytes)
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
        publicInputs.push(hex);
      }
    }

    return publicInputs;
  }

  private bytesEqual(a: Buffer | Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }
}
