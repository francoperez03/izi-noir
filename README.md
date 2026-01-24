# IZI-NOIR

> Write ZK circuits in JavaScript. Verify proofs on Solana.

IZI-NOIR is a privacy-preserving toolkit that transpiles JavaScript functions into Noir zero-knowledge circuits, compiles them, and generates proofs that can be verified both locally and on-chain on Solana.

## The Problem

Building privacy features on Solana is challenging:
- Writing ZK circuits requires learning specialized DSLs (Circom, Noir)
- Proof systems are complex with steep learning curves
- Integration with Solana requires manual encoding and large proofs
- Browser-based proving is difficult to set up

## The Solution

IZI-NOIR makes ZK development accessible:
- **Write circuits in JavaScript** using familiar `assert()` statements
- **Multiple proving backends** optimized for different use cases
- **Native Solana integration** with 256-byte Groth16 proofs
- **Browser + Node.js** support out of the box

## Quick Start

```typescript
import { createProof } from '@izi-noir/sdk';

// Prove you know a secret whose square equals 100
const result = await createProof(
  [100],           // public inputs (expected result)
  [10],            // private inputs (the secret)
  ([expected], [secret]) => {
    assert(secret * secret == expected);
  }
);

console.log(result.verified); // true
console.log(result.proof);    // Uint8Array
```

Or use the unified `IziNoir` class for more control:

```typescript
import { IziNoir, Provider } from '@izi-noir/sdk';

const izi = await IziNoir.init({ provider: Provider.Arkworks });

const { proof, verified } = await izi.createProof(
  `fn main(secret: Field, expected: pub Field) {
    assert(secret * secret == expected);
  }`,
  { secret: '10', expected: '100' }
);
```

## Why IZI-NOIR?

| Feature | Traditional ZK | IZI-NOIR |
|---------|---------------|----------|
| Language | Circom, Noir DSL | JavaScript |
| Learning Curve | Weeks | Hours |
| Browser Support | Complex setup | Works out of box |
| Solana Integration | Manual | Built-in |
| Groth16 Proof Size | Manual encoding | 256 bytes auto-formatted |

### Key Advantages

1. **Zero Cryptography Knowledge Required** - Write `assert(secret * secret == expected)` instead of R1CS constraints
2. **Production-Ready Solana Integration** - Uses native BN254 syscalls for efficient on-chain verification
3. **Flexible Proving Backends** - Choose between speed (Barretenberg) or size (Arkworks/Groth16)
4. **Modern Developer Experience** - TypeScript-first API with full type safety

## Packages

| Package | Description |
|---------|-------------|
| [@izi-noir/sdk](./packages/sdk) | Core SDK - JS to Noir transpiler with multiple proving backends |
| [solana-contracts](./packages/solana-contracts) | Anchor program for on-chain Groth16 verification |
| [frontend](./packages/frontend) | Demo web application |
| [agent-skills](./packages/agent-skills) | AI agent skills for Claude Code |

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     JavaScript Function                          │
│              ([pub], [priv]) => { assert(...) }                  │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Acorn Parser                                │
│                   (AST Extraction)                               │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Noir Generator                                │
│              (AST → Noir Source Code)                            │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    noir_wasm Compiler                            │
│              (Noir → ACIR Bytecode)                              │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Proving Backend                                │
│     ┌─────────────┬─────────────┬─────────────┐                 │
│     │ Barretenberg│  Arkworks   │   Sunspot   │                 │
│     │ (UltraHonk) │  (Groth16)  │  (Groth16)  │                 │
│     │   ~16KB     │   ~256B     │   ~324B     │                 │
│     │   Browser   │   Browser   │  Node.js    │                 │
│     └─────────────┴─────────────┴─────────────┘                 │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Proof + Verification                            │
│           Local verification or Solana on-chain                  │
└─────────────────────────────────────────────────────────────────┘
```

## Proving Backends

| Backend | Proof Size | Environment | Best For |
|---------|------------|-------------|----------|
| **Barretenberg** | ~16 KB | Browser + Node.js | Development, fast iteration |
| **Arkworks** | ~256 bytes | Browser + Node.js | Solana on-chain verification |
| **Sunspot** | ~324 bytes | Node.js only | Pre-compiled production circuits |

## Example Use Cases

### Private Balance Proof
```typescript
// Prove balance >= amount without revealing actual balance
const result = await createProof(
  [minAmount],
  [actualBalance],
  ([min], [balance]) => {
    assert(balance >= min);
  }
);
```

### Age Verification
```typescript
// Prove age >= 18 without revealing birthdate
const result = await createProof(
  [18, currentYear],
  [birthYear],
  ([minAge, now], [birth]) => {
    assert(now - birth >= minAge);
  }
);
```

### Solana On-Chain Verification
```typescript
import { IziNoir, Provider } from '@izi-noir/sdk';

const izi = await IziNoir.init({ provider: Provider.Arkworks });
await izi.compile(noirCode);

// Get Solana-ready proof data
const solanaProof = await izi.proveForSolana(inputs);

// Use with Anchor program
await program.methods
  .initVkFromBytes(
    solanaProof.verifyingKey.nrPublicInputs,
    Buffer.from(solanaProof.verifyingKey.bytes)
  )
  .accounts({ vkAccount, authority, payer, systemProgram })
  .rpc();

await program.methods
  .verifyProof(
    Buffer.from(solanaProof.proof.bytes),
    solanaProof.publicInputs.bytes.map(b => Array.from(b))
  )
  .accounts({ vkAccount })
  .rpc();
```

## Requirements

- **Node.js 22.12.0+** (required for Noir WASM)
- **Rust + Solana CLI + Anchor CLI** (for Solana contracts only)

## Installation

```bash
# Clone the repository
git clone https://github.com/francoperez03/izi-noir.git
cd izi-noir

# Install dependencies
npm install

# Build all packages
npm run build
```

## Commands

```bash
npm install              # Install all workspace dependencies
npm run build            # Build all packages
npm test                 # Run all tests
npm run build:sdk        # Build only SDK
npm run test:sdk         # Test only SDK
npm run build:contracts  # Build Solana contracts
npm run lint             # Lint all packages
npm run format           # Format with Prettier
```

## AI Agent Skills

This project includes AI coding agent skills that teach assistants like Claude Code how to write valid JS/TS code for ZK circuit generation.

### Install Skills

```bash
# Using add-skill CLI (works with Claude Code, Cursor, Copilot, etc.)
npx add-skill github:your-org/izi-noir -s izi-noir-circuit-patterns

# Or copy manually
cp -r packages/agent-skills/izi-noir-circuit-patterns .claude/skills/
```

### What Skills Provide

The `izi-noir-circuit-patterns` skill teaches AI assistants:

- **Correct function signature**: `([public], [private]) => { assert(...) }`
- **Operator mapping**: Which JS operators work and how they convert to Noir
- **Mutability convention**: Using `mut_` prefix for mutable variables
- **Type mapping**: JS → Noir types (`number` → `Field`, arrays, etc.)
- **10+ working examples**: Complete JS → Noir transformations

## Documentation

- [SDK Documentation](./packages/sdk/README.md) - API reference and usage guide
- [Architecture Guide](./docs/ARCHITECTURE.md) - Technical deep-dive
- [Solana Integration](./docs/SOLANA_INTEGRATION.md) - On-chain verification guide
- [Solana Contracts](./packages/solana-contracts/README.md) - Anchor program docs
- [Frontend Demo](./packages/frontend/README.md) - Web app documentation

## Project Structure

```
izi-noir/
├── packages/
│   ├── sdk/               # @izi-noir/sdk - Core transpiler and provers
│   ├── frontend/          # Vite + React demo application
│   ├── solana-contracts/  # Anchor programs for on-chain verification
│   └── agent-skills/      # AI agent skills
├── tooling/               # Shared TypeScript, ESLint, Prettier configs
└── docs/                  # Extended documentation
```

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## License

MIT
