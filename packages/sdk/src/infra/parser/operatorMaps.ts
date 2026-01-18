import type {
  BinaryOperator,
  UnaryOperator,
} from '../../domain/entities/circuit.js';

/**
 * Maps JavaScript binary operators to their Noir equivalents.
 *
 * Notable conversions:
 * - `===` → `==` (Noir has no strict equality)
 * - `!==` → `!=` (Noir has no strict inequality)
 * - `&&` → `&` (Noir uses bitwise AND for logical AND)
 * - `||` → `|` (Noir uses bitwise OR for logical OR)
 */
export const BINARY_OPERATOR_MAP: Record<string, BinaryOperator> = {
  // Equality
  '==': '==',
  '===': '==',
  '!=': '!=',
  '!==': '!=',
  // Arithmetic
  '+': '+',
  '-': '-',
  '*': '*',
  '/': '/',
  '%': '%',
  // Comparison
  '<': '<',
  '>': '>',
  '<=': '<=',
  '>=': '>=',
  // Logical (JS && and || map to Noir & and |)
  '&&': '&',
  '||': '|',
};

/**
 * Maps JavaScript unary operators to their Noir equivalents.
 */
export const UNARY_OPERATOR_MAP: Record<string, UnaryOperator> = {
  '!': '!',
  '-': '-',
};

/**
 * Maps a JavaScript binary operator to its Noir equivalent.
 * @throws Error if the operator is not supported.
 */
export function mapBinaryOperator(op: string): BinaryOperator {
  const noirOp = BINARY_OPERATOR_MAP[op];
  if (!noirOp) {
    throw new Error(`Unsupported binary operator: ${op}`);
  }
  return noirOp;
}

/**
 * Maps a JavaScript unary operator to its Noir equivalent.
 * @throws Error if the operator is not supported.
 */
export function mapUnaryOperator(op: string): UnaryOperator {
  const noirOp = UNARY_OPERATOR_MAP[op];
  if (!noirOp) {
    throw new Error(`Unsupported unary operator: ${op}`);
  }
  return noirOp;
}
