/**
 * Prefix used to indicate mutable variables in JS source.
 * Variables named `mut_foo` will become `let mut foo` in Noir.
 */
const MUT_PREFIX = 'mut_';

/**
 * Strips the `mut_` prefix from a variable name if present.
 *
 * @example
 * stripMutPrefix('mut_counter') // 'counter'
 * stripMutPrefix('total')       // 'total'
 */
export function stripMutPrefix(name: string): string {
  return name.startsWith(MUT_PREFIX) ? name.slice(MUT_PREFIX.length) : name;
}

/**
 * Checks if a variable name indicates mutability (has `mut_` prefix).
 *
 * @example
 * isMutable('mut_counter') // true
 * isMutable('total')       // false
 */
export function isMutable(name: string): boolean {
  return name.startsWith(MUT_PREFIX);
}
