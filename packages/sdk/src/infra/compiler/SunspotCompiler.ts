import { mkdtemp, writeFile, mkdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname, basename } from 'node:path';
import type { ICompiler } from '../../domain/interfaces/ICompiler.js';
import type { CompiledCircuit } from '../../domain/types.js';
import type { SunspotConfig, SunspotCircuitPaths, SunspotCompiledCircuit } from '../sunspot/types.js';
import { DEFAULT_SUNSPOT_CONFIG } from '../sunspot/types.js';
import { SunspotCliExecutor } from '../sunspot/SunspotCliExecutor.js';

const NARGO_TOML = `[package]
name = "circuit"
type = "bin"
authors = [""]

[dependencies]
`;

/**
 * Compiles Noir code using nargo and sunspot CLI tools.
 * Produces Groth16-compatible artifacts for Solana verification.
 */
export class SunspotCompiler implements ICompiler {
  private readonly config: SunspotConfig;
  private readonly executor: SunspotCliExecutor;

  constructor(config: Partial<SunspotConfig> = {}) {
    this.config = { ...DEFAULT_SUNSPOT_CONFIG, ...config };
    this.executor = new SunspotCliExecutor(this.config);
  }

  async compile(noirCode: string): Promise<CompiledCircuit> {
    // 1. Create temp directory structure
    const workDir = await mkdtemp(join(tmpdir(), 'sunspot-circuit-'));
    const noirProjectDir = join(workDir, 'circuit');
    const srcDir = join(noirProjectDir, 'src');
    const targetDir = join(noirProjectDir, 'target');

    await mkdir(srcDir, { recursive: true });

    // 2. Write Noir project files
    await writeFile(join(noirProjectDir, 'Nargo.toml'), NARGO_TOML);
    await writeFile(join(srcDir, 'main.nr'), noirCode);

    // 3. Run nargo compile → circuit.json
    await this.executor.nargoCompile(noirProjectDir);

    // Find the generated JSON file
    const circuitJsonPath = join(targetDir, 'circuit.json');

    // 4. Run sunspot compile → circuit.ccs
    await this.executor.sunspotCompile(circuitJsonPath);
    const ccsPath = join(dirname(circuitJsonPath), 'circuit.ccs');

    // 5. Run sunspot setup → circuit.pk + circuit.vk
    await this.executor.sunspotSetup(ccsPath);
    const pkPath = join(dirname(ccsPath), 'circuit.pk');
    const vkPath = join(dirname(ccsPath), 'circuit.vk');

    // 6. Read circuit.json to extract ABI for compatibility
    const circuitJson = JSON.parse(await readFile(circuitJsonPath, 'utf-8'));

    // 7. Build paths object
    const paths: SunspotCircuitPaths = {
      workDir,
      noirProjectDir,
      circuitJsonPath,
      witnessPath: join(targetDir, 'circuit.gz'),
      ccsPath,
      pkPath,
      vkPath,
      proofPath: join(dirname(ccsPath), 'circuit.proof'),
      publicWitnessPath: join(dirname(ccsPath), 'circuit.pw'),
      proverTomlPath: join(noirProjectDir, 'Prover.toml'),
    };

    // 8. Return SunspotCompiledCircuit
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
}
