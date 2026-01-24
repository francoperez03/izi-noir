export function generateBalanceProof(): string {
  return `/**
 * Balance Proof Circuit
 *
 * Proves that a private balance is greater than or equal to a public threshold
 * without revealing the actual balance.
 *
 * @param threshold - The minimum required balance (public)
 * @param balance - The actual balance to prove (private, not revealed)
 */
export function balanceProof(
  [threshold]: [number],
  [balance]: [number]
): void {
  assert(balance >= threshold);
}
`;
}

export function generateAgeProof(): string {
  return `/**
 * Age Proof Circuit
 *
 * Proves that a private birth year results in an age >= minimum age
 * without revealing the actual birth year.
 *
 * @param currentYear - The current year (public)
 * @param minAge - The minimum required age (public)
 * @param birthYear - The actual birth year (private, not revealed)
 */
export function ageProof(
  [currentYear, minAge]: [number, number],
  [birthYear]: [number]
): void {
  const age = currentYear - birthYear;
  assert(age >= minAge);
}
`;
}

export function generateMinimalCircuit(): string {
  return `/**
 * My Custom Circuit
 *
 * Replace this with your own circuit logic.
 * Use assert() statements to define constraints.
 *
 * @param publicInput - A public input value
 * @param privateInput - A private input value (not revealed)
 */
export function myCircuit(
  [publicInput]: [number],
  [privateInput]: [number]
): void {
  // Example: prove that private input equals public input
  assert(privateInput === publicInput);
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
export { ageProof } from './age-proof.js';
`;
  }
}
