export function generateBalanceProof(): string {
  return `/**
 * Balance Proof Circuit
 *
 * Proves you have enough balance to cover a required amount.
 * This is a real-world use case: proving solvency without revealing your actual balance.
 *
 * Example: Prove balance=1000 >= threshold=500
 *
 * @param threshold - The minimum required amount (public)
 * @param balance - Your actual balance (private, not revealed)
 */
export function balanceProof(
  [threshold]: [number],
  [balance]: [number]
): void {
  assert(balance >= threshold);
}
`;
}

export function generateSquareProof(): string {
  return `/**
 * Square Proof Circuit
 *
 * Proves knowledge of a secret number whose square equals a public value.
 * This is a fundamental ZK proof pattern.
 *
 * Example: To prove you know the secret 7, set expected = 49 (7²)
 *
 * @param expected - The expected result (secret²) (public)
 * @param secret - The secret square root to prove (private, not revealed)
 */
export function squareProof(
  [expected]: [number],
  [secret]: [number]
): void {
  assert(secret * secret == expected);
}
`;
}

export function generateMinimalCircuit(): string {
  return `/**
 * My Custom Circuit
 *
 * A minimal ZK proof that proves knowledge of a secret whose square
 * equals the public expected value.
 *
 * Replace with your own circuit logic using assert() statements.
 *
 * @param expected - The expected result (secret²) (public)
 * @param secret - The secret value to prove (private, not revealed)
 */
export function myCircuit(
  [expected]: [number],
  [secret]: [number]
): void {
  // Prove that secret² = expected
  assert(secret * secret == expected);
}
`;
}

export function generateCircuitsIndex(template: string): string {
  switch (template) {
    case 'minimal':
      return `export { myCircuit } from './my-circuit.js';
`;
    case 'balance-proof':
      return `export { balanceProof } from './balance-proof.js';
`;
    default:
      return `export { balanceProof } from './balance-proof.js';
export { squareProof } from './square-proof.js';
`;
  }
}

export function generateCircuitTypes(): string {
  return `/**
 * Global type declarations for IZI-NOIR circuits
 */

/**
 * Assert a condition that must be true for the proof to be valid.
 * This is the core primitive for defining ZK constraints.
 *
 * @param condition - The boolean condition to assert
 */
declare function assert(condition: boolean): void;
`;
}
