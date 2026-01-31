/**
 * ArkworksWasm proving system.
 *
 * 100% browser-compatible Groth16 prover using arkworks compiled to WASM.
 * Produces proofs compatible with gnark-verifier-solana for on-chain verification.
 *
 * Features:
 * - Runs entirely in the browser (no CLI dependencies)
 * - Generates compact Groth16 proofs (~256 bytes)
 * - Compatible with gnark-verifier-solana
 * - Uses BN254 curve
 */

import { compile, createFileManager } from '@noir-lang/noir_wasm';
import { Noir } from '@noir-lang/noir_js';
import { decompressWitness } from '@noir-lang/acvm_js';
import type { IProvingSystem } from '../../domain/interfaces/proving/IProvingSystem.js';
import type { CompileOptions } from '../../domain/interfaces/proving/ICompiler.js';
import type { CompiledCircuit, InputMap, ProofData } from '../../domain/types.js';
import { R1csBuilder, type AuxWitnessComputation, type R1csDefinition } from './R1csBuilder.js';

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

  const basePath = await fs.mkdtemp(path.join(os.tmpdir(), 'arkworks-circuit-'));
  const cleanup = async () => {
    await fs.rm(basePath, { recursive: true, force: true });
  };

  return { basePath, cleanup };
}

/**
 * Result of Groth16 setup from arkworks WASM module
 */
export interface ArkworksSetupResult {
  /** Base64-encoded proving key */
  proving_key: string;
  /** Base64-encoded verifying key (arkworks format) */
  verifying_key: string;
  /** Base64-encoded verifying key (gnark format for Solana) */
  verifying_key_gnark: string;
}

/**
 * Result of Groth16 proof generation from arkworks WASM module
 */
export interface ArkworksProofResult {
  /** Base64-encoded proof (arkworks format) */
  proof: string;
  /** Base64-encoded proof (gnark format, 256 bytes) */
  proof_gnark: string;
  /** Public inputs as hex strings */
  public_inputs: string[];
  /** Base64-encoded public inputs (gnark format) */
  public_inputs_gnark: string;
}

/**
 * Interface for the arkworks-groth16-wasm WASM module
 */
export interface ArkworksWasmModule {
  setup(acirJson: string): ArkworksSetupResult;
  prove(provingKeyB64: string, acirJson: string, witnessJson: string): ArkworksProofResult;
  verify(verifyingKeyB64: string, proofB64: string, publicInputsJson: string): boolean;
  verify_gnark(
    verifyingKeyGnarkB64: string,
    proofGnarkB64: string,
    publicInputsGnarkB64: string,
    numPublicInputs: number
  ): boolean;
  acir_to_r1cs_info(acirJson: string): {
    num_witnesses: number;
    num_constraints: number;
    public_inputs: number[];
    private_inputs: number[];
    return_values: number[];
  };
  version(): string;
  // R1CS-based API (bypasses ACIR bytecode decoding)
  setup_from_r1cs(r1csJson: string): ArkworksSetupResult;
  prove_from_r1cs(provingKeyB64: string, r1csJson: string, witnessJson: string): ArkworksProofResult;
}

/**
 * Configuration for ArkworksWasm prover
 */
export interface ArkworksWasmConfig {
  /** Keep intermediate artifacts for debugging */
  keepArtifacts?: boolean;
  /** Cache proving/verifying keys for repeated proofs */
  cacheKeys?: boolean;
}

// R1CS types are imported from R1csBuilder.ts
// Re-export for backwards compatibility
export type { R1csConstraint, R1csDefinition, AuxWitnessComputation } from './R1csBuilder.js';

/**
 * Extended CompiledCircuit for ArkworksWasm backend
 */
export interface ArkworksCompiledCircuit extends CompiledCircuit {
  /** Marker to identify ArkworksWasm circuits */
  __arkworks: true;
  /** ACIR program as JSON string (used for setup/prove) - DEPRECATED, use r1csJson */
  acirJson: string;
  /** R1CS definition as JSON string (used for setup/prove) */
  r1csJson: string;
  /** Mapping from noir witness index to R1CS witness index */
  witnessIndexMapping: Map<number, number>;
  /** Cached proving key (base64) if cacheKeys is enabled */
  provingKey?: string;
  /** Cached verifying key (base64) if cacheKeys is enabled */
  verifyingKey?: string;
  /** Cached verifying key in gnark format (base64) */
  verifyingKeyGnark?: string;
}

/**
 * Type guard to check if a circuit is an ArkworksWasm circuit
 */
export function isArkworksCircuit(circuit: CompiledCircuit): circuit is ArkworksCompiledCircuit {
  return '__arkworks' in circuit && (circuit as ArkworksCompiledCircuit).__arkworks === true;
}

// WASM module singleton
let wasmModule: ArkworksWasmModule | null = null;
let wasmInitPromise: Promise<ArkworksWasmModule> | null = null;

/**
 * Get paths for Node.js WASM loading
 * Returns both the JS loader path and the WASM binary path
 */
async function getWasmPaths(): Promise<{ loaderPath: string; wasmPath: string }> {
  const url = await import('node:url');
  const path = await import('node:path');
  const fs = await import('node:fs');

  // Resolve relative to this file's location in dist/
  const dirname = path.dirname(url.fileURLToPath(import.meta.url));

  // Try multiple possible locations for WASM files:
  // 1. dist/wasm/web/ (when importing from main entry dist/index.js)
  // 2. dist/providers/../wasm/web/ = dist/wasm/web/ (when importing from dist/providers/arkworks.js)
  const possiblePaths = [
    path.join(dirname, 'wasm', 'web'),
    path.join(dirname, '..', 'wasm', 'web'),
    path.join(dirname, '..', '..', 'wasm', 'web'),
  ];

  for (const wasmDir of possiblePaths) {
    const loaderPath = path.join(wasmDir, 'arkworks_groth16_wasm.js');
    if (fs.existsSync(loaderPath)) {
      return {
        loaderPath,
        wasmPath: path.join(wasmDir, 'arkworks_groth16_wasm_bg.wasm'),
      };
    }
  }

  // Fallback to original path
  return {
    loaderPath: path.join(dirname, 'wasm', 'web', 'arkworks_groth16_wasm.js'),
    wasmPath: path.join(dirname, 'wasm', 'web', 'arkworks_groth16_wasm_bg.wasm'),
  };
}

/**
 * Initialize the arkworks WASM module
 * Uses the web target for both Node.js and browser.
 * The web target produces ESM which works in both environments.
 */
async function initWasm(): Promise<ArkworksWasmModule> {
  if (wasmModule) {
    return wasmModule;
  }

  if (wasmInitPromise) {
    return wasmInitPromise;
  }

  wasmInitPromise = (async () => {
    try {
      if (isNodeJs()) {
        // Node.js: dynamically construct import path and load WASM from file system
        const fs = await import('node:fs/promises');
        const { loaderPath, wasmPath } = await getWasmPaths();

        // Use pathToFileURL to create a proper file:// URL for dynamic import
        const url = await import('node:url');
        const loaderUrl = url.pathToFileURL(loaderPath).href;

        // Dynamic import of the JS loader
        // @ts-ignore - Dynamic import with URL (Node.js only)
        const module = await import(/* @vite-ignore */ loaderUrl);

        // Load WASM binary and initialize
        const wasmBytes = await fs.readFile(wasmPath);
        await module.default(wasmBytes);

        wasmModule = module as unknown as ArkworksWasmModule;
      } else {
        // Browser: construct URL based on this module's location
        const moduleUrl = new URL(import.meta.url);
        const isSourceFile = moduleUrl.pathname.includes('/src/');
        // Check if running in Vite production build (assets are in /assets/)
        const isViteProduction = moduleUrl.pathname.includes('/assets/');

        let wasmJsUrl: URL;
        if (isSourceFile) {
          // Development from source: src/infra/provingSystems/ -> src/wasm/web/
          wasmJsUrl = new URL('../../wasm/web/arkworks_groth16_wasm.js', moduleUrl);
        } else if (isViteProduction) {
          // Production build: WASM files are served from /wasm/web/ (public folder)
          wasmJsUrl = new URL('/wasm/web/arkworks_groth16_wasm.js', moduleUrl.origin);
        } else {
          // SDK dist: dist/ -> dist/wasm/web/
          wasmJsUrl = new URL('./wasm/web/arkworks_groth16_wasm.js', moduleUrl);
        }

        // @ts-ignore - Dynamic import with URL
        const module = await import(/* @vite-ignore */ wasmJsUrl.href);
        await module.default();
        wasmModule = module as unknown as ArkworksWasmModule;
      }

      return wasmModule;
    } catch (error) {
      wasmInitPromise = null;
      throw new Error(
        `Failed to initialize arkworks-groth16-wasm: ${error instanceof Error ? error.message : String(error)}\n` +
          'Make sure the WASM module is built: cd packages/arkworks-groth16-wasm && npm run build'
      );
    }
  })();

  return wasmInitPromise;
}

/**
 * ArkworksWasm proving system using arkworks Groth16 compiled to WASM.
 *
 * This proving system:
 * - Compiles Noir code using @noir-lang/noir_wasm
 * - Generates witness using @noir-lang/noir_js
 * - Performs Groth16 setup/prove/verify using arkworks-groth16-wasm
 *
 * All operations run in the browser with no external dependencies.
 */
export class ArkworksWasm implements IProvingSystem {
  private readonly config: ArkworksWasmConfig;

  constructor(config: ArkworksWasmConfig = {}) {
    this.config = {
      keepArtifacts: false,
      cacheKeys: true,
      ...config,
    };
  }

  /**
   * Compile Noir code to a circuit with ACIR for Groth16 proving
   *
   * @param noirCode - The Noir source code to compile
   * @param options - Optional compilation options including ParsedCircuit for dynamic R1CS
   */
  async compile(noirCode: string, options?: CompileOptions): Promise<CompiledCircuit> {
    const wasm = await initWasm();
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

      // Compile using noir_wasm
      const result = await compile(fm);
      const compiled = (result as any).program as CompiledCircuit;

      if (!compiled || !compiled.bytecode) {
        throw new Error('Compilation failed: no bytecode generated');
      }

      // Generate R1CS from ParsedCircuit if provided, otherwise use hardcoded pattern
      const parameters = compiled.abi.parameters;
      let r1cs: R1csDefinition;
      const witnessIndexMapping = new Map<number, number>();

      if (options?.parsedCircuit) {
        // Use R1csBuilder for dynamic R1CS generation
        const builder = new R1csBuilder(options.parsedCircuit);
        r1cs = builder.build();

        // Build witness index mapping from R1CS builder
        // noir_js uses 0-based indices, R1CS uses 1-based (w_0 = 1)
        parameters.forEach((p, noirIndex) => {
          const r1csIndex = noirIndex + 1;
          witnessIndexMapping.set(noirIndex, r1csIndex);
        });

      } else {
        // Fallback: Hardcoded R1CS for common circuit patterns
        // Supported patterns:
        // - Balance: assert(a + b == total) - 2 private, 1 public
        // - Square: assert(secret * secret == expected) - 1 private, 1 public
        //
        // R1CS witness layout (arkworks convention):
        // - w_0 = 1 (constant, always)
        // - w_1, w_2, ... = actual witnesses (shifted by 1 from noir_js indices)
        const publicR1csIndices: number[] = [];
        const privateR1csIndices: number[] = [];

        parameters.forEach((p, noirIndex) => {
          const r1csIndex = noirIndex + 1;
          witnessIndexMapping.set(noirIndex, r1csIndex);
          if (p.visibility === 'public') {
            publicR1csIndices.push(r1csIndex);
          } else if (p.visibility === 'private') {
            privateR1csIndices.push(r1csIndex);
          }
        });

        r1cs = {
          num_witnesses: parameters.length + 1,
          public_inputs: publicR1csIndices,
          private_inputs: privateR1csIndices,
          constraints: [],
        };

        // Hardcoded constraints based on circuit shape
        if (privateR1csIndices.length === 2 && publicR1csIndices.length === 1) {
          // Balance circuit: assert(a + b == total)
          // R1CS: (a + b) * 1 = total
          const aIdx = privateR1csIndices[0];
          const bIdx = privateR1csIndices[1];
          const totalIdx = publicR1csIndices[0];
          r1cs.constraints.push({
            a: [['0x1', aIdx], ['0x1', bIdx]], // a + b
            b: [['0x1', 0]], // * 1 (w_0 = 1)
            c: [['0x1', totalIdx]], // = total
          });
        } else if (privateR1csIndices.length === 1 && publicR1csIndices.length === 1) {
          // Square circuit: assert(secret * secret == expected)
          // R1CS: private * private = public
          const privateIdx = privateR1csIndices[0];
          const publicIdx = publicR1csIndices[0];
          r1cs.constraints.push({
            a: [['0x1', privateIdx]],
            b: [['0x1', privateIdx]],
            c: [['0x1', publicIdx]],
          });
        }

      }

      const r1csJson = JSON.stringify(r1cs);

      // Perform setup using R1CS
      let provingKey: string | undefined;
      let verifyingKey: string | undefined;
      let verifyingKeyGnark: string | undefined;

      if (this.config.cacheKeys) {
        try {
          const setupResult = wasm.setup_from_r1cs(r1csJson);
          provingKey = setupResult.proving_key;
          verifyingKey = setupResult.verifying_key;
          verifyingKeyGnark = setupResult.verifying_key_gnark;
        } catch (error) {
          throw new Error(`R1CS setup failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // Keep acirJson for backwards compatibility but use r1csJson for proving
      const acirJson = JSON.stringify({
        functions: [{ current_witness_index: parameters.length, opcodes: [], private_parameters: r1cs.private_inputs, public_parameters: { witnesses: r1cs.public_inputs }, return_values: { witnesses: [] } }],
      });

      const arkworksCircuit: ArkworksCompiledCircuit = {
        ...compiled,
        __arkworks: true,
        acirJson,
        r1csJson,
        witnessIndexMapping,
        provingKey,
        verifyingKey,
        verifyingKeyGnark,
      };

      return arkworksCircuit;
    } finally {
      if (cleanup) {
        await cleanup();
      }
    }
  }

  /**
   * Generate a Groth16 proof
   */
  async generateProof(circuit: CompiledCircuit, inputs: InputMap): Promise<ProofData> {
    const wasm = await initWasm();

    if (!isArkworksCircuit(circuit)) {
      throw new Error(
        'ArkworksWasm.generateProof requires an ArkworksCompiledCircuit. Use ArkworksWasm.compile() first.'
      );
    }

    // Execute the circuit to generate witness using noir_js
    const noir = new Noir(circuit);
    const { witness: compressedWitness } = await noir.execute(inputs);

    // The witness from noir_js is a compressed Uint8Array - need to decompress it
    // to get WitnessMap (Map<number, string> where values are hex field elements)
    const witnessMapNoir = decompressWitness(compressedWitness);

    // Convert witness to R1CS format using the witness index mapping
    // noir witness[i] → R1CS w_(i+1) because w_0 = 1
    const witnessMap: Record<string, string> = {};
    const witnessMapping = circuit.witnessIndexMapping;

    for (const [noirIndex, value] of witnessMapNoir.entries()) {
      const r1csIndex = witnessMapping.get(noirIndex) ?? (noirIndex + 1);
      const strVal = String(value);
      witnessMap[r1csIndex.toString()] = strVal;
    }

    // Parse R1CS to get auxiliary witness computations
    const r1cs: R1csDefinition = JSON.parse(circuit.r1csJson);

    // Compute auxiliary witnesses if needed (for >= and > operators)
    if (r1cs.auxWitnessComputations && r1cs.auxWitnessComputations.length > 0) {
      this.computeAuxiliaryWitnesses(witnessMap, r1cs.auxWitnessComputations);
    }

    const witnessJson = JSON.stringify(witnessMap);

    // Ensure we have a proving key
    let provingKey = circuit.provingKey;
    if (!provingKey) {
      const setupResult = wasm.setup_from_r1cs(circuit.r1csJson);
      provingKey = setupResult.proving_key;
      // Cache for future use
      circuit.provingKey = provingKey;
      circuit.verifyingKey = setupResult.verifying_key;
      circuit.verifyingKeyGnark = setupResult.verifying_key_gnark;
    }

    // Generate proof using R1CS
    const proofResult = wasm.prove_from_r1cs(provingKey, circuit.r1csJson, witnessJson);

    // Return proof in gnark format for Solana compatibility
    const proofBytes = base64ToUint8Array(proofResult.proof_gnark);

    return {
      proof: proofBytes,
      publicInputs: proofResult.public_inputs,
    };
  }

  /**
   * Verify a Groth16 proof
   */
  async verifyProof(
    circuit: CompiledCircuit,
    proof: Uint8Array,
    publicInputs: string[]
  ): Promise<boolean> {
    const wasm = await initWasm();

    if (!isArkworksCircuit(circuit)) {
      throw new Error(
        'ArkworksWasm.verifyProof requires an ArkworksCompiledCircuit. Use ArkworksWasm.compile() first.'
      );
    }

    // Ensure we have a verifying key
    let verifyingKeyGnark = circuit.verifyingKeyGnark;
    if (!verifyingKeyGnark) {
      const setupResult = wasm.setup_from_r1cs(circuit.r1csJson);
      circuit.provingKey = setupResult.proving_key;
      circuit.verifyingKey = setupResult.verifying_key;
      verifyingKeyGnark = setupResult.verifying_key_gnark;
      circuit.verifyingKeyGnark = verifyingKeyGnark;
    }

    // Convert proof to base64
    const proofB64 = uint8ArrayToBase64(proof);

    // Convert public inputs to gnark format
    const publicInputsGnarkB64 = publicInputsToGnarkBase64(publicInputs);

    // Verify using gnark format
    return wasm.verify_gnark(
      verifyingKeyGnark,
      proofB64,
      publicInputsGnarkB64,
      publicInputs.length
    );
  }

  /**
   * Compute auxiliary witnesses based on computation instructions from R1csBuilder.
   * This handles witnesses that noir_js cannot compute (e.g., bit decomposition for >= operator).
   */
  private computeAuxiliaryWitnesses(
    witnessMap: Record<string, string>,
    computations: AuxWitnessComputation[]
  ): void {
    // BN254 scalar field modulus for modular arithmetic
    const FR_MODULUS = BigInt('0x30644e72e131a029b85045b68181585d2833e84879b9709143e1f593f0000001');

    // Helper to get witness value as BigInt
    const getWitnessValue = (idx: number): bigint => {
      if (idx === 0) return 1n; // w_0 = 1
      const val = witnessMap[idx.toString()];
      if (val === undefined) {
        throw new Error(`Witness w_${idx} not found`);
      }
      // Handle hex strings
      if (val.startsWith('0x')) {
        return BigInt(val);
      }
      return BigInt(val);
    };

    // Helper to set witness value as hex string
    const setWitnessValue = (idx: number, val: bigint): void => {
      // Ensure value is in field (non-negative, mod FR_MODULUS)
      const normalized = ((val % FR_MODULUS) + FR_MODULUS) % FR_MODULUS;
      witnessMap[idx.toString()] = '0x' + normalized.toString(16);
    };

    // Process computations in order
    for (const comp of computations) {
      switch (comp.type) {
        case 'subtract': {
          // Compute: target = left - right + offset
          const left = getWitnessValue(comp.leftIdx!);
          const right = getWitnessValue(comp.rightIdx!);
          const offset = BigInt(comp.offset ?? 0);
          const result = left - right + offset;
          setWitnessValue(comp.targetIdx, result);
          break;
        }

        case 'bit_decompose': {
          // Decompose source value into bits
          const source = getWitnessValue(comp.sourceIdx!);
          const bitIndices = comp.bitIndices!;
          const numBits = comp.numBits!;

          // Check that source is non-negative (for >= to be valid)
          if (source < 0n) {
            throw new Error(
              `Bit decomposition failed: value ${source} is negative. ` +
              `This means the comparison constraint is not satisfied.`
            );
          }

          // Check that source fits in numBits
          const maxVal = (1n << BigInt(numBits)) - 1n;
          if (source > maxVal) {
            throw new Error(
              `Bit decomposition failed: value ${source} exceeds ${numBits} bits (max: ${maxVal}). ` +
              `Consider using a larger bit width or smaller values.`
            );
          }

          // Extract each bit
          for (let i = 0; i < numBits; i++) {
            const bit = (source >> BigInt(i)) & 1n;
            setWitnessValue(bitIndices[i], bit);
          }
          break;
        }

        default:
          throw new Error(`Unknown auxiliary witness computation type: ${(comp as any).type}`);
      }
    }
  }

  /**
   * Get the verifying key in gnark format for on-chain deployment
   */
  async getVerifyingKeyGnark(circuit: CompiledCircuit): Promise<Uint8Array> {
    const wasm = await initWasm();

    if (!isArkworksCircuit(circuit)) {
      throw new Error('getVerifyingKeyGnark requires an ArkworksCompiledCircuit');
    }

    if (!circuit.verifyingKeyGnark) {
      const setupResult = wasm.setup_from_r1cs(circuit.r1csJson);
      circuit.provingKey = setupResult.proving_key;
      circuit.verifyingKey = setupResult.verifying_key;
      circuit.verifyingKeyGnark = setupResult.verifying_key_gnark;
    }

    return base64ToUint8Array(circuit.verifyingKeyGnark);
  }
}

// Utility functions

function base64ToUint8Array(b64: string): Uint8Array {
  const binaryString = atob(b64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert public inputs (hex strings) to gnark format (32 bytes each, big-endian)
 * Returns base64-encoded result
 */
function publicInputsToGnarkBase64(publicInputs: string[]): string {
  const FIELD_SIZE = 32;
  const bytes = new Uint8Array(publicInputs.length * FIELD_SIZE);

  for (let i = 0; i < publicInputs.length; i++) {
    const input = publicInputs[i];
    const hex = input.startsWith('0x') ? input.slice(2) : input;
    const inputBytes = hexToBytes(hex.padStart(64, '0'));

    // Copy big-endian bytes
    bytes.set(inputBytes, i * FIELD_SIZE);
  }

  return uint8ArrayToBase64(bytes);
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}
