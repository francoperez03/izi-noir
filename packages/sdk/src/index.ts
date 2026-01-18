export { createProof } from './createProof.js';
export { parseCircuitFunction } from './parser.js';
export { generateNoir } from './generator.js';
export { compileNoir } from './compiler.js';
export { generateProof, verifyProof } from './prover.js';

export type {
  ProofResult,
  ProofTimings,
  ProofData,
  CircuitFunction,
  InputValue,
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
  CompiledCircuit,
  InputMap,
  ProverOptions,
  VerifierOptions,
} from './types.js';
