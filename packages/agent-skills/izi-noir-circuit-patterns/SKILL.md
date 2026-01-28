---
name: izi-noir-circuit-patterns
description: >
  Patterns for writing JS/TS code that transpiles to Noir ZK circuits.
  Trigger: When writing circuit functions, IziNoir API, Solana deployment, Provider/Chain selection, or JS-to-Noir transformations.
license: MIT
metadata:
  author: izi-noir
  version: "2.0"
  scope: [sdk, frontend, solana-contracts]
  auto_invoke:
    - "circuit function"
    - "createProof"
    - "IziNoir"
    - "assert statement"
    - "JS to Noir"
    - "zero knowledge"
    - "Solana proof"
    - "Chain.Solana"
    - "Provider.Arkworks"
allowed-tools: Read, Glob, Grep
---

# IZI-NOIR Circuit Patterns

Patterns for writing JavaScript/TypeScript code that the SDK can parse and transpile 1:1 to Noir ZK circuits, with Solana on-chain verification support.

## When to Use

- Writing circuit functions for `createProof()`
- Using the IziNoir class API (init, compile, prove, deploy, verifyOnChain)
- Deploying proofs to Solana
- Choosing between providers (Arkworks, Barretenberg)
- Debugging parsing or Noir generation errors
- Understanding JS → Noir type mapping

## Architecture Overview

```
JS Function → AcornParser → NoirGenerator → Noir WASM → ArkworksWasm → Solana
```

**Pipeline layers:**
1. **Domain Layer** - Core types: Circuit, Proof, VerifyingKey, Provider, Chain, Network
2. **Application Layer** - Services: NoirGenerator, createProof orchestration
3. **Infrastructure Layer** - Parsers (Acorn), Compilers (Noir WASM), Provers (Arkworks/BB)

## IziNoir Class API

### Initialization

```typescript
import { IziNoir, Provider, Chain, Network } from '@izi-noir/sdk';

// Basic initialization (development)
const izi = await IziNoir.init({
  provider: Provider.Arkworks,
});

// With Solana chain targeting
const izi = await IziNoir.init({
  provider: Provider.Arkworks,
  chain: Chain.Solana,
  network: Network.Devnet,
});
```

### Providers

| Provider | Use Case | Proof Size | Notes |
|----------|----------|------------|-------|
| `Provider.Arkworks` | **Solana production** | 256 bytes | Groth16, native syscalls |
| `Provider.Barretenberg` | Development/testing | ~2KB | UltraPlonk, faster setup |

**Rule:** Always use `Provider.Arkworks` for Solana on-chain verification.

### Chain and Network

```typescript
// Chain enum
Chain.Solana     // Format proofs for Solana verification
Chain.EVM        // Format proofs for EVM verification (future)

// Network enum
Network.Devnet   // Solana devnet
Network.Mainnet  // Solana mainnet
Network.Localnet // Local validator
```

### Creating Proofs

```typescript
// Define circuit function
const balanceProof = (
  [threshold]: [number],    // public inputs
  [balance]: [number]       // private inputs
) => {
  assert(balance >= threshold);
};

// Generate proof
const result = await izi.createProof(
  balanceProof,
  [100],      // public: threshold
  [1500]      // private: actual balance
);

console.log(result.verified);  // true
console.log(result.proof);     // Uint8Array (256 bytes for Arkworks)
```

### Solana Deployment

```typescript
// Deploy verifying key to Solana
const deployment = await izi.deploy(balanceProof, {
  payer: wallet,
  network: Network.Devnet,
});

console.log(deployment.vkAccount);  // PublicKey of VK account
console.log(deployment.programId);  // Verifier program ID

// Verify proof on-chain
const txSignature = await izi.verifyOnChain(result.proof, {
  vkAccount: deployment.vkAccount,
  payer: wallet,
});
```

### SolanaProofData Structure

When `chain: Chain.Solana`, proof data is formatted as:

```typescript
interface SolanaProofData {
  verifyingKey: {
    nr_pubinputs: number;
    vk_alpha_g1: number[];    // 64 bytes
    vk_beta_g2: number[];     // 128 bytes
    vk_gamma_g2: number[];    // 128 bytes
    vk_delta_g2: number[];    // 128 bytes
    vk_ic: number[][];        // (nr_pubinputs + 1) × 64 bytes
  };
  proof: {
    ar: number[];             // 64 bytes - A point (G1)
    bs: number[];             // 128 bytes - B point (G2)
    krs: number[];            // 64 bytes - C point (G1)
  };
  publicInputs: number[][];   // Each input as 32-byte array
}
```

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

## CLI: create-izi-noir

Scaffold new projects quickly:

```bash
# Interactive mode
npx create-izi-noir

# Quick setup
npx create-izi-noir my-project --yes

# With specific template
npx create-izi-noir my-project --template balance-proof

# With specific provider
npx create-izi-noir my-project --provider arkworks
```

**Templates:**
- `default` - Balance proof + age verification circuits
- `minimal` - Blank canvas with empty circuit
- `balance-proof` - Just balance proof circuit

**Options:**
- `-t, --template <template>` - Template to use
- `-p, --provider <provider>` - Proving provider (arkworks/barretenberg)
- `-y, --yes` - Skip prompts
- `--skip-install` - Skip npm install
- `--skip-git` - Skip git init

## Frontend Integration (Vite)

```typescript
// vite.config.ts
export default defineConfig({
  optimizeDeps: {
    exclude: ['@noir-lang/noirc_abi', '@noir-lang/acvm_js'],
  },
});

// main.ts - Initialize WASM before use
import initNoirC from '@noir-lang/noirc_abi';
import initACVM from '@noir-lang/acvm_js';
import acvm from '@noir-lang/acvm_js/web/acvm_js_bg.wasm?url';
import noirc from '@noir-lang/noirc_abi/web/noirc_abi_wasm_bg.wasm?url';
import { markWasmInitialized, IziNoir, Provider } from '@izi-noir/sdk';

await Promise.all([initACVM(fetch(acvm)), initNoirC(fetch(noirc))]);
markWasmInitialized();

// Now IziNoir is ready
const izi = await IziNoir.init({ provider: Provider.Arkworks });
```

## Resources

- [Operator Mapping Table](assets/operator-mapping.md)
- [User Guide](../../../docs/USER_GUIDE.md)
- [Solana Integration](../../../docs/SOLANA_INTEGRATION.md)
- [Architecture](../../../docs/ARCHITECTURE.md)
- [CLI Guide](../../../docs/CLI_GUIDE.md)
- Parser: `packages/sdk/src/infra/parser/AcornParser.ts`
- Generator: `packages/sdk/src/application/services/NoirGenerator.ts`
- IziNoir Class: `packages/sdk/src/IziNoir.ts`
