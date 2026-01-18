# noir-from-js

Write ZK circuits in JavaScript/TypeScript, generate Noir code and proofs automatically.

## Installation

```bash
npm install noir-from-js
```

## Usage

```typescript
import { createProof } from 'noir-from-js';

// Prove that you know a secret whose square equals the public value
const result = await createProof(
  [100],        // public inputs
  [10],         // private inputs (the secret)
  ([expected], [secret]) => {
    assert(secret * secret == expected);
  }
);

console.log('Proof verified:', result.verified);
console.log('Generated Noir code:', result.noirCode);
```

## API

### `createProof(publicInputs, privateInputs, circuitFn)`

Generates a ZK proof from a JavaScript function.

**Parameters:**
- `publicInputs: (number | string | bigint)[]` - Values that will be public in the proof
- `privateInputs: (number | string | bigint)[]` - Values that remain private (the witness)
- `circuitFn: (pub, priv) => void` - Circuit logic using `assert()` statements

**Returns:** `Promise<ProofResult>`

```typescript
interface ProofResult {
  proof: Uint8Array;
  publicInputs: string[];
  verified: boolean;
  noirCode: string;
  timings: {
    parseMs: number;
    generateMs: number;
    compileMs: number;
    witnessMs: number;
    proofMs: number;
    verifyMs: number;
    totalMs: number;
  };
}
```

## Supported Operations

| JavaScript | Noir |
|-----------|------|
| `assert(condition)` | `assert(condition);` |
| `a == b` or `a === b` | `a == b` |
| `a != b` or `a !== b` | `a != b` |
| `a + b` | `a + b` |
| `a - b` | `a - b` |
| `a * b` | `a * b` |
| `a / b` | `a / b` |

## Examples

### Simple equality proof

```typescript
const result = await createProof(
  [42],
  [42],
  ([pub], [priv]) => {
    assert(pub == priv);
  }
);
```

### Arithmetic proof

```typescript
const result = await createProof(
  [15],           // public: sum
  [10, 5],        // private: a, b
  ([sum], [a, b]) => {
    assert(a + b == sum);
  }
);
```

### Multiple assertions

```typescript
const result = await createProof(
  [100, 10],
  [50, 50],
  ([total, min], [a, b]) => {
    assert(a + b == total);
    assert(a != 0);
    assert(b != 0);
  }
);
```

## How it works

1. **Parse**: Extracts the function AST using Acorn
2. **Generate**: Converts JS AST to Noir source code
3. **Compile**: Compiles Noir to bytecode using `@noir-lang/noir_wasm`
4. **Prove**: Generates ZK proof using `@aztec/bb.js` (UltraHonk)
5. **Verify**: Verifies the generated proof

## Advanced Usage

You can also use individual functions for more control:

```typescript
import {
  parseCircuitFunction,
  generateNoir,
  compileNoir,
  generateProof,
  verifyProof
} from 'noir-from-js';

// Parse JS function
const parsed = parseCircuitFunction(myFn, publicInputs, privateInputs);

// Generate Noir code
const noirCode = generateNoir(parsed);
console.log(noirCode);

// Compile to bytecode
const circuit = await compileNoir(noirCode);

// Generate proof
const { proof, publicInputs } = await generateProof(circuit, inputs);

// Verify
const valid = await verifyProof(circuit, proof, publicInputs);
```

## Requirements

- Node.js >= 18.0.0

## License

MIT
