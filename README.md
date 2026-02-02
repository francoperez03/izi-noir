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

### Create a new project

```bash
npx create-izi-noir my-zk-app
cd my-zk-app
npm install
```

### Basic proof generation

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

### Using the IziNoir class

```typescript
import { IziNoir, Provider, Chain, Network } from '@izi-noir/sdk';

// Initialize with Solana chain for on-chain verification
const izi = await IziNoir.init({
  provider: Provider.Arkworks,
  chain: Chain.Solana,
  network: Network.Devnet
});

// Compile and prove
await izi.compile(`fn main(secret: Field, expected: pub Field) {
  assert(secret * secret == expected);
}`);

const proof = await izi.prove({ secret: '10', expected: '100' });
const verified = await izi.verify(proof.proof.bytes, ['100']);
```

## Packages

| Package | Version | Description |
|---------|---------|-------------|
| [@izi-noir/sdk](./packages/sdk) | 0.1.18 | Core SDK - JS to Noir transpiler with multiple proving backends |
| [create-izi-noir](./packages/create-izi-noir) | 0.2.23 | CLI scaffolding tool to create new projects |
| [arkworks-groth16-wasm](./packages/arkworks-groth16-wasm) | - | Rust→WASM bindings for Groth16 proving |
| [solana-contracts](./packages/solana-contracts) | - | Anchor program for on-chain Groth16 verification |
| [frontend](./packages/frontend) | - | Demo web application |
| [agent-skills](./packages/agent-skills) | - | AI agent skills for Claude Code |

## Multi-Entry Exports

The SDK provides specialized entry points for different use cases:

```typescript
// Default - includes IziNoir, providers, utilities
import { IziNoir, Provider } from '@izi-noir/sdk';

// Barretenberg provider only (~16KB proofs, browser + Node.js)
import { Barretenberg } from '@izi-noir/sdk/barretenberg';

// Arkworks provider only (256-byte Groth16 proofs)
import { ArkworksWasm } from '@izi-noir/sdk/arkworks';

// Sunspot provider (Node.js only, pre-compiled circuits)
import { Sunspot } from '@izi-noir/sdk/sunspot';

// Solana utilities (transaction builder, VK deployment)
import { SolanaTransactionBuilder, VkDeploymentManager } from '@izi-noir/sdk/solana';
```

## Proving Backends

| Backend | Proof Size | Environment | Best For |
|---------|------------|-------------|----------|
| **Barretenberg** | ~16 KB | Browser + Node.js | Development, fast iteration |
| **Arkworks** | ~256 bytes | Browser + Node.js | Solana on-chain verification |
| **Sunspot** | ~324 bytes | Node.js only | Pre-compiled production circuits |

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

## API Reference

### IziNoir Class

The main entry point for ZK proof generation.

```typescript
import { IziNoir, Provider, Chain, Network } from '@izi-noir/sdk';

// Initialize
const izi = await IziNoir.init({
  provider: Provider.Arkworks,  // Arkworks, Barretenberg, or Sunspot
  chain: Chain.Solana,          // Optional: enables chain-specific formatting
  network: Network.Devnet       // Devnet, Testnet, Mainnet, or Localnet
});

// Compile circuit (performs trusted setup, VK available after)
const { circuit, verifyingKey } = await izi.compile(noirCode);

// Generate proof
const proof = await izi.prove({ secret: '10', expected: '100' });

// Verify locally
const verified = await izi.verify(proof.proof.bytes, ['100']);

// Deploy VK to Solana
const { vkAccount, signature } = await izi.deploy(wallet);

// Verify on-chain
const result = await izi.verifyOnChain(wallet);

// Get deployment data for custom transaction building
const deployData = izi.getDeployData();
```

### CircuitRegistry

System for registering and versioning circuits with metadata.

```typescript
import { CircuitRegistry, defineCircuit } from '@izi-noir/sdk';

// Quick registration with defineCircuit()
const balanceCheck = defineCircuit({
  name: 'balance-check',
  version: '1.0.0',
  description: 'Proves balance >= minimum without revealing actual balance',
  publicInputs: [{ name: 'minimum', type: 'Field' }],
  privateInputs: [{ name: 'balance', type: 'Field' }],
  tags: ['finance', 'privacy'],
}, ([minimum], [balance]) => {
  assert(balance >= minimum);
});

// Or use the registry directly
const registry = new CircuitRegistry();

registry.register({
  name: 'age-verify',
  version: '1.0.0',
  publicInputs: [{ name: 'minAge', type: 'Field' }],
  privateInputs: [{ name: 'birthYear', type: 'Field' }],
  jsCircuit: ([minAge], [birthYear]) => {
    assert(2025 - birthYear >= minAge);
  },
});

// Get circuit
const circuit = registry.get('age-verify');
const allVersions = registry.getVersions('age-verify');

// Search by tag
const financeCircuits = registry.findByTag('finance');

// Generate documentation
const docs = registry.generateDocs('balance-check');
```

### OffchainVerifier

Verify proofs without blockchain transactions. Includes Express middleware.

```typescript
import { OffchainVerifier, createVerifierMiddleware, batchVerify } from '@izi-noir/sdk';
import express from 'express';

const verifier = new OffchainVerifier({
  compiler: async (jsCircuit) => { /* compile circuit */ },
  verifier: async (circuit, proof, publicInputs) => { /* verify */ }
});

// Register circuits
await verifier.registerCircuit('age-check', {
  jsCircuit: ([minAge], [birthYear]) => {
    assert(2025 - birthYear >= minAge);
  }
});

// Verify directly
const result = await verifier.verify({
  circuitName: 'age-check',
  proof: proofBytes,
  publicInputs: [18],
});

// Use as Express middleware
const app = express();
app.use(express.json());
app.post('/verify', createVerifierMiddleware(verifier));

// Batch verification
const batchResult = await batchVerify(verifier, [
  { circuitName: 'age-check', proof: proof1, publicInputs: [18] },
  { circuitName: 'balance-check', proof: proof2, publicInputs: [100] },
]);
console.log(`Verified: ${batchResult.verifiedCount}/${batchResult.results.length}`);
```

### VkDeploymentManager

Idempotent deployment of verifying keys to Solana.

```typescript
import { VkDeploymentManager, createNodeVkDeploymentManager } from '@izi-noir/sdk';

// Create manager (Node.js)
const manager = await createNodeVkDeploymentManager({
  network: 'devnet',
  keypairPath: '~/.config/solana/id.json',
});

// Deploy VK (idempotent - won't redeploy if already exists)
const result = await manager.ensureDeployed({
  circuitId: 'balance-check',
  verifyingKey: vkBytes,
  nrPublicInputs: 1,
});

console.log(`VK Account: ${result.vkAccount}`);
console.log(`Was deployed: ${result.wasDeployed}`);
```

### SolanaTransactionBuilder

Build Solana transactions without Anchor dependency.

```typescript
import { SolanaTransactionBuilder, IZI_NOIR_PROGRAM_ID } from '@izi-noir/sdk';

const builder = new SolanaTransactionBuilder({
  programId: IZI_NOIR_PROGRAM_ID,
  computeUnits: 400_000,
});

// Build init VK instruction
const { initVk, computeBudget, rentLamports, accountSize } =
  builder.buildInitAndVerifyInstructions(
    proofData,
    vkAccountPubkey,
    authority,
    payer
  );

// Build verify proof instruction
const verifyInstruction = builder.buildVerifyProofInstruction(
  proofBytes,
  publicInputsBytes,
  { vkAccount }
);
```

### R1csBuilder

Generate R1CS constraints dynamically for advanced use cases.

```typescript
import { R1csBuilder } from '@izi-noir/sdk';

const builder = new R1csBuilder();

// Add constraints programmatically
builder.addConstraint({
  a: [{ variable: 'x', coefficient: 1n }],
  b: [{ variable: 'y', coefficient: 1n }],
  c: [{ variable: 'z', coefficient: 1n }],
});

const r1cs = builder.build();
```

### Build Configuration

Configure the SDK build with `defineConfig()`:

```typescript
// izi-noir.config.ts
import { defineConfig } from '@izi-noir/sdk';

export default defineConfig({
  circuits: ['./circuits/*.ts'],
  outputDir: './build',
  provider: 'arkworks',
});
```

## Solana Integration

### Network Configuration

```typescript
import { Network, NETWORK_CONFIG, getExplorerTxUrl } from '@izi-noir/sdk';

// Available networks
Network.Devnet   // https://api.devnet.solana.com
Network.Testnet  // https://api.testnet.solana.com
Network.Mainnet  // https://api.mainnet-beta.solana.com
Network.Localnet // http://localhost:8899

// Get network config
const config = NETWORK_CONFIG[Network.Devnet];
console.log(config.rpcUrl);    // RPC endpoint
console.log(config.programId); // IZI-NOIR program ID

// Get explorer URLs
const txUrl = getExplorerTxUrl(Network.Devnet, signature);
```

### Complete Deploy + Verify Flow

```typescript
import { IziNoir, Provider, Chain, Network } from '@izi-noir/sdk';
import { useWallet } from '@solana/wallet-adapter-react';

const wallet = useWallet();

// 1. Initialize with Solana chain
const izi = await IziNoir.init({
  provider: Provider.Arkworks,
  chain: Chain.Solana,
  network: Network.Devnet,
});

// 2. Compile and prove
await izi.compile(noirCode);
const proof = await izi.prove(inputs);

// 3. Deploy VK to Solana
const { vkAccount, signature: deploySig } = await izi.deploy(wallet);
console.log(`VK deployed: ${vkAccount}`);

// 4. Verify on-chain
const { verified, signature: verifySig } = await izi.verifyOnChain(wallet);
console.log(`Verified on-chain: ${verified}`);
```

### Account Costs

| Account Type | Size | Rent (SOL) |
|--------------|------|------------|
| VK Account (1 public input) | ~520 bytes | ~0.005 SOL |
| VK Account (3 public inputs) | ~648 bytes | ~0.006 SOL |
| VK Account (10 public inputs) | ~1096 bytes | ~0.013 SOL |

### WalletAdapter Interface

```typescript
interface WalletAdapter {
  publicKey: { toBase58(): string };
  sendTransaction(
    transaction: Transaction,
    connection: Connection
  ): Promise<string>;
}
```

Compatible with `@solana/wallet-adapter-react` wallets.

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

### Complete Solana Verification

```typescript
import { IziNoir, Provider, Chain, Network } from '@izi-noir/sdk';

const izi = await IziNoir.init({
  provider: Provider.Arkworks,
  chain: Chain.Solana,
  network: Network.Devnet,
});

// Compile circuit
await izi.compile(`
  fn main(balance: Field, minimum: pub Field) {
    assert(balance >= minimum);
  }
`);

// Generate proof
const proof = await izi.prove({ balance: '1000', minimum: '500' });

// Deploy and verify
const { vkAccount } = await izi.deploy(wallet);
const { verified } = await izi.verifyOnChain(wallet);

console.log(`Proof verified on Solana: ${verified}`);
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

## Requirements

- **Node.js 22.12.0+** (required for Noir WASM)
- **Rust + Solana CLI + Anchor CLI** (for Solana contracts only)

## Installation

```bash
# Create a new project (recommended)
npx create-izi-noir my-zk-app

# Or install in existing project
npm install @izi-noir/sdk
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

- [User Guide](./docs/USER_GUIDE.md) - Getting started and usage patterns
- [CLI Guide](./docs/CLI_GUIDE.md) - Using create-izi-noir and CLI tools
- [SDK Documentation](./packages/sdk/README.md) - API reference and usage guide
- [Architecture Guide](./docs/ARCHITECTURE.md) - Technical deep-dive
- [Solana Integration](./docs/SOLANA_INTEGRATION.md) - On-chain verification guide
- [Solana Contracts](./packages/solana-contracts/README.md) - Anchor program docs
- [Frontend Demo](./packages/frontend/README.md) - Web app documentation

## Project Structure

```
izi-noir/
├── packages/
│   ├── sdk/                  # @izi-noir/sdk - Core transpiler and provers
│   ├── create-izi-noir/      # CLI scaffolding tool
│   ├── arkworks-groth16-wasm/# Rust WASM bindings for Groth16
│   ├── frontend/             # Vite + React demo application
│   ├── solana-contracts/     # Anchor programs for on-chain verification
│   └── agent-skills/         # AI agent skills
├── tooling/                  # Shared TypeScript, ESLint, Prettier configs
└── docs/                     # Extended documentation
```

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## License

MIT
