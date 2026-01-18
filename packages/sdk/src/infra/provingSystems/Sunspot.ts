import { readFile, writeFile, rm, mkdtemp, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import type { IProvingSystem } from '../../domain/interfaces/proving/IProvingSystem.js';
import type { CompiledCircuit, InputMap, ProofData } from '../../domain/types.js';
import type { SunspotConfig, SunspotCircuitPaths, SunspotCompiledCircuit } from '../sunspot/types.js';
import { DEFAULT_SUNSPOT_CONFIG, isSunspotCircuit, SunspotCliError } from '../sunspot/types.js';
import { SunspotCliExecutor } from '../sunspot/SunspotCliExecutor.js';
import type { CircuitPaths } from '../../domain/types/provider.js';

/**
 * Configuration for Sunspot constructor
 */
export interface SunspotInitConfig extends Partial<SunspotConfig> {
  /** Pre-compiled circuit paths (if provided, compile() is disabled) */
  precompiledPaths?: CircuitPaths;
}

/**
 * Sunspot proving system using CLI tools.
 * Node.js only (requires nargo and sunspot binaries).
 * Produces Groth16 proofs (~324 bytes) for Solana on-chain verification.
 *
 * Can be used in two modes:
 * 1. Full compilation: Call compile() with Noir code (requires nargo + sunspot CLI)
 * 2. Pre-compiled: Provide circuitPaths in constructor, then only prove/verify
 *
 * @example Full compilation
 * ```typescript
 * const sunspot = new Sunspot();
 * const circuit = await sunspot.compile(noirCode);
 * const proof = await sunspot.generateProof(circuit, inputs);
 * ```
 *
 * @example Pre-compiled (via IziNoir)
 * ```typescript
 * const izi = await IziNoir.init({
 *   provider: Provider.Sunspot,
 *   circuitPaths: { pkPath: '...', vkPath: '...', circuitPath: '...' }
 * });
 * ```
 */
export class Sunspot implements IProvingSystem {
  private readonly config: SunspotConfig;
  private readonly executor: SunspotCliExecutor;
  private readonly precompiledPaths?: CircuitPaths;
  private precompiledCircuit?: SunspotCompiledCircuit;

  /**
   * Create a new Sunspot proving system
   * @param config - Configuration options or pre-compiled circuit paths
   */
  constructor(config: SunspotInitConfig | CircuitPaths = {}) {
    // Check if config is CircuitPaths (has pkPath, vkPath, circuitPath)
    if ('pkPath' in config && 'vkPath' in config && 'circuitPath' in config) {
      this.config = { ...DEFAULT_SUNSPOT_CONFIG };
      this.precompiledPaths = config as CircuitPaths;
    } else {
      const initConfig = config as SunspotInitConfig;
      this.config = { ...DEFAULT_SUNSPOT_CONFIG, ...initConfig };
      this.precompiledPaths = initConfig.precompiledPaths;
    }

    this.executor = new SunspotCliExecutor(this.config);

    // If pre-compiled paths provided, create a dummy circuit object
    if (this.precompiledPaths) {
      this.precompiledCircuit = this.createPrecompiledCircuit(this.precompiledPaths);
    }
  }

  /**
   * Create a SunspotCompiledCircuit from pre-compiled paths
   */
  private createPrecompiledCircuit(paths: CircuitPaths): SunspotCompiledCircuit {
    const baseDir = dirname(paths.circuitPath);
    return {
      bytecode: '', // Not needed for prove/verify with pre-compiled
      abi: { parameters: [], return_type: null, error_types: {} },
      debug_symbols: '',
      file_map: {},
      __sunspot: true,
      paths: {
        workDir: baseDir,
        noirProjectDir: baseDir,
        circuitJsonPath: paths.circuitPath,
        witnessPath: join(baseDir, 'circuit.gz'),
        ccsPath: join(baseDir, 'circuit.ccs'),
        pkPath: paths.pkPath,
        vkPath: paths.vkPath,
        proofPath: join(baseDir, 'circuit.proof'),
        publicWitnessPath: join(baseDir, 'circuit.pw'),
        proverTomlPath: join(baseDir, 'Prover.toml'),
      },
    };
  }

  /**
   * Create a temporary Noir project for compilation
   */
  private async createNoirProject(noirCode: string, packageName: string): Promise<{ rootDir: string }> {
    const rootDir = await mkdtemp(join(tmpdir(), 'sunspot-circuit-'));
    const srcDir = join(rootDir, 'src');
    await mkdir(srcDir, { recursive: true });

    const nargoToml = `[package]
name = "${packageName}"
type = "bin"
authors = [""]

[dependencies]
`;

    await writeFile(join(rootDir, 'Nargo.toml'), nargoToml);
    await writeFile(join(srcDir, 'main.nr'), noirCode);

    return { rootDir };
  }

  async compile(noirCode: string): Promise<CompiledCircuit> {
    if (this.precompiledPaths) {
      throw new Error(
        'Sunspot was initialized with pre-compiled circuit paths. ' +
        'compile() is not available. Use generateProof() and verifyProof() directly.'
      );
    }

    // 1. Create temp Noir project
    const project = await this.createNoirProject(noirCode, 'circuit');
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
    // Use precompiled circuit if available and circuit is empty/default
    const circuitToUse = this.resolveCircuit(circuit);

    if (!isSunspotCircuit(circuitToUse)) {
      throw new Error(
        'Sunspot.generateProof requires a SunspotCompiledCircuit. Use Sunspot.compile() first.'
      );
    }

    const paths = circuitToUse.paths;

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
    // Use precompiled circuit if available and circuit is empty/default
    const circuitToUse = this.resolveCircuit(circuit);

    if (!isSunspotCircuit(circuitToUse)) {
      throw new Error(
        'Sunspot.verifyProof requires a SunspotCompiledCircuit. Use Sunspot.compile() first.'
      );
    }

    const paths = circuitToUse.paths;

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

  /**
   * Resolve which circuit to use - precompiled or provided
   */
  private resolveCircuit(circuit: CompiledCircuit): CompiledCircuit {
    // If circuit is a proper SunspotCompiledCircuit, use it
    if (isSunspotCircuit(circuit)) {
      return circuit;
    }

    // If we have precompiled paths, use those
    if (this.precompiledCircuit) {
      return this.precompiledCircuit;
    }

    // Otherwise, return the provided circuit (will fail validation)
    return circuit;
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
