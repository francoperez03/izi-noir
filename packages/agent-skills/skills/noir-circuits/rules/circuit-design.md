# Circuit Design Rules

## Structure

1. **Separate Public and Private Inputs**
   - Public inputs: data verified on-chain
   - Private inputs: hidden from verifier

2. **Minimize Computation**
   - Each operation adds constraints
   - Use efficient primitives when available

## Example Circuit

```noir
fn main(
    // Private inputs
    secret: Field,

    // Public inputs
    pub commitment: Field,
    pub nullifier: Field
) {
    // Verify commitment
    let computed_commitment = hash([secret]);
    assert(computed_commitment == commitment);

    // Verify nullifier derivation
    let computed_nullifier = hash([secret, 1]);
    assert(computed_nullifier == nullifier);
}
```

## Best Practices

1. Use standard hash functions (Poseidon, Pedersen)
2. Avoid loops with variable bounds
3. Keep circuits focused on single responsibility
4. Document all constraints and their purpose
