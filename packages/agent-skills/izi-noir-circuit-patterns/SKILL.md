---
name: izi-noir-circuit-patterns
description: >
  Patterns for writing JS/TS code that transpiles to Noir ZK circuits.
  Trigger: When writing circuit functions, createProof, assert statements, or JS-to-Noir transformations.
license: MIT
metadata:
  author: izi-noir
  version: "1.0"
  scope: [sdk]
  auto_invoke:
    - "circuit function"
    - "createProof"
    - "assert statement"
    - "JS to Noir"
    - "zero knowledge"
allowed-tools: Read, Glob, Grep
---

# IZI-NOIR Circuit Patterns

Patterns for writing JavaScript/TypeScript code that the SDK can parse and transpile 1:1 to Noir ZK circuits.

## When to Use

- Writing circuit functions for `createProof()`
- Need to know which operators/types the parser supports
- Debugging parsing or Noir generation errors
- Understanding JS → Noir type mapping

## Critical Patterns

### 1. Function Signature (REQUIRED)

```typescript
// MUST use array destructuring for both parameters
([publicInputs], [privateInputs]) => {
  // body with assert statements
}

// Example with multiple inputs
([expected, threshold], [secret, salt]) => {
  assert(secret * secret == expected);
  assert(secret > threshold);
}
```

- First array: **public inputs** (marked `pub` in Noir)
- Second array: **private inputs** (witness values)
- Arrow function or function expression
- Body: block statement `{ }` or single expression

### 2. Mutability Convention

```typescript
// Immutable (default)
let x = a + b;           // → let x: Field = a + b;

// Mutable (use mut_ prefix)
let mut_sum = 0;         // → let mut sum: Field = 0;
mut_sum = mut_sum + 1;   // → sum = sum + 1;
```

**Rule:** Prefix variable name with `mut_` for mutable variables. The prefix is stripped in generated Noir.

### 3. Operators

| JavaScript | Noir | Notes |
|------------|------|-------|
| `==` / `===` | `==` | Both map to equality |
| `!=` / `!==` | `!=` | Both map to inequality |
| `+` | `+` | Addition |
| `-` | `-` | Subtraction |
| `*` | `*` | Multiplication |
| `/` | `/` | Division |
| `%` | `%` | Modulo |
| `<` | `<` | Less than |
| `>` | `>` | Greater than |
| `<=` | `<=` | Less than or equal |
| `>=` | `>=` | Greater than or equal |
| `&&` | `&` | **Converted to bitwise AND** |
| `\|\|` | `\|` | **Converted to bitwise OR** |
| `!` | `!` | Logical NOT |
| `-x` | `-x` | Negation |

**Warning:** `&&` and `||` are converted to bitwise operators in Noir!

### 4. Statements

#### Assert
```typescript
assert(condition);              // Basic assertion
assert(condition, "message");   // With error message
```

#### Variable Declaration
```typescript
let x = a + b;           // Immutable
let mut_counter = 0;     // Mutable (mut_ prefix)
const y = 10;            // Immutable (const supported)
```

#### Assignment (mutable only)
```typescript
mut_x = mut_x + 1;       // Only valid for mut_ variables
```

#### If/Else
```typescript
if (condition) {
  // consequent
} else {
  // alternate
}
```

#### For Loop
```typescript
// Exclusive range (i < end)
for (let i = 0; i < 10; i++) { }
// → for i in 0..10 { }

// Inclusive range (i <= end)
for (let i = 1; i <= 5; i++) { }
// → for i in 1..=5 { }

// Variable bounds
for (let i = start; i < end; i++) { }
// → for i in start..end { }
```

**Loop constraints:**
- Init: `let i = start`
- Test: `i < end` or `i <= end`
- Update: `i++`, `++i`, or `i = i + 1`

### 5. Expressions

#### Literals
```typescript
5                  // number → Field
100n               // bigint → Field
"string"           // string literal
0x1234             // hex value
true / false       // boolean → bool
```

#### Arrays
```typescript
let arr = [a, b, c];      // → [Field; 3]
arr[0]                    // static index
arr[i]                    // dynamic index
arr.length                // → arr.len()
```

#### Ternary (conditional)
```typescript
let result = cond ? a : b;
// → let result: Field = if cond { a } else { b };
```

#### Method Calls
```typescript
arr.len()                 // Array length
```

### 6. Type Mapping

| JavaScript | Noir Type | Notes |
|------------|-----------|-------|
| `number` | `Field` | Default for all numerics |
| `bigint` | `Field` | Converted to string |
| `boolean` | `bool` | Only `true`/`false` literals |
| `[a,b,c]` | `[Field; 3]` | Fixed-size array |

**Default type:** Everything is `Field` unless explicitly boolean.

## NOT Supported

These JavaScript features **cannot** be parsed:

- Object literals `{ key: value }`
- Destructuring (except function parameters)
- Spread operator `...`
- Rest parameters `...args`
- Template literals `` `${x}` ``
- Async/await
- While/do-while loops
- Switch statements
- Function declarations inside circuit
- Closures over external variables
- Class methods
- Regular expressions
- Try/catch
- Break/continue
- Return statements
- Computed property assignment `arr[i] = x`

## Code Examples

See [assets/valid-examples.ts](assets/valid-examples.ts) for complete working examples.

## Resources

- [Operator Mapping Table](assets/operator-mapping.md)
- Parser: `packages/sdk/src/infra/parser/AcornParser.ts`
- Generator: `packages/sdk/src/application/services/NoirGenerator.ts`
