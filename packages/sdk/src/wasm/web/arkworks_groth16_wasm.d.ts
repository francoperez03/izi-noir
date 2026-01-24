/* tslint:disable */
/* eslint-disable */

/**
 * Convert ACIR JSON to R1CS information (for debugging)
 */
export function acir_to_r1cs_info(acir_json: string): any;

export function init_panic_hook(): void;

/**
 * Generate a Groth16 proof
 *
 * # Arguments
 * * `proving_key_b64` - Base64-encoded proving key from setup
 * * `acir_json` - JSON string of the ACIR program
 * * `witness_json` - JSON object mapping witness indices to hex values
 *
 * # Returns
 * * `JsProofResult` with proof and public inputs
 */
export function prove(proving_key_b64: string, acir_json: string, witness_json: string): any;

/**
 * Generate a Groth16 proof from R1CS definition
 *
 * # Arguments
 * * `proving_key_b64` - Base64-encoded proving key from setup
 * * `r1cs_json` - JSON string of R1CS definition
 * * `witness_json` - JSON object mapping witness indices to hex values
 *
 * # Returns
 * * `JsProofResult` with proof and public inputs
 */
export function prove_from_r1cs(proving_key_b64: string, r1cs_json: string, witness_json: string): any;

/**
 * Perform trusted setup for a circuit
 *
 * # Arguments
 * * `acir_json` - JSON string of the ACIR program from Noir compiler
 *
 * # Returns
 * * `JsSetupResult` with base64-encoded proving and verifying keys
 */
export function setup(acir_json: string): any;

/**
 * Perform trusted setup from R1CS definition
 *
 * # Arguments
 * * `r1cs_json` - JSON string of R1CS definition
 *
 * # Returns
 * * `JsSetupResult` with base64-encoded proving and verifying keys
 */
export function setup_from_r1cs(r1cs_json: string): any;

/**
 * Verify a Groth16 proof
 *
 * # Arguments
 * * `verifying_key_b64` - Base64-encoded verifying key from setup
 * * `proof_b64` - Base64-encoded proof (arkworks format)
 * * `public_inputs_json` - JSON array of public inputs as hex strings
 *
 * # Returns
 * * `true` if proof is valid, `false` otherwise
 */
export function verify(verifying_key_b64: string, proof_b64: string, public_inputs_json: string): boolean;

/**
 * Verify a Groth16 proof in gnark format
 *
 * # Arguments
 * * `verifying_key_gnark_b64` - Base64-encoded verifying key (gnark format)
 * * `proof_gnark_b64` - Base64-encoded proof (gnark format, 256 bytes)
 * * `public_inputs_gnark_b64` - Base64-encoded public inputs (gnark format)
 * * `num_public_inputs` - Number of public inputs
 *
 * # Returns
 * * `true` if proof is valid, `false` otherwise
 */
export function verify_gnark(verifying_key_gnark_b64: string, proof_gnark_b64: string, public_inputs_gnark_b64: string, num_public_inputs: number): boolean;

/**
 * Get library version
 */
export function version(): string;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly acir_to_r1cs_info: (a: number, b: number) => [number, number, number];
    readonly prove: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number, number];
    readonly prove_from_r1cs: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number, number];
    readonly setup: (a: number, b: number) => [number, number, number];
    readonly setup_from_r1cs: (a: number, b: number) => [number, number, number];
    readonly verify: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number, number];
    readonly verify_gnark: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => [number, number, number];
    readonly version: () => [number, number];
    readonly init_panic_hook: () => void;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_exn_store: (a: number) => void;
    readonly __externref_table_alloc: () => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
