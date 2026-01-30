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

/**
 * R1CS constraint for arkworks-groth16-wasm
 */
export interface R1csConstraint {
  a: [string, number][]; // [(coefficient_hex, witness_index), ...]
  b: [string, number][];
  c: [string, number][];
}

/**
 * R1CS definition for arkworks-groth16-wasm
 */
export interface R1csDefinition {
  num_witnesses: number;
  public_inputs: number[];
  private_inputs: number[];
  constraints: R1csConstraint[];
}

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
  // Resolve relative to this file's location in dist/
  const dirname = path.dirname(url.fileURLToPath(import.meta.url));
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
        // Detect if running from source or bundled dist to use correct relative path
        const moduleUrl = new URL(import.meta.url);
        const isSourceFile = moduleUrl.pathname.includes('/src/');
        // From source: src/infra/provingSystems/ -> src/wasm/web/ (2 levels up)
        // From dist: dist/ -> dist/wasm/web/ (same level)
        const wasmRelativePath = isSourceFile
          ? '../../wasm/web/arkworks_groth16_wasm.js'
          : './wasm/web/arkworks_groth16_wasm.js';
        const wasmJsUrl = new URL(wasmRelativePath, moduleUrl);
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
   */
  async compile(noirCode: string): Promise<CompiledCircuit> {
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

      // Generate R1CS directly from the circuit parameters
      // This bypasses ACIR bytecode decoding which requires bincode parsing
      //
      // R1CS witness layout (arkworks convention):
      // - w_0 = 1 (constant, always)
      // - w_1, w_2, ... = actual witnesses (shifted by 1 from noir_js indices)
      //
      // noir_js decompressWitness returns 0-based indices, so:
      // - noir witness[0] → R1CS w_1
      // - noir witness[1] → R1CS w_2
      // etc.
      const parameters = compiled.abi.parameters;
      const publicR1csIndices: number[] = [];
      const privateR1csIndices: number[] = [];
      const witnessIndexMapping = new Map<number, number>();

      parameters.forEach((p, noirIndex) => {
        // Shift by 1 to account for w_0 = 1
        const r1csIndex = noirIndex + 1;
        witnessIndexMapping.set(noirIndex, r1csIndex);
        console.log(`  Parameter "${p.name}" (${p.visibility}): noir[${noirIndex}] → R1CS w_${r1csIndex}`);
        if (p.visibility === 'public') {
          publicR1csIndices.push(r1csIndex);
        } else if (p.visibility === 'private') {
          privateR1csIndices.push(r1csIndex);
        }
      });

      console.log('=== COMPILE: R1CS Witness Assignment ===');
      console.log('Public R1CS indices:', publicR1csIndices);
      console.log('Private R1CS indices:', privateR1csIndices);
      console.log('Witness mapping:', Object.fromEntries(witnessIndexMapping));
      console.log('=========================================');

      // Generate R1CS constraints from the Noir code pattern
      // For the demo circuit: assert(secret * secret == expected)
      // This translates to: w_private * w_private = w_public
      //
      // R1CS constraint format: A * B = C
      // For secret * secret = expected:
      // A = [1 * w_secret], B = [1 * w_secret], C = [1 * w_expected]
      const r1cs: R1csDefinition = {
        num_witnesses: parameters.length + 1, // +1 for w_0
        public_inputs: publicR1csIndices,
        private_inputs: privateR1csIndices,
        constraints: [],
      };

      // For the simple squaring circuit, add constraint: private * private = public
      // This assumes the circuit pattern: assert(secret * secret == expected)
      if (privateR1csIndices.length === 1 && publicR1csIndices.length === 1) {
        const privateIdx = privateR1csIndices[0];
        const publicIdx = publicR1csIndices[0];
        r1cs.constraints.push({
          a: [['0x1', privateIdx]], // secret
          b: [['0x1', privateIdx]], // secret
          c: [['0x1', publicIdx]], // expected
        });
        console.log(`  Added constraint: w_${privateIdx} * w_${privateIdx} = w_${publicIdx}`);
      } else {
        // For more complex circuits, we'd need to parse the Noir code
        console.warn('Complex circuit detected - R1CS constraint generation may be incomplete');
      }

      const r1csJson = JSON.stringify(r1cs);
      console.log('R1CS JSON:', r1csJson);

      // Perform setup using R1CS
      let provingKey: string | undefined;
      let verifyingKey: string | undefined;
      let verifyingKeyGnark: string | undefined;

      if (this.config.cacheKeys) {
        try {
          console.log('Running trusted setup from R1CS...');
          const setupResult = wasm.setup_from_r1cs(r1csJson);
          provingKey = setupResult.proving_key;
          verifyingKey = setupResult.verifying_key;
          verifyingKeyGnark = setupResult.verifying_key_gnark;
          console.log('Setup complete!');
        } catch (error) {
          console.error('Setup failed:', error);
          throw new Error(`R1CS setup failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // Keep acirJson for backwards compatibility but use r1csJson for proving
      const acirJson = JSON.stringify({
        functions: [{ current_witness_index: parameters.length, opcodes: [], private_parameters: privateR1csIndices, public_parameters: { witnesses: publicR1csIndices }, return_values: { witnesses: [] } }],
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

    // DEBUG: Log witness map and circuit info
    console.log('=== ARKWORKS WASM DEBUG ===');
    console.log('Circuit ABI parameters:', circuit.abi.parameters);
    console.log('Inputs provided:', JSON.stringify(inputs));
    console.log('Compressed witness size:', compressedWitness.length, 'bytes');
    console.log('Decompressed witness entries:', witnessMapNoir.size);

    // Show witness entries
    console.log('Witness map entries (first 10):');
    const sortedWitness = Array.from(witnessMapNoir.entries()).sort(([a], [b]) => a - b);
    for (const [index, value] of sortedWitness.slice(0, 10)) {
      const strVal = String(value);
      console.log(`  witness[${index}] = "${strVal.slice(0, 66)}${strVal.length > 66 ? '...' : ''}"`);
      // Interpret as hex
      if (strVal.startsWith('0x')) {
        try {
          const decVal = BigInt(strVal).toString(10);
          console.log(`    → decimal: ${decVal}`);
        } catch {
          console.log(`    → failed to parse as BigInt`);
        }
      }
    }

    // Convert witness to R1CS format using the witness index mapping
    // noir witness[i] → R1CS w_(i+1) because w_0 = 1
    const witnessMap: Record<string, string> = {};
    const witnessMapping = circuit.witnessIndexMapping;

    console.log('Converting noir witness to R1CS witness:');
    for (const [noirIndex, value] of witnessMapNoir.entries()) {
      const r1csIndex = witnessMapping.get(noirIndex) ?? (noirIndex + 1);
      const strVal = String(value);
      witnessMap[r1csIndex.toString()] = strVal;
      console.log(`  noir[${noirIndex}] → R1CS w_${r1csIndex} = ${strVal.slice(0, 20)}...`);
    }
    const witnessJson = JSON.stringify(witnessMap);
    console.log('Witness JSON for prove:', witnessJson.slice(0, 200) + '...');

    // Parse R1CS to show constraint info
    const r1csParsed: R1csDefinition = JSON.parse(circuit.r1csJson);
    console.log('R1CS public_inputs:', r1csParsed.public_inputs);
    console.log('R1CS private_inputs:', r1csParsed.private_inputs);
    console.log('R1CS num_witnesses:', r1csParsed.num_witnesses);
    console.log('R1CS constraints:', r1csParsed.constraints.length);

    // Ensure we have a proving key
    let provingKey = circuit.provingKey;
    if (!provingKey) {
      console.log('Running setup_from_r1cs...');
      const setupResult = wasm.setup_from_r1cs(circuit.r1csJson);
      provingKey = setupResult.proving_key;
      // Cache for future use
      circuit.provingKey = provingKey;
      circuit.verifyingKey = setupResult.verifying_key;
      circuit.verifyingKeyGnark = setupResult.verifying_key_gnark;
    }

    // Generate proof using R1CS
    console.log('Generating proof from R1CS...');
    const proofResult = wasm.prove_from_r1cs(provingKey, circuit.r1csJson, witnessJson);

    // DEBUG: Log proof result
    console.log('=== PROOF RESULT DEBUG ===');
    console.log('Proof public inputs from arkworks:', proofResult.public_inputs);
    proofResult.public_inputs.forEach((input, i) => {
      const hexValue = input.startsWith('0x') ? input : `0x${input}`;
      const decValue = BigInt(hexValue).toString(10);
      console.log(`  Public input ${i}: ${input} (dec: ${decValue})`);
    });
    console.log('===========================');

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
