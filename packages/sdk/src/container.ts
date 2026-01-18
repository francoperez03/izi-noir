import { AcornParser } from './infra/parser/AcornParser.js';
import { NoirWasmCompiler } from './infra/compiler/NoirWasmCompiler.js';
import { BarretenbergProver } from './infra/prover/BarretenbergProver.js';
import { CreateProofUseCase, type CreateProofDependencies } from './application/CreateProofUseCase.js';
import type { CircuitFunction, InputValue, ProofResult } from './domain/types.js';

export function createDefaultContainer(): CreateProofDependencies {
  return {
    parser: new AcornParser(),
    compiler: new NoirWasmCompiler(),
    prover: new BarretenbergProver(),
  };
}

export async function createProof(
  publicInputs: InputValue[],
  privateInputs: InputValue[],
  circuitFn: CircuitFunction
): Promise<ProofResult> {
  const container = createDefaultContainer();
  const useCase = new CreateProofUseCase(container);
  return useCase.execute(publicInputs, privateInputs, circuitFn);
}
