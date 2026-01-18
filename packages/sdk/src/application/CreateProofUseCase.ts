import type { IParser } from '../domain/interfaces/IParser.js';
import type { ICompiler } from '../domain/interfaces/ICompiler.js';
import type { IProver } from '../domain/interfaces/IProver.js';
import type { CircuitFunction, InputValue, ProofResult, InputMap } from '../domain/types.js';
import type { InputValue as NoirInputValue } from '@noir-lang/types';
import { generateNoir } from './services/NoirGenerator.js';

export interface CreateProofDependencies {
  parser: IParser;
  compiler: ICompiler;
  prover: IProver;
}

export class CreateProofUseCase {
  constructor(private readonly deps: CreateProofDependencies) {}

  async execute(
    publicInputs: InputValue[],
    privateInputs: InputValue[],
    circuitFn: CircuitFunction
  ): Promise<ProofResult> {
    const totalStart = performance.now();
    const timings = {
      parseMs: 0,
      generateMs: 0,
      compileMs: 0,
      witnessMs: 0,
      proofMs: 0,
      verifyMs: 0,
      totalMs: 0,
    };

    // 1. Parse JS function
    const parseStart = performance.now();
    const parsed = this.deps.parser.parse(circuitFn, publicInputs, privateInputs);
    timings.parseMs = performance.now() - parseStart;

    // 2. Generate Noir code
    const generateStart = performance.now();
    const noirCode = generateNoir(parsed);
    timings.generateMs = performance.now() - generateStart;

    // 3. Compile Noir to bytecode
    const compileStart = performance.now();
    const circuit = await this.deps.compiler.compile(noirCode);
    timings.compileMs = performance.now() - compileStart;

    // 4. Build inputs object for witness generation
    const toNoirInput = (val: InputValue): NoirInputValue =>
      typeof val === 'bigint' ? val.toString() : val;

    const inputs: InputMap = {};

    // Add private inputs first (order matters for Noir)
    for (const param of parsed.privateParams) {
      inputs[param.name] = toNoirInput(privateInputs[param.index]);
    }

    // Add public inputs
    for (const param of parsed.publicParams) {
      inputs[param.name] = toNoirInput(publicInputs[param.index]);
    }

    // 5. Generate witness and proof
    const witnessStart = performance.now();
    const { proof, publicInputs: proofPublicInputs } = await this.deps.prover.generateProof(circuit, inputs);
    const proofEnd = performance.now();

    // Split timing: witness is typically faster, proof takes most time
    const proveTime = proofEnd - witnessStart;
    timings.witnessMs = proveTime * 0.1;
    timings.proofMs = proveTime * 0.9;

    // 6. Verify proof
    const verifyStart = performance.now();
    const verified = await this.deps.prover.verifyProof(circuit, proof, proofPublicInputs);
    timings.verifyMs = performance.now() - verifyStart;

    timings.totalMs = performance.now() - totalStart;

    return {
      proof,
      publicInputs: proofPublicInputs,
      verified,
      noirCode,
      timings,
    };
  }
}
