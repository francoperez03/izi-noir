import { AcornParser } from './infra/parser/AcornParser.js';
import { Barretenberg } from './infra/provingSystems/Barretenberg.js';
import { Sunspot } from './infra/provingSystems/Sunspot.js';
import { ArkworksWasm } from './infra/provingSystems/ArkworksWasm.js';
import { CreateProofUseCase, type CreateProofDependencies } from './application/CreateProofUseCase.js';
import type { IProvingSystem } from './domain/interfaces/proving/IProvingSystem.js';
import type { CircuitFunction, InputValue, ProofResult } from './domain/types.js';
import type { SunspotConfig } from './infra/sunspot/types.js';
import type { ArkworksWasmConfig } from './infra/provingSystems/ArkworksWasm.js';

export interface CreateProofOptions {
  provingSystem?: IProvingSystem;
}

/**
 * Create default container with Barretenberg backend
 */
export function createDefaultContainer(): CreateProofDependencies {
  return {
    parser: new AcornParser(),
    provingSystem: new Barretenberg(),
  };
}

/**
 * Create container with Sunspot backend (Groth16 for Solana)
 * Note: Sunspot requires CLI binaries (nargo, sunspot) - Node.js only
 */
export function createSunspotContainer(config?: Partial<SunspotConfig>): CreateProofDependencies {
  return {
    parser: new AcornParser(),
    provingSystem: new Sunspot(config),
  };
}

/**
 * Create container with ArkworksWasm backend (Groth16 for Solana, 100% browser)
 *
 * This backend:
 * - Runs entirely in the browser (WASM)
 * - Generates Groth16 proofs compatible with gnark-verifier-solana
 * - No CLI dependencies required
 *
 * @example
 * ```ts
 * const container = createArkworksWasmContainer();
 * const useCase = new CreateProofUseCase(container);
 * const result = await useCase.execute(publicInputs, privateInputs, fn);
 * ```
 */
export function createArkworksWasmContainer(config?: ArkworksWasmConfig): CreateProofDependencies {
  return {
    parser: new AcornParser(),
    provingSystem: new ArkworksWasm(config),
  };
}

/**
 * Generate a ZK proof
 *
 * @example Default (Barretenberg/UltraHonk)
 * ```ts
 * const result = await createProof([100], [10], fn);
 * ```
 *
 * @example With Sunspot (Groth16 for Solana)
 * ```ts
 * const result = await createProof([100], [10], fn, {
 *   provingSystem: new Sunspot()
 * });
 * ```
 */
export async function createProof(
  publicInputs: InputValue[],
  privateInputs: InputValue[],
  circuitFn: CircuitFunction,
  options?: CreateProofOptions
): Promise<ProofResult> {
  const container: CreateProofDependencies = {
    parser: new AcornParser(),
    provingSystem: options?.provingSystem ?? new Barretenberg(),
  };
  const useCase = new CreateProofUseCase(container);
  return useCase.execute(publicInputs, privateInputs, circuitFn);
}

/**
 * Generate a ZK proof using Sunspot (Groth16 for Solana verification)
 * @deprecated Use createProof with { provingSystem: new Sunspot() } instead
 */
export async function createSunspotProof(
  publicInputs: InputValue[],
  privateInputs: InputValue[],
  circuitFn: CircuitFunction,
  config?: Partial<SunspotConfig>
): Promise<ProofResult> {
  return createProof(publicInputs, privateInputs, circuitFn, {
    provingSystem: new Sunspot(config),
  });
}

/**
 * Generate a ZK proof using ArkworksWasm (Groth16 for Solana, 100% browser)
 *
 * This is the recommended way to generate Groth16 proofs in the browser.
 * The proof is compatible with gnark-verifier-solana for on-chain verification.
 *
 * @example
 * ```ts
 * const result = await createArkworksProof([100], [10], (pub, priv) => {
 *   assert(priv[0] * priv[0] == pub[0]);
 * });
 * // result.proof is a 256-byte Groth16 proof
 * // result.verified is true if the proof is valid
 * ```
 */
export async function createArkworksProof(
  publicInputs: InputValue[],
  privateInputs: InputValue[],
  circuitFn: CircuitFunction,
  config?: ArkworksWasmConfig
): Promise<ProofResult> {
  return createProof(publicInputs, privateInputs, circuitFn, {
    provingSystem: new ArkworksWasm(config),
  });
}
