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
