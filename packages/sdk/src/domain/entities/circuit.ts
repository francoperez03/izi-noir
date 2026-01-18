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
