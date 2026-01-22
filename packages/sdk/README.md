# @izi-noir/sdk

> Privacy for Solana in one SDK

Write ZK circuits in JavaScript, generate proofs in the browser, verify on Solana. No cryptography PhD required.

## Why IZI-NOIR?

**Traditional ZK workflow (4+ tools, new language):**
```
Write .nr file → nargo compile → nargo execute → bb prove → bb write_verifier → Deploy manually
```

**IZI-NOIR workflow (one SDK, JavaScript):**
```
Write JS function → izi.createProof() → izi.proveForSolana() → builder.deploy() → Done
```

| Traditional Noir | IZI-NOIR |
|-----------------|----------|
| Learn a new language | Write JavaScript you know |
| 4+ CLI tools | One SDK |
| Manual deployment | Automated helpers |
| Complex setup | `npm install` and go |

## Installation

```bash
npm install @izi-noir/sdk
```

## Quick Start

### 1. Write a Circuit in JavaScript

```typescript
import { IziNoir, Provider } from '@izi-noir/sdk';

const izi = await IziNoir.init({ provider: Provider.Arkworks });

// Write your circuit as a JavaScript function
await izi.compile(`
  fn main(secret: Field, expected: pub Field) {
    assert(secret * secret == expected);
  }
`);

// Or use the transpiler (JS → Noir → compile)
const result = await createProof(
  [100],           // public inputs (what everyone sees)
  [10],            // private inputs (your secret)
  ([expected], [secret]) => {
    assert(secret * secret == expected);  // Prove you know the square root
  }
);

console.log('Verified:', result.verified);
```

### 2. Generate Solana-Ready Proofs

```typescript
const solanaProof = await izi.proveForSolana({
  secret: '10',
  expected: '100'
});

// 256-byte proof ready for on-chain verification
console.log('Proof size:', solanaProof.proof.bytes.length, 'bytes');
console.log('Estimated rent:', solanaProof.estimatedRent, 'lamports');
```

### 3. Deploy and Verify On-Chain

```typescript
import { SolanaTransactionBuilder } from '@izi-noir/sdk';

const builder = new SolanaTransactionBuilder({ computeUnits: 400_000 });

// Build transactions for your wallet adapter
const { initVk, verifyProof, computeBudget } = builder.buildInitAndVerifyInstructions(
  solanaProof,
  vkKeypair.publicKey.toBase58(),
  wallet.publicKey.toBase58(),
  wallet.publicKey.toBase58()
);

// Send with your preferred wallet adapter
await sendTransaction([computeBudget, initVk, verifyProof]);
```

## Full Workflow Examples

### Age Verification (Prove you're over 18 without revealing your age)

```typescript
import { IziNoir, Provider, CircuitRegistry, VkDeploymentManager } from '@izi-noir/sdk';

// 1. Register your circuit
const registry = new CircuitRegistry();
registry.register({
  name: 'age-check',
  version: '1.0.0',
  description: 'Proves age >= minimum without revealing actual age',
  jsCircuit: ([minAge], [birthYear, currentYear]) => {
    assert(currentYear - birthYear >= minAge);
  },
  publicInputs: [{ name: 'minAge', type: 'Field', description: 'Minimum age required' }],
  privateInputs: [
    { name: 'birthYear', type: 'Field', description: 'Year of birth' },
    { name: 'currentYear', type: 'Field', description: 'Current year' }
  ],
});

// 2. Create a proof
const izi = await IziNoir.init({ provider: Provider.Arkworks });
const circuit = registry.get('age-check');

await izi.compile(`
  fn main(minAge: pub Field, birthYear: Field, currentYear: Field) {
    assert(currentYear - birthYear >= minAge);
  }
`);

const proof = await izi.proveForSolana({
  minAge: '18',
  birthYear: '1990',
  currentYear: '2024'
});

// 3. Deploy to Solana
const deploymentManager = new VkDeploymentManager({
  network: 'devnet',
});

const deployment = await deploymentManager.ensureDeployed({
  circuitName: 'age-check',
  solanaProofData: proof,
  authority: wallet.publicKey.toBase58(),
  payer: wallet.publicKey.toBase58(),
  sendTransaction: async (instructions, signers) => {
    // Your wallet adapter logic here
    return txSignature;
  },
});

console.log('VK deployed at:', deployment.vkAccount);
```

### Backend API Verification (Off-chain)

```typescript
import express from 'express';
import { OffchainVerifier, createVerifierMiddleware } from '@izi-noir/sdk';

const app = express();
app.use(express.json());

// Create verifier with your compiled circuit
const verifier = new OffchainVerifier({
  verifier: async (circuit, proof, publicInputs) => {
    // Use your proving system's verify method
    return await provingSystem.verify(circuit, proof, publicInputs);
  }
});

// Register circuits
await verifier.registerCircuit('api-auth', {
  jsCircuit: ([apiKeyHash], [apiKey]) => {
    // In real use, you'd hash the apiKey and compare
    assert(apiKey == apiKeyHash);
  }
});

// Add verification endpoint
app.post('/verify', createVerifierMiddleware(verifier));

// Client sends: { circuitName: 'api-auth', proof: '0x...', publicInputs: [12345] }
// Server responds: { verified: true, verificationTimeMs: 42 }
```

## Proving Backends

| Provider | Proof Size | Environment | Best For |
|----------|------------|-------------|----------|
| **Arkworks** | ~256 bytes | Browser + Node.js | Solana on-chain verification |
| **Barretenberg** | ~16 KB | Browser + Node.js | Development, fast iteration |
| **Sunspot** | ~324 bytes | Node.js only | Pre-compiled production circuits |

### Arkworks (Recommended for Solana)

Groth16 proofs that fit in a single Solana transaction.

```typescript
const izi = await IziNoir.init({ provider: Provider.Arkworks });
const solanaProof = await izi.proveForSolana(inputs);
// solanaProof.proof.bytes.length === 256
```

### Barretenberg (Development)

Faster proving, larger proofs. Great for testing.

```typescript
const izi = await IziNoir.init({ provider: Provider.Barretenberg });
const { proof, verified } = await izi.createProof(noirCode, inputs);
```

## New APIs

### SolanaTransactionBuilder

Build Solana transactions without Anchor dependency.

```typescript
import { SolanaTransactionBuilder } from '@izi-noir/sdk';

const builder = new SolanaTransactionBuilder({
  programId: 'EYhRED7EuMyyVjx57aDXUD9h6ArnEKng64qtz8999KrS', // optional
  computeUnits: 400_000,
  priorityFee: 1000, // microLamports per CU
});

// Build individual instructions
const initInstruction = builder.buildInitVkInstruction(solanaProof, {
  vkAccount: vkPubkey,
  authority: authorityPubkey,
  payer: payerPubkey,
});

const verifyInstruction = builder.buildVerifyProofInstruction(
  solanaProof.proof.bytes,
  solanaProof.publicInputs.bytes,
  { vkAccount: vkPubkey }
);

// Or build everything at once
const { initVk, verifyProof, computeBudget, rentLamports } =
  builder.buildInitAndVerifyInstructions(
    solanaProof,
    vkPubkey,
    authorityPubkey,
    payerPubkey
  );
```

### VkDeploymentManager

Idempotent deployment with local persistence.

```typescript
import { VkDeploymentManager } from '@izi-noir/sdk';

const manager = new VkDeploymentManager({
  network: 'devnet',
  configDir: './.izi-noir', // stores deployment state
});

// Won't redeploy if same circuit already deployed
const result = await manager.ensureDeployed({
  circuitName: 'my-circuit',
  solanaProofData,
  authority: wallet.publicKey.toBase58(),
  payer: wallet.publicKey.toBase58(),
  sendTransaction: myWalletSendFn,
});

if (result.deployed) {
  console.log('Deployed new VK:', result.vkAccount);
} else {
  console.log('Using existing VK:', result.vkAccount);
}

// Save state for next time
await manager.save();
```

### CircuitRegistry

Name, version, and document your circuits.

```typescript
import { CircuitRegistry, defineCircuit } from '@izi-noir/sdk';

const registry = new CircuitRegistry();

// Full registration
registry.register({
  name: 'balance-proof',
  version: '1.0.0',
  description: 'Proves balance >= threshold',
  jsCircuit: ([threshold], [balance]) => { assert(balance >= threshold); },
  publicInputs: [{ name: 'threshold', type: 'Field' }],
  privateInputs: [{ name: 'balance', type: 'Field' }],
  tags: ['finance', 'defi'],
  author: 'Your Name',
});

// Quick registration with defineCircuit
const circuit = defineCircuit(
  { name: 'quick-check', version: '1.0.0', publicInputs: [], privateInputs: [] },
  ([], [secret]) => { assert(secret != 0); }
);

// Lookup
const myCircuit = registry.get('balance-proof');
const allVersions = registry.getVersions('balance-proof');
const financeCircuits = registry.findByTag('finance');

// Generate docs
console.log(registry.generateDocs('balance-proof'));
```

### OffchainVerifier

Verify proofs without blockchain transactions.

```typescript
import { OffchainVerifier, batchVerify } from '@izi-noir/sdk';

const verifier = new OffchainVerifier({
  compiler: async (jsCircuit) => { /* compile circuit */ },
  verifier: async (circuit, proof, publicInputs) => { /* verify */ return true; },
});

// Single verification
const result = await verifier.verify({
  circuitName: 'my-circuit',
  proof: proofBytes,
  publicInputs: [123, 456],
});

// Batch verification
const batchResult = await batchVerify(verifier, [
  { circuitName: 'circuit-a', proof: proof1, publicInputs: [1] },
  { circuitName: 'circuit-b', proof: proof2, publicInputs: [2] },
]);

console.log(`Verified: ${batchResult.verifiedCount}/${batchResult.results.length}`);
```

## Writing Circuit Functions

### Function Signature

```typescript
([public1, public2, ...], [private1, private2, ...]) => {
  // assertions here
}
```

- **Public inputs**: Values everyone can see (e.g., minimum age requirement)
- **Private inputs**: Your secret values (e.g., actual birth year)

### Supported Operations

| JavaScript | Noir | Notes |
|------------|------|-------|
| `assert(cond)` | `assert(cond)` | Core constraint |
| `==` / `===` | `==` | Equality |
| `+`, `-`, `*`, `/`, `%` | Same | Arithmetic |
| `<`, `>`, `<=`, `>=` | Same | Comparison |
| `let x = 5` | `let x: Field = 5` | Immutable |
| `let mut_x = 5` | `let mut x: Field = 5` | Mutable (use `mut_` prefix) |
| `if/else` | Same | Conditionals |
| `for (let i=0; i<n; i++)` | Same | Fixed-bound loops |
| `[a, b, c]` | `[Field; 3]` | Fixed-size arrays |

### Examples

**Simple equality:**
```typescript
([expected], [secret]) => { assert(secret == expected); }
```

**Range proof:**
```typescript
([min, max], [value]) => {
  assert(value >= min);
  assert(value <= max);
}
```

**Sum verification:**
```typescript
([sum], [a, b, c]) => {
  let arr = [a, b, c];
  let mut_total = 0;
  for (let i = 0; i < 3; i++) {
    mut_total = mut_total + arr[i];
  }
  assert(mut_total == sum);
}
```

## Browser Usage (Vite)

```typescript
import initNoirC from "@noir-lang/noirc_abi";
import initACVM from "@noir-lang/acvm_js";
import acvm from "@noir-lang/acvm_js/web/acvm_js_bg.wasm?url";
import noirc from "@noir-lang/noirc_abi/web/noirc_abi_wasm_bg.wasm?url";
import { IziNoir, Provider, markWasmInitialized } from "@izi-noir/sdk";

// Initialize WASM first
await Promise.all([initACVM(fetch(acvm)), initNoirC(fetch(noirc))]);
markWasmInitialized();

// Now use IziNoir
const izi = await IziNoir.init({ provider: Provider.Arkworks });
```

## Type Reference

### SolanaProofData

```typescript
interface SolanaProofData {
  verifyingKey: {
    base64: string;
    bytes: Uint8Array;
    nrPublicInputs: number;
  };
  proof: {
    base64: string;
    bytes: Uint8Array;  // Always 256 bytes
  };
  publicInputs: {
    hex: string[];
    bytes: Uint8Array[];  // 32-byte big-endian field elements
  };
  accountSize: number;
  estimatedRent: number;  // Lamports for VK account
}
```

### InstructionData

```typescript
interface InstructionData {
  data: Uint8Array;
  programId: string;
  keys: Array<{
    pubkey: string;
    isSigner: boolean;
    isWritable: boolean;
  }>;
}
```

## Requirements

- Node.js 22.12.0+
- For Solana deployment: Solana CLI + Anchor CLI

## License

MIT
