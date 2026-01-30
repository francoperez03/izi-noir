# Solana Integration Guide

> Complete guide to verifying ZK proofs on Solana

This guide covers the end-to-end flow of generating proofs with the IZI-NOIR SDK and verifying them on-chain using the Solana program.

## Overview

### Why Groth16 on Solana?

| Proof System | Proof Size | Solana Compatibility |
|--------------|------------|---------------------|
| UltraHonk (Barretenberg) | ~16 KB | Too large for transactions |
| Groth16 (Arkworks) | 256 bytes | Optimal for on-chain |
| PLONK | ~1-2 KB | Possible but larger |

Groth16 produces the smallest proofs, making it ideal for Solana's transaction size limits.

### System Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Off-Chain (Browser/Node.js)                         │
│                                                                              │
│   ┌────────────┐    ┌────────────┐    ┌────────────┐    ┌────────────┐     │
│   │   Write    │    │  Compile   │    │   Prove    │    │   Format   │     │
│   │  Circuit   │───▶│   Noir     │───▶│  Groth16   │───▶│ for Solana │     │
│   │   (JS)     │    │  (WASM)    │    │  (WASM)    │    │            │     │
│   └────────────┘    └────────────┘    └────────────┘    └────────────┘     │
│                                                                │             │
└────────────────────────────────────────────────────────────────│─────────────┘
                                                                 │
                                                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                             On-Chain (Solana)                                │
│                                                                              │
│   ┌────────────┐    ┌────────────┐    ┌────────────┐    ┌────────────┐     │
│   │  Init VK   │    │   Store    │    │   Verify   │    │  Success   │     │
│   │  Account   │───▶│    VK      │───▶│   Proof    │───▶│    or      │     │
│   │            │    │            │    │            │    │   Fail     │     │
│   └────────────┘    └────────────┘    └────────────┘    └────────────┘     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Prerequisites

### Quick Setup with CLI

The fastest way to get started:

```bash
npx create-izi-noir my-solana-zk-app --template balance-proof
cd my-solana-zk-app
npm run build && npm test
```

See [CLI Guide](./CLI_GUIDE.md) for more options.

### Manual SDK Setup

```bash
npm install @izi-noir/sdk @coral-xyz/anchor @solana/web3.js
```

### Solana Environment

```bash
# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Install Anchor CLI
cargo install --git https://github.com/coral-xyz/anchor anchor-cli

# Configure for devnet
solana config set --url devnet
```

## Step-by-Step Integration

### Step 1: Write Your Circuit

```typescript
// circuit.ts
const noirCode = `
fn main(
    // Private inputs (not revealed)
    secret: Field,

    // Public inputs (visible on-chain)
    expected: pub Field
) {
    // Prove: secret² == expected
    assert(secret * secret == expected);
}
`;
```

Or use JavaScript transpilation:

```typescript
const circuit = ([expected], [secret]) => {
  assert(secret * secret == expected);
};
```

### Step 2: Initialize SDK with Arkworks

```typescript
import { IziNoir, Provider } from '@izi-noir/sdk';

// Arkworks provider generates Groth16 proofs
const izi = await IziNoir.init({ provider: Provider.Arkworks });
```

### Step 3: Compile the Circuit

```typescript
const circuit = await izi.compile(noirCode);

// Or with JavaScript transpilation
import { createArkworksWasmContainer, CreateProofUseCase } from '@izi-noir/sdk';

const deps = createArkworksWasmContainer();
const useCase = new CreateProofUseCase(deps);
```

### Step 4: Generate Proof with Chain Targeting

```typescript
import { IziNoir, Provider, Chain, Network } from '@izi-noir/sdk';

// Initialize with Solana chain targeting
const izi = await IziNoir.init({
  provider: Provider.Arkworks,
  chain: Chain.Solana,
  network: Network.Devnet  // or Network.Mainnet, Network.Testnet
});

// Compile includes trusted setup (generates PK and VK)
const { verifyingKey } = await izi.compile(noirCode);
console.log('VK available:', izi.vk !== undefined);  // true - VK ready after compile

// Generate proof (uses cached PK, fast)
const proof = await izi.prove({
  secret: '10',      // Private input (hidden)
  expected: '100'    // Public input (on-chain)
});
console.log('Network:', izi.network);
```

### Step 5: Deploy VK to Solana (One-Liner)

Using the simplified SDK API with a wallet adapter:

```typescript
import { useWallet } from '@solana/wallet-adapter-react';

// Get wallet from adapter
const { publicKey, sendTransaction } = useWallet();

// Deploy VK in one line
const { vkAccount, signature, explorerUrl } = await izi.deploy({
  publicKey,
  sendTransaction
});

console.log('VK deployed at:', vkAccount);
console.log('View on explorer:', explorerUrl);
```

### Step 6: Verify Proof On-Chain (One-Liner)

```typescript
// Verify the proof on-chain
const result = await izi.verifyOnChain({
  publicKey,
  sendTransaction
});

console.log('Verified:', result.verified);
console.log('TX:', result.signature);
```

### Step 7: Access Explorer URLs

```typescript
import { getExplorerTxUrl, getExplorerAccountUrl, Network } from '@izi-noir/sdk';

// Get explorer URLs
const txUrl = getExplorerTxUrl(Network.Devnet, result.signature);
const accountUrl = getExplorerAccountUrl(Network.Devnet, vkAccount);
```

## Complete Example (Simplified API)

```typescript
import { IziNoir, Provider, Chain, Network } from '@izi-noir/sdk';
import { useWallet } from '@solana/wallet-adapter-react';

async function main() {
  // Get wallet from adapter
  const { publicKey, sendTransaction } = useWallet();

  // 1. Initialize SDK with Solana chain targeting
  const izi = await IziNoir.init({
    provider: Provider.Arkworks,
    chain: Chain.Solana,
    network: Network.Devnet
  });

  // 2. Compile circuit
  await izi.compile(`
    fn main(secret: Field, expected: pub Field) {
      assert(secret * secret == expected);
    }
  `);

  // 3. Generate proof
  await izi.prove({
    secret: '10',
    expected: '100'
  });

  // 4. Deploy VK (one line)
  const { vkAccount, signature } = await izi.deploy({
    publicKey,
    sendTransaction
  });
  console.log('VK deployed:', vkAccount);

  // 5. Verify on-chain (one line)
  const { verified } = await izi.verifyOnChain({
    publicKey,
    sendTransaction
  });
  console.log('Verified:', verified);
}

main().catch(console.error);
```

## Low-Level API (Advanced)

For more control over transaction building, use `SolanaTransactionBuilder`:

```typescript
import { SolanaTransactionBuilder } from '@izi-noir/sdk';
import { Connection, Keypair, Transaction, PublicKey } from '@solana/web3.js';

// Create builder
const builder = new SolanaTransactionBuilder({
  programId: 'EYhRED7EuMyyVjx57aDXUD9h6ArnEKng64qtz8999KrS',
  computeUnits: 400_000
});

// Get proof data after calling prove() with Chain.Solana
const deployData = izi.getDeployData();
const vkKeypair = Keypair.generate();

// Build instructions
const { initVk, verifyProof, computeBudget, rentLamports } =
  builder.buildInitAndVerifyInstructions(
    deployData.proofData,
    vkKeypair.publicKey.toBase58(),
    wallet.publicKey.toBase58(),
    wallet.publicKey.toBase58()
  );

// Create and send transaction manually
const tx = new Transaction();
tx.add(/* convert instructions to TransactionInstruction */);
// ... sign and send
```

## SolanaProofData Format

When using `chain: Chain.Solana`, the `prove()` method returns `SolanaProofData` formatted for direct use with the Solana program:

```typescript
interface SolanaProofData {
  verifyingKey: {
    // Base64 encoded VK for storage/logging
    base64: string;

    // Raw bytes for init_vk_from_bytes instruction
    bytes: Uint8Array;

    // Number of public inputs
    nrPublicInputs: number;
  };

  proof: {
    // Base64 encoded proof
    base64: string;

    // Raw 256-byte proof (A || B || C)
    bytes: Uint8Array;
  };

  publicInputs: {
    // Hex-encoded field elements
    hex: string[];

    // 32-byte big-endian field elements
    bytes: Uint8Array[];
  };

  // Calculated account size for VK storage
  accountSize: number;

  // Estimated rent in lamports
  estimatedRent: number;
}
```

### VK Bytes Format

```
┌─────────────────────────────────────────────────────────────────┐
│                    Verifying Key Layout                          │
├────────────┬────────────┬────────────┬────────────┬────────────┤
│  alpha_g1  │  beta_g2   │  gamma_g2  │  delta_g2  │   k[0..n]  │
│  64 bytes  │ 128 bytes  │ 128 bytes  │ 128 bytes  │ 64×(n+1)   │
└────────────┴────────────┴────────────┴────────────┴────────────┘
```

### Proof Bytes Format

```
┌─────────────────────────────────────────────────────────────────┐
│                     Proof Layout (256 bytes)                     │
├─────────────────────┬─────────────────────┬─────────────────────┤
│      A (G1)         │       B (G2)        │       C (G1)        │
│     64 bytes        │     128 bytes       │      64 bytes       │
└─────────────────────┴─────────────────────┴─────────────────────┘
```

## Account Size and Rent

### Size Calculation

```
Account Size = 493 + (nrPublicInputs + 1) × 64 bytes

Fixed overhead:
- Discriminator: 8 bytes
- Authority: 32 bytes
- nr_pubinputs: 1 byte
- alpha_g1: 64 bytes
- beta_g2: 128 bytes
- gamma_g2: 128 bytes
- delta_g2: 128 bytes
- Vec header: 4 bytes
Total fixed: 493 bytes

Variable:
- k elements: (nrPublicInputs + 1) × 64 bytes
```

### Rent Estimates

| Public Inputs | Account Size | Rent (~) |
|---------------|--------------|----------|
| 1 | 621 bytes | 0.0051 SOL |
| 2 | 685 bytes | 0.0056 SOL |
| 4 | 813 bytes | 0.0066 SOL |
| 8 | 1069 bytes | 0.0087 SOL |
| 16 | 1581 bytes | 0.0128 SOL |

## Integration Patterns

### Pattern 1: One VK Per Circuit

Best for applications with a single, known circuit:

```typescript
// Deploy VK once
const vkAccount = await initializeVk(circuit);

// Verify many proofs using same VK
for (const proof of proofs) {
  await verifyProof(vkAccount, proof);
}
```

### Pattern 2: Dynamic Circuits

Best for applications supporting multiple circuits:

```typescript
// Store VK pubkeys by circuit hash
const vkRegistry: Map<string, PublicKey> = new Map();

async function getOrCreateVk(circuitHash: string, vkData: Uint8Array) {
  if (!vkRegistry.has(circuitHash)) {
    const vkAccount = await initializeVk(vkData);
    vkRegistry.set(circuitHash, vkAccount);
  }
  return vkRegistry.get(circuitHash)!;
}
```

### Pattern 3: PDA-Based VK Storage

Use Program Derived Addresses for deterministic VK accounts:

```typescript
const [vkPda, bump] = PublicKey.findProgramAddressSync(
  [Buffer.from('vk'), circuitId.toBuffer()],
  programId
);
```

## Use Case Examples

### Private Token Transfer

Prove sufficient balance without revealing amount:

```typescript
const noirCode = `
fn main(
    actual_balance: Field,     // private - real balance
    transfer_amount: pub Field // public - amount to transfer
) {
    assert(actual_balance >= transfer_amount);
}
`;

// Prove balance >= 100 without revealing actual balance
// (Assumes izi was initialized with chain: Chain.Solana)
await izi.prove({
  actual_balance: '500',    // Hidden: user has 500
  transfer_amount: '100'    // Public: transferring 100
});

// Deploy and verify
const { vkAccount } = await izi.deploy(wallet);
const { verified } = await izi.verifyOnChain(wallet);
```

### Age Verification

Prove age without revealing birthdate:

```typescript
const noirCode = `
fn main(
    birth_year: Field,        // private - actual birth year
    current_year: pub Field,  // public - current year
    min_age: pub Field        // public - minimum age required
) {
    assert(current_year - birth_year >= min_age);
}
`;

// Prove age >= 21 without revealing birth year
await izi.prove({
  birth_year: '1990',     // Hidden
  current_year: '2024',   // Public
  min_age: '21'           // Public
});

// Deploy and verify on-chain
await izi.deploy(wallet);
await izi.verifyOnChain(wallet);
```

### Credential Verification

Prove membership without revealing identity:

```typescript
const noirCode = `
fn main(
    member_id: Field,         // private - actual member ID
    merkle_proof: [Field; 8], // private - membership proof
    merkle_root: pub Field    // public - known root
) {
    let computed_root = compute_merkle_root(member_id, merkle_proof);
    assert(computed_root == merkle_root);
}
`;
```

## Compute Unit Considerations

### Typical CU Usage

| Operation | Compute Units |
|-----------|---------------|
| init_vk_from_bytes | ~5,000 |
| verify_proof (1 input) | ~200,000 |
| verify_proof (4 inputs) | ~300,000 |
| verify_proof (8 inputs) | ~400,000 |

### Optimization Tips

1. **Minimize Public Inputs** - Each input adds CU cost
2. **Batch Verifications** - Consider aggregation for multiple proofs
3. **Priority Fees** - Use priority fees during congestion
4. **Compute Budget** - Request appropriate CU budget

```typescript
import { ComputeBudgetProgram } from '@solana/web3.js';

const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
  units: 400_000
});

const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
  microLamports: 1
});

await program.methods
  .verifyProof(proofBytes, publicInputs)
  .accounts({ vkAccount })
  .preInstructions([modifyComputeUnits, addPriorityFee])
  .rpc();
```

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `ProofVerificationFailed` | Invalid proof | Check inputs match circuit |
| `InvalidPublicInputsCount` | Wrong input count | Verify input array length |
| `TooManyPublicInputs` | > 16 inputs | Reduce public inputs |
| `InvalidProofSize` | Proof not 256 bytes | Check proof generation |

### Debugging Tips

1. **Local Verification First**
   ```typescript
   // Verify locally before on-chain
   const isValid = await izi.verify(proof.bytes, publicInputs);
   console.log('Local verification:', isValid);
   ```

2. **Check Input Format**
   ```typescript
   // Public inputs must be 32-byte big-endian
   console.log('Input length:', publicInput.length); // Should be 32
   ```

3. **Simulate Transaction**
   ```typescript
   const sim = await program.methods
     .verifyProof(proofBytes, publicInputs)
     .accounts({ vkAccount })
     .simulate();
   console.log('Simulation logs:', sim.logs);
   ```

## Security Considerations

### Proof Replay

The verifier is stateless - the same proof can be verified multiple times. If replay prevention is needed, add a nonce:

```typescript
const noirCode = `
fn main(
    secret: Field,
    nonce: pub Field,     // Unique per-verification
    expected: pub Field
) {
    assert(secret * secret == expected);
}
`;
```

Track used nonces on-chain or in application state.

### VK Authority

Only the authority can close a VK account. Ensure authority is:
- A secure multisig for production
- Your application's program (via CPI) for programmatic control

### Input Validation

Always validate public inputs before verification:
- Check value ranges
- Verify input count matches circuit
- Sanitize user-provided data

## Troubleshooting

### "Proof verification failed"

1. Ensure inputs match exactly what was used in proof generation
2. Check field element encoding (32-byte big-endian)
3. Verify VK was initialized with correct circuit parameters

### "Account data too small"

VK account wasn't allocated enough space. Recalculate:
```typescript
const size = 493 + (nrPublicInputs + 1) * 64;
```

### "Transaction too large"

VK initialization may exceed transaction size. Use `init_vk` with parsed components instead of raw bytes for large VKs.

## Next Steps

- [SDK Documentation](../packages/sdk/README.md) - Full API reference
- [Solana Contracts](../packages/solana-contracts/README.md) - Program details
- [Architecture Guide](./ARCHITECTURE.md) - Technical deep-dive
