//! Account state definitions for the IZI-NOIR Groth16 verifier.
//!
//! The verifying key account stores all data needed to verify Groth16 proofs
//! for a specific circuit. The key is stored in the format compatible with
//! arkworks-groth16-wasm's gnark_compat module.

use anchor_lang::prelude::*;

/// Maximum number of public inputs supported.
/// This limit keeps compute units reasonable for on-chain verification.
pub const MAX_PUBLIC_INPUTS: usize = 16;

/// Size of a G1 point in bytes (uncompressed, big-endian)
pub const G1_SIZE: usize = 64;

/// Size of a G2 point in bytes (uncompressed, big-endian)
pub const G2_SIZE: usize = 128;

/// Size of a field element in bytes (big-endian)
pub const FIELD_SIZE: usize = 32;

/// Size of a Groth16 proof in bytes: A (G1) + B (G2) + C (G1)
pub const PROOF_SIZE: usize = 256;

/// Account discriminator size (8 bytes for Anchor accounts)
pub const DISCRIMINATOR_SIZE: usize = 8;

/// Fixed portion of the verifying key account:
/// - discriminator: 8 bytes
/// - authority: 32 bytes
/// - nr_pubinputs: 1 byte
/// - alpha_g1: 64 bytes
/// - beta_g2: 128 bytes
/// - gamma_g2: 128 bytes
/// - delta_g2: 128 bytes
/// - k length prefix: 4 bytes (Vec header in Borsh)
pub const VK_ACCOUNT_FIXED_SIZE: usize = DISCRIMINATOR_SIZE + 32 + 1 + G1_SIZE + G2_SIZE * 3 + 4;

/// Calculates the total account size for a given number of public inputs.
pub fn vk_account_size(nr_pubinputs: usize) -> usize {
    // k has (nr_pubinputs + 1) G1 elements
    VK_ACCOUNT_FIXED_SIZE + (nr_pubinputs + 1) * G1_SIZE
}

/// Verifying key account for Groth16 proof verification.
///
/// Stores all parameters needed to verify proofs for a specific circuit.
/// The format is compatible with arkworks-groth16-wasm's gnark_compat module.
///
/// ## Layout
///
/// | Field       | Size           | Description                          |
/// |-------------|----------------|--------------------------------------|
/// | authority   | 32 bytes       | Authority that can update/close      |
/// | nr_pubinputs| 1 byte         | Number of public inputs              |
/// | alpha_g1    | 64 bytes       | α element in G1                      |
/// | beta_g2     | 128 bytes      | β element in G2                      |
/// | gamma_g2    | 128 bytes      | γ element in G2                      |
/// | delta_g2    | 128 bytes      | δ element in G2                      |
/// | k           | (n+1) × 64     | Linear combination keys (G1 points)  |
#[account]
pub struct VerifyingKeyAccount {
    /// Authority that can update or close this account.
    pub authority: Pubkey,

    /// Number of public inputs for this circuit.
    /// The k vector will have (nr_pubinputs + 1) elements.
    pub nr_pubinputs: u8,

    /// α element in G1 (64 bytes, big-endian, uncompressed).
    pub alpha_g1: [u8; G1_SIZE],

    /// β element in G2 (128 bytes, big-endian, uncompressed).
    /// Format: [x.c0, x.c1, y.c0, y.c1] where Fq2 = c0 + c1*u
    pub beta_g2: [u8; G2_SIZE],

    /// γ element in G2 (128 bytes, big-endian, uncompressed).
    pub gamma_g2: [u8; G2_SIZE],

    /// δ element in G2 (128 bytes, big-endian, uncompressed).
    pub delta_g2: [u8; G2_SIZE],

    /// Linear combination keys for public inputs (G1 points).
    /// Length is (nr_pubinputs + 1).
    /// k[0] is the base point, k[1..] correspond to public inputs.
    pub k: Vec<[u8; G1_SIZE]>,
}

impl VerifyingKeyAccount {
    /// Validates that the verifying key data is well-formed.
    pub fn validate(&self) -> bool {
        // Check that k has the correct number of elements
        self.k.len() == (self.nr_pubinputs as usize) + 1
            && (self.nr_pubinputs as usize) <= MAX_PUBLIC_INPUTS
    }
}

/// Proof data passed in instruction_data.
///
/// This struct represents a Groth16 proof in the format produced by
/// arkworks-groth16-wasm's gnark_compat module.
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Groth16Proof {
    /// A element in G1 (64 bytes, big-endian, uncompressed)
    pub a: [u8; G1_SIZE],

    /// B element in G2 (128 bytes, big-endian, uncompressed)
    pub b: [u8; G2_SIZE],

    /// C element in G1 (64 bytes, big-endian, uncompressed)
    pub c: [u8; G1_SIZE],
}

impl Groth16Proof {
    /// Parse a proof from a 256-byte slice.
    pub fn from_bytes(bytes: &[u8]) -> Option<Self> {
        if bytes.len() != PROOF_SIZE {
            return None;
        }

        let mut a = [0u8; G1_SIZE];
        let mut b = [0u8; G2_SIZE];
        let mut c = [0u8; G1_SIZE];

        a.copy_from_slice(&bytes[0..G1_SIZE]);
        b.copy_from_slice(&bytes[G1_SIZE..G1_SIZE + G2_SIZE]);
        c.copy_from_slice(&bytes[G1_SIZE + G2_SIZE..PROOF_SIZE]);

        Some(Self { a, b, c })
    }
}
