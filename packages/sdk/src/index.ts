// High-level API
export {
  createProof,
  createDefaultContainer,
  createArkworksWasmContainer,
  createArkworksProof,
} from './container.js';
export type { CreateProofOptions } from './container.js';

// For DI users
export { CreateProofUseCase } from './application/CreateProofUseCase.js';
export type { CreateProofDependencies } from './application/CreateProofUseCase.js';

// Proving systems
export { Barretenberg } from './infra/provingSystems/Barretenberg.js';
export { ArkworksWasm, isArkworksCircuit } from './infra/provingSystems/ArkworksWasm.js';
export type {
  ArkworksWasmConfig,
  ArkworksCompiledCircuit,
  ArkworksWasmModule,
  ArkworksSetupResult,
  ArkworksProofResult,
} from './infra/provingSystems/ArkworksWasm.js';

// Interfaces
export type {
  IProvingSystem,
  ICompiler,
  IProver,
  IVerifier,
} from './domain/interfaces/proving/index.js';
export type { IParser } from './domain/interfaces/parsing/index.js';

// Parser implementation
export { AcornParser } from './infra/parser/AcornParser.js';

// Services
export { generateNoir } from './application/services/NoirGenerator.js';

// Types
export type {
  ProofResult,
  ProofTimings,
  ProofData,
  CircuitFunction,
  InputValue,
  CompiledCircuit,
  InputMap,
  ProverOptions,
  VerifierOptions,
} from './domain/types.js';

// Entities
export type {
  ParsedCircuit,
  CircuitParam,
  Expr,
  BinaryExpr,
  IdentifierExpr,
  LiteralExpr,
  MemberExpr,
  BinaryOperator,
  Statement,
  AssertStatement,
} from './domain/entities/circuit.js';
