# IZI-NOIR User Guide

Complete guide to building privacy-preserving applications on Solana using IZI-NOIR.

## Table of Contents

1. [What is IZI-NOIR?](#what-is-izi-noir)
2. [Architecture Overview](#architecture-overview)
3. [Quick Start with CLI](#quick-start-with-cli)
4. [Installation](#installation)
5. [Understanding ZK Proofs](#understanding-zk-proofs)
6. [Writing Circuits](#writing-circuits)
7. [Generating Proofs](#generating-proofs)
8. [Chain Targeting](#chain-targeting)
9. [Verifying Proofs](#verifying-proofs)
10. [Deploying to Solana](#deploying-to-solana)
11. [Common Patterns](#common-patterns)
12. [Troubleshooting](#troubleshooting)

---

## What is IZI-NOIR?

IZI-NOIR lets you prove things without revealing the underlying data. For example:

- Prove you're over 18 without revealing your exact age
- Prove you have sufficient balance without revealing the amount
- Prove you know a password without sending the password
- Prove membership in a group without revealing which member you are

### How it works (simplified)

```
Your JavaScript code → Noir circuit → ZK Proof → Verify on Solana
```

1. You write a simple JavaScript function with `assert()` statements
2. IZI-NOIR transpiles it to Noir (a ZK-friendly language)
3. Generate a cryptographic proof (Groth16)
4. Anyone can verify the proof on Solana without seeing your private data

---

## Architecture Overview

Under the hood, IZI-NOIR uses a multi-stage pipeline:

```
┌─────────────────────────────────────────────────────────────────┐
│                     IZI-NOIR Pipeline                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  JavaScript Function                                            │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ ([expected], [secret]) => {                               │ │
│  │   assert(secret * secret == expected);                    │ │
│  │ }                                                         │ │
│  └───────────────────────────────────────────────────────────┘ │
│                            │                                    │
│                            ▼                                    │
│                   ┌─────────────────┐                           │
│                   │  AcornParser    │  Parse JS to AST          │
│                   └────────┬────────┘                           │
│                            │                                    │
│                            ▼                                    │
│                   ┌─────────────────┐                           │
│                   │  NoirGenerator  │  AST → Noir Code          │
│                   └────────┬────────┘                           │
│                            │                                    │
│                            ▼                                    │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ fn main(pub expected: Field, secret: Field) {             │ │
│  │     assert(secret * secret == expected);                  │ │
│  │ }                                                         │ │
│  └───────────────────────────────────────────────────────────┘ │
│                            │                                    │
│                            ▼                                    │
│              ┌──────────────────────────┐                       │
│              │   @noir-lang/noir_wasm   │                       │
│              │   (Noir → ACIR bytecode) │                       │
│              └────────────┬─────────────┘                       │
│                           │                                     │
│                           ▼                                     │
│              ┌──────────────────────────┐                       │
│              │   ArkworksWasm (Rust)    │                       │
│              │   - Generate R1CS        │                       │
│              │   - Groth16 Setup (PK,VK)│                       │
│              │   - Generate Proof       │                       │
│              │   - Convert to gnark fmt │                       │
│              └────────────┬─────────────┘                       │
│                           │                                     │
│                           ▼                                     │
│              ┌──────────────────────────┐                       │
│              │   SolanaFormatter        │                       │
│              │   - VK for on-chain      │                       │
│              │   - Proof (256 bytes)    │                       │
│              │   - Public inputs        │                       │
│              └────────────┬─────────────┘                       │
│                           │                                     │
│                           ▼                                     │
│              ┌──────────────────────────┐                       │
│              │   Solana Devnet          │                       │
│              │   - Deploy VK account    │                       │
│              │   - Verify proof on-chain│                       │
│              └──────────────────────────┘                       │
└─────────────────────────────────────────────────────────────────┘
```

### Key Components

| Component | Purpose |
|-----------|---------|
| **AcornParser** | Parses JavaScript functions to AST |
| **NoirGenerator** | Converts AST to Noir circuit code |
| **@noir-lang/noir_wasm** | Compiles Noir to ACIR bytecode |
| **ArkworksWasm** | Rust/WASM module for Groth16 proving |
| **SolanaFormatter** | Formats proofs for Solana verification |

### Proof System: Groth16

IZI-NOIR uses **Groth16**, a zkSNARK proving system with:

- **Proof size**: 256 bytes (constant, regardless of circuit complexity)
- **Verification**: O(1) - very fast on-chain verification
- **Trusted setup**: Per-circuit setup generates Proving Key (PK) and Verifying Key (VK)

### R1CS (Rank-1 Constraint System)

Internally, circuits are represented as R1CS constraints:

```
A × B = C

For: secret * secret == expected
R1CS: w_secret × w_secret = w_expected
```

The SDK generates R1CS directly from circuit parameters for optimal performance

---

## Quick Start with CLI

The fastest way to get started is using the `create-izi-noir` CLI.

### Create a New Project

```bash
npx create-izi-noir my-zk-project
cd my-zk-project
```

### Build and Test

```bash
npm run build    # Compile circuits
npm test         # Generate and verify proofs
```

### Generated Project Structure

```
my-zk-project/
├── circuits/              # Your circuit source files
│   ├── balance-proof.ts   # Example: prove balance >= threshold
│   ├── age-proof.ts       # Example: prove age >= minimum
│   └── index.ts
├── generated/             # Compiled circuit artifacts
├── scripts/
│   └── test-proof.ts      # Test script
├── izi-noir.config.ts     # Build configuration
└── package.json
```

### Write Your First Circuit

Edit `circuits/my-circuit.ts`:

```typescript
export function myCircuit(
  [expected]: [number],    // public input
  [secret]: [number]       // private input
): void {
  assert(secret * secret === expected);
}
```

Run `npm run build` to compile, then `npm test` to verify.

For full CLI documentation, see the [CLI Guide](./CLI_GUIDE.md).

---

## Installation

### Using CLI (Recommended)

```bash
npx create-izi-noir my-project
```

See [CLI Guide](./CLI_GUIDE.md) for all options.

### Manual Installation

```bash
npm install @izi-noir/sdk
```

### Requirements

- Node.js 22.12.0 or higher
- For browser apps: Vite recommended (handles WASM)

### Browser Setup (Vite)

```typescript
// main.ts
import initNoirC from "@noir-lang/noirc_abi";
import initACVM from "@noir-lang/acvm_js";
import acvm from "@noir-lang/acvm_js/web/acvm_js_bg.wasm?url";
import noirc from "@noir-lang/noirc_abi/web/noirc_abi_wasm_bg.wasm?url";
import { markWasmInitialized } from "@izi-noir/sdk";

// Initialize WASM before using IziNoir
await Promise.all([initACVM(fetch(acvm)), initNoirC(fetch(noirc))]);
markWasmInitialized();
```

---

## Understanding ZK Proofs

### Public vs Private Inputs

- **Public inputs**: Everyone can see these (the verifier needs them)
- **Private inputs**: Only you know these (the prover's secret)

```typescript
// Public: minimum age requirement (18)
// Private: actual birth year (1990)

([minAge], [birthYear, currentYear]) => {
  assert(currentYear - birthYear >= minAge);
}
```

The proof confirms "this person is at least 18" without revealing they were born in 1990.

### What Makes a Valid Proof?

A proof is valid when:
1. All `assert()` statements pass
2. The arithmetic is correct
3. The private inputs satisfy the public constraints

---

## Writing Circuits

### Basic Structure

```typescript
([publicInput1, publicInput2, ...], [privateInput1, privateInput2, ...]) => {
  // Your logic here
  assert(condition);
}
```

### Variable Types

All values in IZI-NOIR are **Field elements** (large integers modulo a prime). This means:

- No floating point numbers
- Division rounds down (integer division)
- Negative numbers wrap around

```typescript
// Good
let x = 42;
let result = a + b * c;

// Won't work as expected
let half = 5 / 2;  // = 2, not 2.5
```

### Mutability

By default, variables are immutable. Use the `mut_` prefix for mutable variables:

```typescript
// Immutable (cannot reassign)
let x = 5;
// x = 10; // ERROR!

// Mutable (can reassign)
let mut_sum = 0;
mut_sum = mut_sum + 1;  // OK
```

### Supported Operations

| Operation | Example | Notes |
|-----------|---------|-------|
| Assertion | `assert(x == y)` | Must be true for valid proof |
| Equality | `x == y`, `x != y` | |
| Arithmetic | `+`, `-`, `*`, `/`, `%` | Integer only |
| Comparison | `<`, `>`, `<=`, `>=` | |
| Conditionals | `if/else`, `? :` | |
| Loops | `for (let i=0; i<n; i++)` | Fixed bounds only |
| Arrays | `[a, b, c]`, `arr[i]`, `arr.length` | Fixed size |

### What's NOT Supported

- Objects, classes, methods
- Dynamic arrays (size must be known at compile time)
- Async/await
- String operations
- Closures, higher-order functions

---

## Generating Proofs

### Method 1: Using IziNoir Class (Recommended)

```typescript
import { IziNoir, Provider } from '@izi-noir/sdk';

// 1. Initialize with a proving backend
const izi = await IziNoir.init({ provider: Provider.Arkworks });

// 2. Compile your circuit
await izi.compile(`
  fn main(secret: Field, expected: pub Field) {
    assert(secret * secret == expected);
  }
`);

// 3. Generate a proof
const proof = await izi.prove({ secret: '10', expected: '100' });

// 4. Verify locally
const verified = await izi.verify(proof.proof, proof.publicInputs);
console.log('Valid:', verified);
```

### Method 2: Using createProof Helper (JS → Noir)

```typescript
import { createProof } from '@izi-noir/sdk';

const result = await createProof(
  [100],     // Public inputs
  [10],      // Private inputs
  ([expected], [secret]) => {
    assert(secret * secret == expected);
  }
);

console.log('Valid:', result.verified);
console.log('Generated Noir:', result.noirCode);
```

### Choosing a Proving Backend

| Backend | Proof System | Proof Size | Environment | Use Case |
|---------|--------------|------------|-------------|----------|
| **Arkworks** | Groth16 | 256 bytes | Browser + Node.js | Solana on-chain |
| **Sunspot** | Groth16 | 256 bytes | Node.js only | Solana on-chain (CLI-based) |
| **Barretenberg** | UltraPlonk | ~2 KB | Browser + Node.js | Development, testing |

```typescript
// For Solana deployment (Groth16, browser-compatible)
const izi = await IziNoir.init({
  provider: Provider.Arkworks,
  chain: Chain.Solana,
  network: Network.Devnet
});

// For Solana deployment (Groth16, Node.js with CLI tools)
const izi = await IziNoir.init({
  provider: Provider.Sunspot,
  chain: Chain.Solana,
  network: Network.Devnet
});

// For development/testing (faster compilation)
const izi = await IziNoir.init({ provider: Provider.Barretenberg });
```

**Arkworks vs Sunspot:**
- **Arkworks**: 100% WASM, works in browser and Node.js, recommended for web apps
- **Sunspot**: Uses `nargo` and `sunspot` CLI binaries, Node.js only, useful for CI/CD pipelines

Both generate Groth16 proofs compatible with Solana on-chain verification.

---

## Chain Targeting

When deploying proofs to a blockchain, use the `chain` option to automatically format proofs for that chain.

### Solana Integration

```typescript
import { IziNoir, Provider, Chain } from '@izi-noir/sdk';

// Initialize with Solana chain targeting
const izi = await IziNoir.init({
  provider: Provider.Arkworks,
  chain: Chain.Solana
});

// Compile (includes trusted setup - generates PK and VK)
const { verifyingKey } = await izi.compile(noirCode);
console.log('VK available:', izi.vk);  // VK available immediately after compile

// Prove (uses cached PK, fast)
const proof = await izi.prove({ secret: '10', expected: '100' });

// proof is SolanaProofData with:
// - proof.proof.bytes      → 256-byte Groth16 proof
// - proof.verifyingKey     → VK formatted for Solana program
// - proof.publicInputs.hex → Field elements as hex strings
// - proof.accountSize      → Required account size
// - proof.estimatedRent    → Rent in lamports
```

### Offchain Mode

Without a chain, proofs are returned in raw format:

```typescript
// No chain = offchain mode
const iziOffchain = await IziNoir.init({ provider: Provider.Arkworks });

await iziOffchain.compile(noirCode);
const rawProof = await iziOffchain.prove({ secret: '10', expected: '100' });

// rawProof is ProofData with:
// - rawProof.proof          → Raw proof bytes
// - rawProof.publicInputs   → String array of public inputs

// Verify locally
const verified = await iziOffchain.verify(rawProof.proof, rawProof.publicInputs);
```

---

## Verifying Proofs

### On-Chain Verification (Solana)

```typescript
import { IziNoir, Provider, Chain } from '@izi-noir/sdk';

// 1. Initialize with Solana chain targeting
const izi = await IziNoir.init({
  provider: Provider.Arkworks,
  chain: Chain.Solana
});

// 2. Compile and generate proof (automatically formatted for Solana)
await izi.compile(noirCode);
const solanaProof = await izi.prove({ secret: '10', expected: '100' });

// solanaProof is SolanaProofData with:
// - solanaProof.verifyingKey.bytes  → VK for on-chain storage
// - solanaProof.proof.bytes         → 256-byte Groth16 proof
// - solanaProof.publicInputs.bytes  → Public inputs as byte arrays
// - solanaProof.accountSize         → Required VK account size
// - solanaProof.estimatedRent       → Rent in lamports

// 3. Deploy and verify using your Solana wallet
// See the interactive demo for a complete example
```

### Local Verification (Off-Chain)

For backend verification without Solana:

```typescript
import { IziNoir, Provider } from '@izi-noir/sdk';

// 1. Initialize without chain (off-chain mode)
const izi = await IziNoir.init({ provider: Provider.Arkworks });

// 2. Compile and prove
await izi.compile(noirCode);
const proof = await izi.prove({ secret: '10', expected: '100' });

// 3. Verify locally
const isValid = await izi.verify(proof.proof, proof.publicInputs);
console.log('Proof valid:', isValid);
```

### Using createProof Helper

The simplest way to generate and verify proofs:

```typescript
import { createProof } from '@izi-noir/sdk';

const result = await createProof(
  [100],     // Public inputs
  [10],      // Private inputs
  ([expected], [secret]) => {
    assert(secret * secret == expected);
  }
);

// Result includes:
console.log('Verified:', result.verified);     // true if proof is valid
console.log('Noir code:', result.noirCode);    // Generated Noir circuit
console.log('Proof:', result.proof);           // Proof bytes
```

---

## Deploying to Solana

### Overview

Deploying a ZK proof to Solana involves two steps:

1. **Deploy VK**: Store the Verifying Key in a Solana account
2. **Verify Proof**: Submit the proof for on-chain verification

### Using the Simplified SDK API

The SDK provides one-liner methods for deploy and verify:

```typescript
import { IziNoir, Provider, Chain, Network } from '@izi-noir/sdk';
import { useWallet } from '@solana/wallet-adapter-react';

// Get wallet from adapter
const { publicKey, sendTransaction } = useWallet();

// 1. Initialize with network configuration
const izi = await IziNoir.init({
  provider: Provider.Arkworks,
  chain: Chain.Solana,
  network: Network.Devnet  // or Network.Mainnet, Network.Testnet
});

// 2. Compile (includes trusted setup, generates VK)
const { verifyingKey } = await izi.compile(noirCode);
console.log('VK ready:', izi.vk !== undefined);  // true

// 3. Generate proof (uses cached PK, fast)
await izi.prove({ secret: '10', expected: '100' });

// 4. Deploy VK in one line
const { vkAccount, signature } = await izi.deploy({ publicKey, sendTransaction });
console.log('VK deployed at:', vkAccount);

// 5. Verify on-chain in one line
const { verified } = await izi.verifyOnChain({ publicKey, sendTransaction });
console.log('Verified:', verified);

// Access explorer URLs
import { getExplorerTxUrl, getExplorerAccountUrl } from '@izi-noir/sdk';
console.log('View VK:', getExplorerAccountUrl(Network.Devnet, vkAccount));
console.log('View TX:', getExplorerTxUrl(Network.Devnet, signature));
```

### Network Configuration

The SDK supports multiple Solana networks:

```typescript
import { Network, NETWORK_CONFIG } from '@izi-noir/sdk';

// Available networks
Network.Devnet      // For development/testing
Network.Testnet     // For staging
Network.Mainnet     // For production
Network.Localnet    // For local development

// Each network has pre-configured:
// - RPC URL
// - Program ID
// - Explorer URL
console.log(NETWORK_CONFIG[Network.Devnet]);
```

### What Happens On-Chain

1. **VK Account Creation**: A new Solana account is created to store the Verifying Key
2. **VK Initialization**: The VK bytes are written to the account
3. **Proof Verification**: The on-chain verifier checks the proof against the VK
4. **Result**: Transaction succeeds if proof is valid, fails otherwise

**Note**: Always test on devnet first. You'll need SOL for transaction fees and rent.

---

## Common Patterns

### Age Verification

Prove you're over a certain age without revealing your actual age.

```typescript
import { createProof } from '@izi-noir/sdk';

const result = await createProof(
  [18],           // Minimum age (public)
  [1990, 2024],   // Birth year, current year (private)
  ([minAge], [birthYear, currentYear]) => {
    assert(currentYear - birthYear >= minAge);
  }
);

console.log('Verified:', result.verified);
// Proof shows: "I am at least 18 years old"
// Without revealing: actual birth year
```

### Balance Proof

Prove you have at least a certain amount without revealing your exact balance.

```typescript
const result = await createProof(
  [100],   // Minimum required (public)
  [500],   // Actual balance (private)
  ([minimum], [balance]) => {
    assert(balance >= minimum);
  }
);

// Proof shows: "I have at least 100"
// Without revealing: actual balance of 500
```

### Range Proof

Prove a value is within a range without revealing the exact value.

```typescript
const result = await createProof(
  [18, 65],  // Min and max age (public)
  [35],      // Actual age (private)
  ([min, max], [value]) => {
    assert(value >= min);
    assert(value <= max);
  }
);

// Proof shows: "My value is between 18 and 65"
// Without revealing: the exact value of 35
```

### Knowledge Proof (Square Root)

Prove you know a number whose square equals a public value.

```typescript
const result = await createProof(
  [100],  // Target value (public)
  [10],   // Secret (private)
  ([expected], [secret]) => {
    assert(secret * secret == expected);
  }
);

// Proof shows: "I know the square root of 100"
// Without revealing: that the answer is 10
```

### Sum Verification

Prove that hidden values sum to a known total.

```typescript
const result = await createProof(
  [100],           // Expected sum (public)
  [25, 25, 30, 20], // Individual values (private)
  ([expectedSum], [a, b, c, d]) => {
    let arr = [a, b, c, d];
    let mut_sum = 0;
    for (let i = 0; i < 4; i++) {
      mut_sum = mut_sum + arr[i];
    }
    assert(mut_sum == expectedSum);
  }
);

// Proof shows: "I have 4 values that sum to 100"
// Without revealing: the individual values
```

---

## Troubleshooting

### "WASM not initialized"

```typescript
// Make sure to initialize WASM before using IziNoir
await Promise.all([initACVM(fetch(acvm)), initNoirC(fetch(noirc))]);
markWasmInitialized();

// Then create IziNoir instance
const izi = await IziNoir.init({ ... });
```

### "Assertion failed"

Your private inputs don't satisfy the constraints. Double-check:
- Are your inputs the correct type (numbers, not strings)?
- Does the math work out?
- Are there edge cases (division by zero, overflow)?

```typescript
// Debug by checking manually
const minAge = 18;
const birthYear = 1990;
const currentYear = 2024;
console.log('Age:', currentYear - birthYear);  // Should be >= minAge
```

### "Circuit too complex"

If compilation takes forever or fails:
- Reduce loop iterations
- Simplify nested conditionals
- Break into smaller sub-circuits

### "Transaction failed"

For Solana transactions:
- Ensure you have enough SOL for rent (~0.003 SOL for VK account)
- Verify the VK account is properly initialized before verifying
- Check that your wallet is connected and has sufficient balance

### "Proof verification failed"

- Make sure you're using the same circuit for proving and verification
- Check that public inputs match exactly
- Verify the proof wasn't corrupted in transit

---

## Next Steps

- **Try the Demo**: Visit the [interactive demo](https://izi-noir.dev/demo) to see it in action
- **Read the SDK README**: [packages/sdk/README.md](../packages/sdk/README.md) for API details
- **Explore the Source**: The SDK is open source at [github.com/izi-noir/izi-noir](https://github.com/izi-noir/izi-noir)
- **Run Tests**: `npm test` in the SDK package to see proof generation in action
