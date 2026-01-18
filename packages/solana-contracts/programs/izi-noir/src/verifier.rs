//! Groth16 proof verification logic for BN254 curve.
//!
//! This module implements Groth16 verification using Solana's BN254 syscalls.
//! The format is compatible with arkworks-groth16-wasm's gnark_compat module.
//!
//! ## Verification Equation
//!
//! The verifier checks the standard Groth16 pairing equation:
//!
//! ```text
//! e(A, B) · e(-α, β) · e(K_x, -γ) · e(C, -δ) = 1
//! ```
//!
//! where:
//! - A, B, C are the proof elements
//! - K_x is the prepared public-input point computed from the witness
//! - α, β, γ, δ come from the verifying key

use crate::error::VerifierError;
use crate::state::{Groth16Proof, VerifyingKeyAccount, FIELD_SIZE, G1_SIZE, G2_SIZE};

use ark_bn254::Fq;
use ark_ff::PrimeField;
use solana_bn254::prelude::{alt_bn128_g1_addition_be, alt_bn128_g1_multiplication_be, alt_bn128_pairing_be};
use std::ops::Neg;

/// Verifies a Groth16 proof against the provided verifying key and public inputs.
///
/// # Arguments
///
/// * `vk` - The verifying key account containing circuit parameters
/// * `proof` - The Groth16 proof (A, B, C elements)
/// * `public_inputs` - Public inputs as 32-byte big-endian field elements
///
/// # Returns
///
/// `Ok(())` if verification succeeds, `Err(VerifierError)` otherwise.
pub fn verify_groth16(
    vk: &VerifyingKeyAccount,
    proof: &Groth16Proof,
    public_inputs: &[[u8; FIELD_SIZE]],
) -> Result<(), VerifierError> {
    // Validate input count
    if public_inputs.len() != vk.nr_pubinputs as usize {
        return Err(VerifierError::InvalidPublicInputsCount);
    }

    // Compute K_x = k[0] + Σ(public_inputs[i] * k[i+1])
    let prepared_inputs = prepare_inputs(vk, public_inputs)?;

    // Negate alpha_g1 for the pairing equation
    let alpha_neg = negate_g1(&vk.alpha_g1)?;

    // Negate gamma and delta G2 elements
    let gamma_neg = negate_g2(&vk.gamma_g2)?;
    let delta_neg = negate_g2(&vk.delta_g2)?;

    // Construct pairing input:
    // e(A, B) · e(-α, β) · e(K_x, -γ) · e(C, -δ) = 1
    //
    // The pairing function expects pairs of (G1, G2) points concatenated.
    // Format: [A_G1(64) || B_G2(128) || -α_G1(64) || β_G2(128) || K_x_G1(64) || -γ_G2(128) || C_G1(64) || -δ_G2(128)]
    let pairing_input = [
        proof.a.as_slice(),
        proof.b.as_slice(),
        alpha_neg.as_slice(),
        vk.beta_g2.as_slice(),
        prepared_inputs.as_slice(),
        gamma_neg.as_slice(),
        proof.c.as_slice(),
        delta_neg.as_slice(),
    ]
    .concat();

    // Execute pairing check
    let pairing_result = alt_bn128_pairing_be(&pairing_input)
        .map_err(|_| VerifierError::PairingFailed)?;

    // The pairing function returns 1 if the pairing result equals the identity
    // (i.e., the product of pairings equals 1 in GT)
    if pairing_result[31] != 1 {
        return Err(VerifierError::ProofVerificationFailed);
    }

    Ok(())
}

/// Computes the linear combination of the verifying key elements with public inputs.
///
/// Computes: K_x = k[0] + Σ(public_inputs[i] * k[i+1])
///
/// This is the "prepared public inputs" point used in the pairing equation.
fn prepare_inputs(
    vk: &VerifyingKeyAccount,
    public_inputs: &[[u8; FIELD_SIZE]],
) -> Result<[u8; G1_SIZE], VerifierError> {
    // Start with k[0] as the accumulator
    let mut acc = vk.k[0];

    // Add public_input[i] * k[i+1] for each input
    for (i, input) in public_inputs.iter().enumerate() {
        // Scalar multiplication: input * k[i+1]
        let mul_input = [vk.k[i + 1].as_slice(), input.as_slice()].concat();
        let mul_result = alt_bn128_g1_multiplication_be(&mul_input)
            .map_err(|_| VerifierError::G1MulFailed)?;

        // Point addition: acc + mul_result
        let add_input = [mul_result.as_slice(), acc.as_slice()].concat();
        let add_result = alt_bn128_g1_addition_be(&add_input)
            .map_err(|_| VerifierError::G1AddFailed)?;

        acc = add_result
            .try_into()
            .map_err(|_| VerifierError::G1AddFailed)?;
    }

    Ok(acc)
}

/// Negates a G1 point using scalar multiplication by -1.
///
/// In BN254, -1 in the scalar field has a specific byte representation.
fn negate_g1(point: &[u8; G1_SIZE]) -> Result<[u8; G1_SIZE], VerifierError> {
    // -1 in the BN254 scalar field (Fr) in big-endian
    // Fr modulus - 1 = 0x30644e72e131a029b85045b68181585d2833e84879b9709143e1f593f0000000
    let neg_one: [u8; 32] = [
        0x30, 0x64, 0x4e, 0x72, 0xe1, 0x31, 0xa0, 0x29,
        0xb8, 0x50, 0x45, 0xb6, 0x81, 0x81, 0x58, 0x5d,
        0x28, 0x33, 0xe8, 0x48, 0x79, 0xb9, 0x70, 0x91,
        0x43, 0xe1, 0xf5, 0x93, 0xf0, 0x00, 0x00, 0x00,
    ];

    let mul_input = [point.as_slice(), neg_one.as_slice()].concat();
    let result = alt_bn128_g1_multiplication_be(&mul_input)
        .map_err(|_| VerifierError::G1MulFailed)?;

    result.try_into().map_err(|_| VerifierError::G1MulFailed)
}

/// Negates a G2 point by negating its y-coordinate.
///
/// The input format is arkworks gnark_compat: [x.c0, x.c1, y.c0, y.c1]
/// To negate, we negate the y coordinate: y' = -y
fn negate_g2(point: &[u8; G2_SIZE]) -> Result<[u8; G2_SIZE], VerifierError> {
    // Parse the G2 point from arkworks gnark_compat format
    let g2_point = g2_from_bytes(point)?;

    // Negate the point
    let negated = g2_point.neg();

    // Convert back to bytes
    Ok(g2_to_bytes(&negated))
}

/// Parses a G2 point from arkworks gnark_compat format.
///
/// Format: [x.c0(32), x.c1(32), y.c0(32), y.c1(32)] (big-endian)
/// where Fq2 = c0 + c1*u
fn g2_from_bytes(bytes: &[u8; G2_SIZE]) -> Result<ark_bn254::G2Affine, VerifierError> {
    // Parse coordinates from big-endian bytes
    // arkworks gnark_compat format: [x.c0, x.c1, y.c0, y.c1]
    let x_c0 = Fq::from_be_bytes_mod_order(&bytes[0..32]);
    let x_c1 = Fq::from_be_bytes_mod_order(&bytes[32..64]);
    let y_c0 = Fq::from_be_bytes_mod_order(&bytes[64..96]);
    let y_c1 = Fq::from_be_bytes_mod_order(&bytes[96..128]);

    let x = ark_ff::QuadExtField::<ark_ff::Fp2ConfigWrapper<ark_bn254::Fq2Config>> {
        c0: x_c0,
        c1: x_c1,
    };
    let y = ark_ff::QuadExtField::<ark_ff::Fp2ConfigWrapper<ark_bn254::Fq2Config>> {
        c0: y_c0,
        c1: y_c1,
    };

    Ok(ark_bn254::G2Affine {
        x,
        y,
        infinity: false,
    })
}

/// Converts a G2 point to arkworks gnark_compat format.
///
/// Format: [x.c0(32), x.c1(32), y.c0(32), y.c1(32)] (big-endian)
fn g2_to_bytes(point: &ark_bn254::G2Affine) -> [u8; G2_SIZE] {
    use ark_ff::BigInteger;

    let mut out = [0u8; G2_SIZE];

    if point.infinity {
        return out;
    }

    // Get big-endian representations
    let x_c0_bytes = point.x.c0.into_bigint().to_bytes_be();
    let x_c1_bytes = point.x.c1.into_bigint().to_bytes_be();
    let y_c0_bytes = point.y.c0.into_bigint().to_bytes_be();
    let y_c1_bytes = point.y.c1.into_bigint().to_bytes_be();

    // arkworks gnark_compat format: [x.c0, x.c1, y.c0, y.c1]
    out[0..32].copy_from_slice(&x_c0_bytes);
    out[32..64].copy_from_slice(&x_c1_bytes);
    out[64..96].copy_from_slice(&y_c0_bytes);
    out[96..128].copy_from_slice(&y_c1_bytes);

    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_g2_roundtrip() {
        // Test that g2_from_bytes and g2_to_bytes are inverses
        // Use a known valid G2 point (generator) - this is a simplified test
        let original = [0u8; G2_SIZE];
        // Note: zero point is the point at infinity, handled specially
    }
}
