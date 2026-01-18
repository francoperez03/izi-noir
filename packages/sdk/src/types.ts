// Re-export types from @noir-lang/types
import type { CompiledCircuit, InputMap } from '@noir-lang/types';
export type { CompiledCircuit, InputMap };

// AST Types for parsed JavaScript circuit

export interface CircuitParam {
  name: string;
  index: number;
}

export interface BinaryExpr {
  kind: 'binary';
  left: Expr;
  operator: BinaryOperator;
  right: Expr;
}

export interface IdentifierExpr {
  kind: 'identifier';
  name: string;
}

export interface LiteralExpr {
  kind: 'literal';
  value: number | string | bigint;
}

export interface MemberExpr {
  kind: 'member';
  object: string;
  index: number;
}

export type BinaryOperator = '==' | '!=' | '+' | '-' | '*' | '/';

export type Expr = BinaryExpr | IdentifierExpr | LiteralExpr | MemberExpr;

export interface AssertStatement {
  kind: 'assert';
  condition: Expr;
  message?: string;
}

export type Statement = AssertStatement;

export interface ParsedCircuit {
  publicParams: CircuitParam[];
  privateParams: CircuitParam[];
  statements: Statement[];
}

// Input types for the API
export type InputValue = number | string | bigint;

// Result types
export interface ProofTimings {
  parseMs: number;
  generateMs: number;
  compileMs: number;
  witnessMs: number;
  proofMs: number;
  verifyMs: number;
  totalMs: number;
}

export interface ProofResult {
  proof: Uint8Array;
  publicInputs: string[];
  verified: boolean;
  noirCode: string;
  timings: ProofTimings;
}

// Circuit function signature
export type CircuitFunction = (
  publicArgs: InputValue[],
  privateArgs: InputValue[]
) => void;

// Proof data returned by the prover
export interface ProofData {
  proof: Uint8Array;
  publicInputs: string[];
}

// Options for proof generation
export interface ProverOptions {
  threads?: number;
  verbose?: boolean;
}

// Options for verification
export interface VerifierOptions {
  verbose?: boolean;
}
