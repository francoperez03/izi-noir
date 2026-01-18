# @izi-noir/sdk

Write ZK circuits in JavaScript/TypeScript, generate Noir code and proofs automatically.

## Installation

```bash
npm install @izi-noir/sdk
```

## Quick Start

```typescript
import { IziNoir, Provider } from '@izi-noir/sdk';

// Initialize with your preferred proving backend
const izi = await IziNoir.init({ provider: Provider.Barretenberg });

// Create a proof
const { proof, verified } = await izi.createProof(
  // Noir code (or use createProof helper for JS → Noir)
  `fn main(secret: Field, expected: pub Field) {
    assert(secret * secret == expected);
  }`,
  { secret: '10', expected: '100' }
);

console.log('Proof verified:', verified);
```

## Providers

| Provider | Proof Size | Environment | Notes |
|----------|-----------|-------------|-------|
| `Barretenberg` | ~16KB | Browser + Node.js | UltraHonk, default |
| `Arkworks` | ~256 bytes | Browser + Node.js | Groth16, smallest proofs |
| `Sunspot` | ~256 bytes | Node.js only | Groth16, CLI-based |

```typescript
// Barretenberg (default, browser-compatible)
const bb = await IziNoir.init({ provider: Provider.Barretenberg });

// Arkworks (smallest proofs, browser-compatible)
const ark = await IziNoir.init({ provider: Provider.Arkworks });

// Sunspot (Node.js only, requires CLI tools)
import { IziNoirSunspot } from '@izi-noir/sdk/sunspot';
const sunspot = await IziNoirSunspot.init({
  pkPath: './circuit.pk',
  vkPath: './circuit.vk',
  circuitPath: './circuit.json',
});
```

## JS → Noir Transpilation

Write circuits in JavaScript and transpile to Noir:

```typescript
import { createProof } from '@izi-noir/sdk';

const result = await createProof(
  [100],        // public inputs
  [10],         // private inputs
  ([expected], [secret]) => {
    assert(secret * secret == expected);
  }
);

console.log('Verified:', result.verified);
console.log('Generated Noir:', result.noirCode);
```

## Supported JS Patterns

| JavaScript | Noir | Notes |
|------------|------|-------|
| `assert(cond)` | `assert(cond)` | Core assertion |
| `==` / `===` | `==` | Equality |
| `!=` / `!==` | `!=` | Inequality |
| `+`, `-`, `*`, `/`, `%` | Same | Arithmetic |
| `<`, `>`, `<=`, `>=` | Same | Comparison |
| `&&` | `&` | **Converted to bitwise** |
| `\|\|` | `\|` | **Converted to bitwise** |
| `let x = expr` | `let x: Field = expr` | Immutable |
| `let mut_x = expr` | `let mut x: Field = expr` | Mutable (prefix convention) |
| `if/else` | `if/else` | Conditionals |
| `for (i < n)` | `for i in 0..n` | Loops |
| `[a, b, c]` | `[Field; 3]` | Arrays |
| `arr.length` | `arr.len()` | Length |
| `cond ? a : b` | `if cond { a } else { b }` | Ternary |

## AI Agent Skills

This SDK includes an AI agent skill for Claude Code and other compatible agents. The skill teaches AI assistants the correct patterns for writing JS/TS code that transpiles to valid Noir circuits.

### Install the Skill

```bash
# Using add-skill CLI (recommended)
npx add-skill github:your-org/izi-noir -s izi-noir-circuit-patterns

# Or manually copy to your project
cp -r packages/agent-skills/izi-noir-circuit-patterns .claude/skills/
```

### What the Skill Provides

- **Function signature requirements** - Correct `([public], [private]) => {}` pattern
- **Operator mapping** - Which JS operators work and how they convert
- **Mutability convention** - Using `mut_` prefix for mutable variables
- **Type mapping** - JS types to Noir `Field`, `bool`, arrays
- **Unsupported features** - What to avoid (objects, async, closures, etc.)
- **Working examples** - 10+ complete JS → Noir examples

### Using with Claude Code

Once installed, the skill auto-activates when you:
- Write circuit functions
- Use `createProof()`
- Ask about "JS to Noir" or "assert statements"

Example prompt: *"Help me write a circuit that proves I know a preimage"*

## Examples

### Simple Equality

```typescript
const result = await createProof(
  [42], [42],
  ([pub], [priv]) => {
    assert(pub == priv);
  }
);
```

### Sum with Loop

```typescript
const result = await createProof(
  [10], [1, 2, 3, 4],
  ([expected], [a, b, c, d]) => {
    let arr = [a, b, c, d];
    let mut_sum = 0;
    for (let i = 0; i < 4; i++) {
      mut_sum = mut_sum + arr[i];
    }
    assert(mut_sum == expected);
  }
);
```

### Conditional Logic

```typescript
const result = await createProof(
  [5], [10],
  ([threshold], [value]) => {
    let result = value > threshold ? 1 : 0;
    assert(result == 1);
  }
);
```

## How It Works

1. **Parse** - Extracts JS function AST using Acorn
2. **Generate** - Converts to Noir source code
3. **Compile** - Compiles Noir via `@noir-lang/noir_wasm`
4. **Prove** - Generates ZK proof with selected backend
5. **Verify** - Verifies the generated proof

## Browser Usage (Vite)

For Vite projects, initialize WASM manually:

```typescript
import initNoirC from "@noir-lang/noirc_abi";
import initACVM from "@noir-lang/acvm_js";
import acvm from "@noir-lang/acvm_js/web/acvm_js_bg.wasm?url";
import noirc from "@noir-lang/noirc_abi/web/noirc_abi_wasm_bg.wasm?url";
import { IziNoir, Provider, markWasmInitialized } from "@izi-noir/sdk";

// Initialize WASM with Vite URLs
await Promise.all([initACVM(fetch(acvm)), initNoirC(fetch(noirc))]);
markWasmInitialized();

// Now use IziNoir
const izi = await IziNoir.init({ provider: Provider.Barretenberg });
```

## Requirements

- Node.js >= 22.12.0

## License

MIT
