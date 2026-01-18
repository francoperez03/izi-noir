# Account Validation Rules

## Required Checks

1. **Owner Validation**
   - Always verify account owner matches expected program
   - Use `Account<'info, T>` wrapper for automatic validation

2. **Signer Validation**
   - Mark signing accounts with `Signer<'info>`
   - Validate authority for privileged operations

3. **PDA Validation**
   - Verify PDA seeds and bump
   - Use `seeds` and `bump` constraints in account macros

## Example

```rust
#[derive(Accounts)]
pub struct TransferTokens<'info> {
    #[account(mut)]
    pub from: Account<'info, TokenAccount>,

    #[account(mut)]
    pub to: Account<'info, TokenAccount>,

    pub authority: Signer<'info>,

    #[account(
        seeds = [b"config"],
        bump = config.bump,
    )]
    pub config: Account<'info, Config>,
}
```

## Common Mistakes to Avoid

- Missing signer checks on authority accounts
- Not validating PDA derivation
- Forgetting to mark mutable accounts with `mut`
- Not checking account ownership
