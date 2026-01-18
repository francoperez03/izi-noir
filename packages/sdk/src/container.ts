import { AcornParser } from './infra/parser/AcornParser.js';
import { NoirWasmCompiler } from './infra/compiler/NoirWasmCompiler.js';
import { BarretenbergProver } from './infra/prover/BarretenbergProver.js';
import { SunspotCompiler } from './infra/compiler/SunspotCompiler.js';
import { SunspotProver } from './infra/prover/SunspotProver.js';
import { CreateProofUseCase, type CreateProofDependencies } from './application/CreateProofUseCase.js';
import type { CircuitFunction, InputValue, ProofResult } from './domain/types.js';
import type { SunspotConfig } from './infra/sunspot/types.js';

/**
 * Create default container with Barretenberg backend (UltraPlonk)
 */
export function createDefaultContainer(): CreateProofDependencies {
  return {
    parser: new AcornParser(),
    compiler: new NoirWasmCompiler(),
    prover: new BarretenbergProver(),
  };
}

/**
 * Create container with Sunspot backend (Groth16 for Solana)
 */
export function createSunspotContainer(config?: Partial<SunspotConfig>): CreateProofDependencies {
  return {
    parser: new AcornParser(),
    compiler: new SunspotCompiler(config),
    prover: new SunspotProver(config),
  };
}

/**
 * Generate a ZK proof using the default Barretenberg backend
 */
export async function createProof(
  publicInputs: InputValue[],
  privateInputs: InputValue[],
  circuitFn: CircuitFunction
): Promise<ProofResult> {
  const container = createDefaultContainer();
  const useCase = new CreateProofUseCase(container);
  return useCase.execute(publicInputs, privateInputs, circuitFn);
}

/**
 * Generate a ZK proof using Sunspot (Groth16 for Solana verification)
 */
export async function createSunspotProof(
  publicInputs: InputValue[],
  privateInputs: InputValue[],
  circuitFn: CircuitFunction,
  config?: Partial<SunspotConfig>
): Promise<ProofResult> {
  const container = createSunspotContainer(config);
  const useCase = new CreateProofUseCase(container);
  return useCase.execute(publicInputs, privateInputs, circuitFn);
}
