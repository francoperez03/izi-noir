use anchor_lang::prelude::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod izi_noir {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }

    pub fn verify_proof(ctx: Context<VerifyProof>, proof: Vec<u8>) -> Result<()> {
        msg!("Verifying proof of length: {}", proof.len());
        // TODO: Implement Noir proof verification
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}

#[derive(Accounts)]
pub struct VerifyProof {}
