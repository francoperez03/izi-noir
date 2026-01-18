//! Custom errors for the IZI-NOIR Groth16 verifier program.

use anchor_lang::prelude::*;

#[error_code]
pub enum VerifierError {
    #[msg("Proof verification failed")]
    ProofVerificationFailed,

    #[msg("Invalid number of public inputs")]
    InvalidPublicInputsCount,

    #[msg("Public inputs count exceeds maximum allowed")]
    TooManyPublicInputs,

    #[msg("Invalid proof size - expected 256 bytes")]
    InvalidProofSize,

    #[msg("Invalid verifying key data")]
    InvalidVerifyingKey,

    #[msg("G1 multiplication failed during input preparation")]
    G1MulFailed,

    #[msg("G1 addition failed during input preparation")]
    G1AddFailed,

    #[msg("BN254 pairing operation failed")]
    PairingFailed,

    #[msg("Invalid G1 point encoding")]
    InvalidG1Point,

    #[msg("Invalid G2 point encoding")]
    InvalidG2Point,

    #[msg("Verifying key account data too small")]
    VkAccountTooSmall,
}
