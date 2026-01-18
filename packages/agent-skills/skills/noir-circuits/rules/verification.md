# Proof Verification Rules

## On-Chain Verification

1. **Proof Format**
   - Use serialized proof bytes
   - Include public inputs separately

2. **Verification Steps**
   - Deserialize proof
   - Validate public inputs
   - Call verifier

## Solana Integration

```rust
pub fn verify_proof(ctx: Context<VerifyProof>, proof: Vec<u8>, public_inputs: Vec<u8>) -> Result<()> {
    // 1. Deserialize and validate inputs
    let inputs = PublicInputs::try_from_slice(&public_inputs)?;

    // 2. Verify proof (implementation depends on verifier)
    let is_valid = verify_noir_proof(&proof, &inputs)?;

    require!(is_valid, ErrorCode::InvalidProof);

    Ok(())
}
```

## Security Considerations

1. **Nullifier Tracking**: Prevent double-spending
2. **Input Validation**: Verify all public inputs
3. **Proof Freshness**: Consider replay attacks
4. **Error Handling**: Don't leak private information
