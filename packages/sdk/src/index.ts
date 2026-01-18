// High-level API (backwards compatible)
export { createProof, createDefaultContainer } from './container.js';

// For DI users
export { CreateProofUseCase } from './application/CreateProofUseCase.js';
export type { CreateProofDependencies } from './application/CreateProofUseCase.js';

// Interfaces
export type { ICompiler } from './domain/interfaces/ICompiler.js';
export type { IProver } from './domain/interfaces/IProver.js';
export type { IParser } from './domain/interfaces/IParser.js';

// Infrastructure implementations (for custom DI)
export { AcornParser } from './infra/parser/AcornParser.js';
export { NoirWasmCompiler } from './infra/compiler/NoirWasmCompiler.js';
export { BarretenbergProver } from './infra/prover/BarretenbergProver.js';

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
