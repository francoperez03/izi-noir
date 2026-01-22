# IZI-NOIR Solana Contracts

> Generic on-chain Groth16 verifier for Solana

An Anchor-based Solana program for verifying Groth16 zero-knowledge proofs on the BN254 curve. This program can verify proofs from any circuit without recompilation, by receiving the Verification Key (VK) as account data.

## Program ID

```
EYhRED7EuMyyVjx57aDXUD9h6ArnEKng64qtz8999KrS
```

## Overview

### Design Philosophy

The IZI-NOIR Solana program is **circuit-agnostic**:
- Store any circuit's verifying key in a Solana account
- Verify proofs using stored VK data
- No program recompilation needed for different circuits

### Key Features

- **256-byte proofs** - Standard Groth16 proof size
- **BN254 curve** - Uses Solana's native BN254 syscalls for efficient verification
- **Flexible VK storage** - Each circuit has its own VK account
- **Authority control** - VK accounts can only be closed by their authority

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        Client (Browser/Node.js)                   │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │              @izi-noir/sdk (Arkworks provider)             │   │
│  │   compile() → prove() → proveForSolana()                   │   │
│  └───────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
                              │
                              │ VK + Proof + Public Inputs
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                        Solana Blockchain                          │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │                   IZI-NOIR Program                         │   │
│  │                                                             │   │
│  │  ┌─────────────────┐    ┌─────────────────────────────┐   │   │
│  │  │  init_vk        │    │  VerifyingKeyAccount        │   │   │
│  │  │  init_vk_bytes  │───▶│  - authority                │   │   │
│  │  └─────────────────┘    │  - alpha_g1, beta_g2, ...   │   │   │
│  │                         │  - k[] (linear combo keys)  │   │   │
│  │  ┌─────────────────┐    └─────────────────────────────┘   │   │
│  │  │  verify_proof   │───▶ BN254 pairing check             │   │
│  │  └─────────────────┘    e(A,B)·e(-α,β)·e(Kx,-γ)·e(C,-δ)=1│   │
│  │                                                             │   │
│  │  ┌─────────────────┐                                       │   │
│  │  │  close_vk       │───▶ Return rent to authority         │   │
│  │  └─────────────────┘                                       │   │
│  └───────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

## Instructions

### `init_vk_from_bytes`

Initialize a verifying key account from raw bytes (recommended).

**Arguments:**
| Name | Type | Description |
|------|------|-------------|
| `nr_pubinputs` | `u8` | Number of public inputs (max 16) |
| `vk_bytes` | `Vec<u8>` | Raw VK in arkworks gnark format |

**VK Bytes Format:**
```
| alpha_g1 (64) | beta_g2 (128) | gamma_g2 (128) | delta_g2 (128) | k[0..n+1] (64 each) |
```

**Accounts:**
| Name | Type | Description |
|------|------|-------------|
| `vk_account` | `Account<VerifyingKeyAccount>` | Account being initialized |
| `authority` | `Signer` | Authority that can close this VK |
| `payer` | `Signer` | Pays for account creation |
| `system_program` | `Program<System>` | System program |

### `init_vk`

Initialize a verifying key account with parsed components.

**Arguments:**
| Name | Type | Description |
|------|------|-------------|
| `nr_pubinputs` | `u8` | Number of public inputs |
| `alpha_g1` | `[u8; 64]` | α element in G1 |
| `beta_g2` | `[u8; 128]` | β element in G2 |
| `gamma_g2` | `[u8; 128]` | γ element in G2 |
| `delta_g2` | `[u8; 128]` | δ element in G2 |
| `k` | `Vec<[u8; 64]>` | Linear combination keys (n+1 G1 points) |

### `verify_proof`

Verify a Groth16 proof against the stored verifying key.

**Arguments:**
| Name | Type | Description |
|------|------|-------------|
| `proof_bytes` | `Vec<u8>` | 256-byte proof (A \|\| B \|\| C) |
| `public_inputs` | `Vec<[u8; 32]>` | Public inputs as big-endian field elements |

**Accounts:**
| Name | Type | Description |
|------|------|-------------|
| `vk_account` | `Account<VerifyingKeyAccount>` | Read-only VK account |

**Returns:** `Ok(())` if proof is valid, error otherwise.

### `verify_proof_structured`

Same as `verify_proof` but accepts proof as structured data.

### `close_vk`

Close a VK account and return rent to the authority.

**Accounts:**
| Name | Type | Description |
|------|------|-------------|
| `vk_account` | `Account<VerifyingKeyAccount>` | Account to close |
| `authority` | `Signer` | Must match VK authority |

## Account Structures

### VerifyingKeyAccount

```rust
pub struct VerifyingKeyAccount {
    pub authority: Pubkey,        // 32 bytes - who can close
    pub nr_pubinputs: u8,         // 1 byte
    pub alpha_g1: [u8; 64],       // G1 point
    pub beta_g2: [u8; 128],       // G2 point
    pub gamma_g2: [u8; 128],      // G2 point
    pub delta_g2: [u8; 128],      // G2 point
    pub k: Vec<[u8; 64]>,         // (nr_pubinputs + 1) G1 points
}
```

**Account Size Calculation:**
```
Fixed: 8 (discriminator) + 32 (authority) + 1 (nr_pubinputs) +
       64 (alpha) + 128×3 (beta, gamma, delta) + 4 (Vec header) = 493 bytes

Variable: (nr_pubinputs + 1) × 64 bytes

Total: 493 + (nr_pubinputs + 1) × 64 bytes
```

| Public Inputs | Account Size | Estimated Rent |
|---------------|--------------|----------------|
| 1 | 621 bytes | ~0.005 SOL |
| 2 | 685 bytes | ~0.006 SOL |
| 4 | 813 bytes | ~0.007 SOL |
| 8 | 1069 bytes | ~0.009 SOL |
| 16 | 1581 bytes | ~0.013 SOL |

### Groth16Proof

```rust
pub struct Groth16Proof {
    pub a: [u8; 64],      // A element (G1) - 64 bytes
    pub b: [u8; 128],     // B element (G2) - 128 bytes
    pub c: [u8; 64],      // C element (G1) - 64 bytes
}
// Total: 256 bytes
```

## Integration with SDK

### Generate Solana-Ready Proof

```typescript
import { IziNoir, Provider } from '@izi-noir/sdk';

const izi = await IziNoir.init({ provider: Provider.Arkworks });

await izi.compile(`
  fn main(secret: Field, expected: pub Field) {
    assert(secret * secret == expected);
  }
`);

const solanaProof = await izi.proveForSolana({
  secret: '10',
  expected: '100'
});

// solanaProof contains:
// - verifyingKey.bytes: Uint8Array (raw VK)
// - verifyingKey.nrPublicInputs: number
// - proof.bytes: Uint8Array (256 bytes)
// - publicInputs.bytes: Uint8Array[] (32-byte field elements)
// - accountSize: number
// - estimatedRent: number
```

### Initialize VK Account

```typescript
import { Program } from '@coral-xyz/anchor';
import { Keypair, SystemProgram } from '@solana/web3.js';

const vkAccount = Keypair.generate();

await program.methods
  .initVkFromBytes(
    solanaProof.verifyingKey.nrPublicInputs,
    Buffer.from(solanaProof.verifyingKey.bytes)
  )
  .accounts({
    vkAccount: vkAccount.publicKey,
    authority: wallet.publicKey,
    payer: wallet.publicKey,
    systemProgram: SystemProgram.programId,
  })
  .signers([vkAccount])
  .rpc();
```

### Verify Proof On-Chain

```typescript
await program.methods
  .verifyProof(
    Buffer.from(solanaProof.proof.bytes),
    solanaProof.publicInputs.bytes.map(b => Array.from(b))
  )
  .accounts({
    vkAccount: vkAccount.publicKey,
  })
  .rpc();
```

### Close VK Account

```typescript
await program.methods
  .closeVk()
  .accounts({
    vkAccount: vkAccount.publicKey,
    authority: wallet.publicKey,
  })
  .rpc();
```

## Verification Flow

The program verifies the standard Groth16 pairing equation:

```
e(A, B) · e(-α, β) · e(Kx, -γ) · e(C, -δ) = 1
```

Where:
- **A, B, C** - Proof elements
- **α, β, γ, δ** - Verifying key parameters
- **Kx** - Prepared public inputs point: `k[0] + Σ(public_inputs[i] × k[i+1])`
- **e()** - Pairing operation on BN254

The verification uses Solana's native BN254 syscalls:
- `alt_bn128_pairing` - Efficient pairing checks
- G1 scalar multiplication and addition

## Error Codes

| Error | Code | Description |
|-------|------|-------------|
| `ProofVerificationFailed` | 6000 | Pairing check failed |
| `InvalidPublicInputsCount` | 6001 | Wrong number of public inputs |
| `TooManyPublicInputs` | 6002 | Exceeds max of 16 |
| `InvalidProofSize` | 6003 | Proof not 256 bytes |
| `InvalidVerifyingKey` | 6004 | Malformed VK data |
| `G1MulFailed` | 6005 | G1 multiplication failed |
| `G1AddFailed` | 6006 | G1 addition failed |
| `PairingFailed` | 6007 | Pairing syscall failed |

## Requirements

- Rust 1.70+
- Solana CLI 1.18+
- Anchor CLI 0.32+

## Build & Test

```bash
# Build the program
npm run build

# Or with Anchor directly
anchor build

# Run tests (requires local validator)
npm test

# Deploy to devnet
anchor deploy --provider.cluster devnet
```

## Project Structure

```
packages/solana-contracts/
├── programs/
│   └── izi-noir/
│       └── src/
│           ├── lib.rs         # Program instructions
│           ├── state.rs       # Account structures
│           ├── verifier.rs    # Groth16 verification logic
│           └── error.rs       # Error definitions
├── tests/
│   └── integration.ts         # Integration tests
├── Anchor.toml                # Anchor configuration
└── Cargo.toml                 # Rust dependencies
```

## Dependencies

```toml
[dependencies]
anchor-lang = "0.32"
ark-bn254 = "0.5"
ark-ff = "0.5"
ark-ec = "0.5"
solana-bn254 = "3.1"
```

## Limitations

- Maximum 16 public inputs (compute unit constraints)
- Proofs must be exactly 256 bytes
- VK must be in arkworks gnark-compatible format
- BN254 curve only (no BLS12-381)

## License

MIT
