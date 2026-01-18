/**
 * Valid JS/TS Circuit Patterns for IZI-NOIR
 *
 * Each example shows the JS input and the generated Noir output.
 * All examples are valid and can be used with createProof().
 */

// Declare assert for TypeScript (SDK parses it, not executed)
declare function assert(condition: boolean, message?: string): void;

// =============================================================================
// Example 1: Basic Assertion (simplest circuit)
// =============================================================================
/**
 * JS Input:
 */
export const basicAssertion = ([expected]: number[], [secret]: number[]) => {
  assert(secret * secret == expected);
};
/**
 * Generated Noir:
 * ```noir
 * fn main(secret: Field, expected: pub Field) {
 *     assert(secret * secret == expected);
 * }
 * ```
 */

// =============================================================================
// Example 2: Multiple Inputs with Arithmetic
// =============================================================================
/**
 * JS Input:
 */
export const multipleInputs = (
  [sum, product]: number[],
  [a, b]: number[]
) => {
  assert(a + b == sum);
  assert(a * b == product);
};
/**
 * Generated Noir:
 * ```noir
 * fn main(a: Field, b: Field, sum: pub Field, product: pub Field) {
 *     assert(a + b == sum);
 *     assert(a * b == product);
 * }
 * ```
 */

// =============================================================================
// Example 3: Variables and Mutability
// =============================================================================
/**
 * JS Input:
 */
export const variablesAndMutability = (
  [expected]: number[],
  [a, b]: number[]
) => {
  // Immutable variable
  let sum = a + b;

  // Mutable variable (mut_ prefix)
  let mut_result = 0;
  mut_result = sum * 2;

  assert(mut_result == expected);
};
/**
 * Generated Noir:
 * ```noir
 * fn main(a: Field, b: Field, expected: pub Field) {
 *     let sum: Field = a + b;
 *     let mut result: Field = 0;
 *     result = sum * 2;
 *     assert(result == expected);
 * }
 * ```
 */

// =============================================================================
// Example 4: Conditional Logic (if/else)
// =============================================================================
/**
 * JS Input:
 */
export const conditionalLogic = (
  [threshold]: number[],
  [value]: number[]
) => {
  let mut_result = 0;

  if (value > threshold) {
    mut_result = 1;
  } else {
    mut_result = 0;
  }

  assert(mut_result == 1);
};
/**
 * Generated Noir:
 * ```noir
 * fn main(value: Field, threshold: pub Field) {
 *     let mut result: Field = 0;
 *     if value > threshold {
 *         result = 1;
 *     } else {
 *         result = 0;
 *     }
 *     assert(result == 1);
 * }
 * ```
 */

// =============================================================================
// Example 5: Ternary Expression
// =============================================================================
/**
 * JS Input:
 */
export const ternaryExpression = (
  [threshold]: number[],
  [value]: number[]
) => {
  // Ternary converts to Noir if-expression
  let result = value > threshold ? 1 : 0;
  assert(result == 1);
};
/**
 * Generated Noir:
 * ```noir
 * fn main(value: Field, threshold: pub Field) {
 *     let result: Field = if value > threshold { 1 } else { 0 };
 *     assert(result == 1);
 * }
 * ```
 */

// =============================================================================
// Example 6: For Loop with Array
// =============================================================================
/**
 * JS Input:
 */
export const forLoopWithArray = (
  [expected]: number[],
  [a, b, c, d]: number[]
) => {
  let arr = [a, b, c, d];
  let mut_sum = 0;

  // Exclusive range: i < 4 → for i in 0..4
  for (let i = 0; i < 4; i++) {
    mut_sum = mut_sum + arr[i];
  }

  assert(mut_sum == expected);
};
/**
 * Generated Noir:
 * ```noir
 * fn main(a: Field, b: Field, c: Field, d: Field, expected: pub Field) {
 *     let arr: [Field; 4] = [a, b, c, d];
 *     let mut sum: Field = 0;
 *     for i in 0..4 {
 *         sum = sum + arr[i];
 *     }
 *     assert(sum == expected);
 * }
 * ```
 */

// =============================================================================
// Example 7: Inclusive Range Loop
// =============================================================================
/**
 * JS Input:
 */
export const inclusiveRangeLoop = ([expected]: number[], [n]: number[]) => {
  let mut_sum = 0;

  // Inclusive range: i <= n → for i in 1..=n
  for (let i = 1; i <= n; i++) {
    mut_sum = mut_sum + i;
  }

  assert(mut_sum == expected);
};
/**
 * Generated Noir:
 * ```noir
 * fn main(n: Field, expected: pub Field) {
 *     let mut sum: Field = 0;
 *     for i in 1..=n {
 *         sum = sum + i;
 *     }
 *     assert(sum == expected);
 * }
 * ```
 */

// =============================================================================
// Example 8: Nested Control Flow
// =============================================================================
/**
 * JS Input:
 */
export const nestedControlFlow = ([max]: number[], []: number[]) => {
  let mut_evenSum = 0;

  for (let i = 1; i <= max; i++) {
    // Nested if inside loop
    if (i % 2 == 0) {
      mut_evenSum = mut_evenSum + i;
    }
  }

  assert(mut_evenSum > 0);
};
/**
 * Generated Noir:
 * ```noir
 * fn main(max: pub Field) {
 *     let mut evenSum: Field = 0;
 *     for i in 1..=max {
 *         if i % 2 == 0 {
 *             evenSum = evenSum + i;
 *         }
 *     }
 *     assert(evenSum > 0);
 * }
 * ```
 */

// =============================================================================
// Example 9: Comparison Operators
// =============================================================================
/**
 * JS Input:
 */
export const comparisonOperators = (
  [min, max]: number[],
  [value]: number[]
) => {
  // All comparison operators
  assert(value >= min);
  assert(value <= max);
  assert(value != 0);

  // Combined with arithmetic
  let doubled = value * 2;
  assert(doubled < max * 2);
};
/**
 * Generated Noir:
 * ```noir
 * fn main(value: Field, min: pub Field, max: pub Field) {
 *     assert(value >= min);
 *     assert(value <= max);
 *     assert(value != 0);
 *     let doubled: Field = value * 2;
 *     assert(doubled < max * 2);
 * }
 * ```
 */

// =============================================================================
// Example 10: Array Length Access
// =============================================================================
/**
 * JS Input:
 */
export const arrayLengthAccess = (
  [expectedLen]: number[],
  [a, b, c]: number[]
) => {
  let arr = [a, b, c];

  // .length converts to .len() in Noir
  assert(arr.length == expectedLen);
};
/**
 * Generated Noir:
 * ```noir
 * fn main(a: Field, b: Field, c: Field, expectedLen: pub Field) {
 *     let arr: [Field; 3] = [a, b, c];
 *     assert(arr.len() == expectedLen);
 * }
 * ```
 */
