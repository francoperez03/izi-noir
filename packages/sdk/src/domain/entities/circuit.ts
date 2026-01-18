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

// Array/object member access: arr[i] or arr[0]
export interface MemberExpr {
  kind: 'member';
  object: Expr;  // Changed from string to support chained access
  index: Expr;   // Changed from number to support dynamic indices
}

// Array literal: [a, b, c]
export interface ArrayLiteralExpr {
  kind: 'array_literal';
  elements: Expr[];
}

// Method call: arr.len()
export interface CallExpr {
  kind: 'call';
  callee: Expr;
  method?: string; // For method calls like arr.len()
  args: Expr[];
}

// Binary operators for Noir
export type BinaryOperator =
  | '==' | '!='                    // Equality
  | '+' | '-' | '*' | '/' | '%'    // Arithmetic
  | '<' | '>' | '<=' | '>='        // Comparison
  | '&' | '|';                     // Logical (Noir uses & and | instead of && and ||)

// Unary operators for Noir
export type UnaryOperator = '!' | '-';

// Unary expression (e.g., !x, -5)
export interface UnaryExpr {
  kind: 'unary';
  operator: UnaryOperator;
  operand: Expr;
}

// If expression (ternary): condition ? consequent : alternate → if condition { consequent } else { alternate }
export interface IfExpr {
  kind: 'if_expr';
  condition: Expr;
  consequent: Expr;
  alternate: Expr;
}

export type Expr = BinaryExpr | UnaryExpr | IdentifierExpr | LiteralExpr | MemberExpr | ArrayLiteralExpr | CallExpr | IfExpr;

export interface AssertStatement {
  kind: 'assert';
  condition: Expr;
  message?: string;
}

// Variable declaration: let x = 5; or let mut_x = 5; (for mutable)
export interface VariableDeclaration {
  kind: 'variable_declaration';
  name: string;
  mutable: boolean;
  initializer: Expr;
}

// Assignment: x = 5; (only valid for mutable variables)
export interface AssignmentStatement {
  kind: 'assignment';
  target: string;
  value: Expr;
}

// If statement: if (condition) { ... } else { ... }
export interface IfStatement {
  kind: 'if_statement';
  condition: Expr;
  consequent: Statement[];
  alternate?: Statement[];
}

// For loop: for (let i = 0; i < 10; i++) { ... } → for i in 0..10 { ... }
export interface ForStatement {
  kind: 'for_statement';
  variable: string;
  start: Expr;
  end: Expr;
  inclusive: boolean; // true for <=, false for <
  body: Statement[];
}

export type Statement = AssertStatement | VariableDeclaration | AssignmentStatement | IfStatement | ForStatement;

export interface ParsedCircuit {
  publicParams: CircuitParam[];
  privateParams: CircuitParam[];
  statements: Statement[];
}
