import { AcornParser } from './infra/parser/AcornParser.js';
import { Barretenberg } from './infra/provingSystems/Barretenberg.js';
import { Sunspot } from './infra/provingSystems/Sunspot.js';
import { CreateProofUseCase, type CreateProofDependencies } from './application/CreateProofUseCase.js';
import type { IProvingSystem } from './domain/interfaces/proving/IProvingSystem.js';
import type { CircuitFunction, InputValue, ProofResult } from './domain/types.js';
import type { SunspotConfig } from './infra/sunspot/types.js';

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
 */
export function createSunspotContainer(config?: Partial<SunspotConfig>): CreateProofDependencies {
  return {
    parser: new AcornParser(),
    provingSystem: new Sunspot(config),
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
