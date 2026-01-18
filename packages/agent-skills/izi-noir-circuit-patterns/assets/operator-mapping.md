# JavaScript to Noir Mapping Reference

Complete mapping of JavaScript constructs to their Noir equivalents.

## Binary Operators

| JavaScript | Noir | Category | Example |
|------------|------|----------|---------|
| `==` | `==` | Equality | `a == b` → `a == b` |
| `===` | `==` | Strict equality | `a === b` → `a == b` |
| `!=` | `!=` | Inequality | `a != b` → `a != b` |
| `!==` | `!=` | Strict inequality | `a !== b` → `a != b` |
| `+` | `+` | Addition | `a + b` → `a + b` |
| `-` | `-` | Subtraction | `a - b` → `a - b` |
| `*` | `*` | Multiplication | `a * b` → `a * b` |
| `/` | `/` | Division | `a / b` → `a / b` |
| `%` | `%` | Modulo | `a % b` → `a % b` |
| `<` | `<` | Less than | `a < b` → `a < b` |
| `>` | `>` | Greater than | `a > b` → `a > b` |
| `<=` | `<=` | Less or equal | `a <= b` → `a <= b` |
| `>=` | `>=` | Greater or equal | `a >= b` → `a >= b` |
| `&&` | `&` | Logical AND | `a && b` → `a & b` |
| `\|\|` | `\|` | Logical OR | `a \|\| b` → `a \| b` |

> **Warning:** Logical operators `&&` and `||` are converted to bitwise operators `&` and `|` in Noir.

## Unary Operators

| JavaScript | Noir | Category | Example |
|------------|------|----------|---------|
| `!` | `!` | Logical NOT | `!a` → `!a` |
| `-` (prefix) | `-` | Negation | `-a` → `-a` |

## Type Mapping

| JavaScript Type | Noir Type | Notes |
|-----------------|-----------|-------|
| `number` | `Field` | Default numeric type |
| `bigint` | `Field` | Converted to string |
| `boolean` | `bool` | Only `true`/`false` literals |
| `string` | String literal | Quoted in Noir |
| `number[]` | `[Field; N]` | Fixed-size array |

## Statement Mapping

| JavaScript | Noir | Notes |
|------------|------|-------|
| `assert(cond)` | `assert(cond)` | Direct mapping |
| `assert(cond, "msg")` | `assert(cond, "msg")` | With message |
| `let x = expr` | `let x: Type = expr` | Immutable |
| `let mut_x = expr` | `let mut x: Type = expr` | Mutable (prefix stripped) |
| `const x = expr` | `let x: Type = expr` | Treated as let |
| `mut_x = expr` | `x = expr` | Assignment (mutable only) |
| `if (c) { } else { }` | `if c { } else { }` | No parens in Noir |
| `for (let i=s; i<e; i++)` | `for i in s..e { }` | Exclusive range |
| `for (let i=s; i<=e; i++)` | `for i in s..=e { }` | Inclusive range |

## Expression Mapping

| JavaScript | Noir | Notes |
|------------|------|-------|
| `x` | `x` | Identifier |
| `5` | `5` | Number literal |
| `100n` | `100` | BigInt to Field |
| `"str"` | `"str"` | String literal |
| `0x1234` | `0x1234` | Hex preserved |
| `true` / `false` | `true` / `false` | Boolean |
| `[a, b, c]` | `[a, b, c]` | Array literal |
| `arr[i]` | `arr[i]` | Index access |
| `arr.length` | `arr.len()` | Length method |
| `c ? a : b` | `if c { a } else { b }` | Ternary → if expr |
| `a + b * c` | `a + b * c` | Precedence preserved |

## Function Parameter Mapping

```typescript
// JavaScript
([pub1, pub2], [priv1, priv2]) => { ... }

// Noir (private params first, then public with 'pub')
fn main(priv1: Field, priv2: Field, pub1: pub Field, pub2: pub Field) { ... }
```

## Variable Naming Convention

| JavaScript | Noir | Rule |
|------------|------|------|
| `x` | `x` | Regular immutable |
| `mut_x` | `mut x` | Mutable (prefix stripped) |
| `mut_counter` | `mut counter` | Mutable (prefix stripped) |

## For Loop Patterns

| JavaScript | Noir | Range Type |
|------------|------|------------|
| `for (let i = 0; i < 10; i++)` | `for i in 0..10` | Exclusive |
| `for (let i = 1; i <= 5; i++)` | `for i in 1..=5` | Inclusive |
| `for (let i = start; i < end; i++)` | `for i in start..end` | Variable bounds |
| `for (let i = 0; i < n; i = i + 1)` | `for i in 0..n` | Alternative update |

## Unsupported Operators

| JavaScript | Status | Alternative |
|------------|--------|-------------|
| `**` (exponent) | Not supported | Use multiplication loop |
| `<<` (left shift) | Not supported | N/A |
| `>>` (right shift) | Not supported | N/A |
| `>>>` (unsigned shift) | Not supported | N/A |
| `&` (bitwise AND) | Use `&&` | Converted to `&` |
| `\|` (bitwise OR) | Use `\|\|` | Converted to `\|` |
| `^` (XOR) | Not supported | N/A |
| `~` (NOT) | Not supported | N/A |
| `in` | Not supported | N/A |
| `instanceof` | Not supported | N/A |
