//! gnark-compatible serialization.
//!
//! This module converts arkworks proofs and keys to the format expected
//! by gnark-verifier-solana for on-chain verification.
//!
//! Key differences between arkworks and gnark:
//! - Endianness: gnark uses big-endian, arkworks uses little-endian
//! - G1 points: 64 bytes uncompressed (32 bytes x, 32 bytes y)
//! - G2 points: 128 bytes uncompressed (64 bytes x, 64 bytes y)
//! - Field elements: 32 bytes big-endian

use ark_bn254::{Bn254, Fq, Fq2, Fr, G1Affine, G2Affine};
use ark_ec::AffineRepr;
use ark_ff::{BigInteger, PrimeField};
use ark_groth16::{Proof, VerifyingKey};

use crate::error::ArkworksError;

/// Size of a G1 point in gnark format (uncompressed)
pub const G1_SIZE: usize = 64;

/// Size of a G2 point in gnark format (uncompressed)
pub const G2_SIZE: usize = 128;

/// Size of a field element
pub const FIELD_SIZE: usize = 32;

/// Size of a Groth16 proof in gnark format
/// A (G1) + B (G2) + C (G1) = 64 + 128 + 64 = 256 bytes
pub const PROOF_SIZE: usize = 256;

/// Convert a G1 affine point to gnark format (64 bytes, big-endian, uncompressed)
pub fn g1_to_gnark(point: &G1Affine) -> [u8; G1_SIZE] {
    let mut bytes = [0u8; G1_SIZE];

    if point.is_zero() {
        return bytes;
    }

    // Get x and y coordinates (unwrap is safe for non-zero points)
    let x = point.x().unwrap();
    let y = point.y().unwrap();

    // Convert to big-endian bytes
    let x_bytes = fq_to_be_bytes(&x);
    let y_bytes = fq_to_be_bytes(&y);

    bytes[..32].copy_from_slice(&x_bytes);
    bytes[32..].copy_from_slice(&y_bytes);

    bytes
}

/// Convert gnark format to G1 affine point
pub fn g1_from_gnark(bytes: &[u8; G1_SIZE]) -> Result<G1Affine, ArkworksError> {
    if bytes.iter().all(|&b| b == 0) {
        return Ok(G1Affine::zero());
    }

    let x = fq_from_be_bytes(&bytes[..32])?;
    let y = fq_from_be_bytes(&bytes[32..])?;

    G1Affine::new(x, y)
        .try_into()
        .map_err(|_| ArkworksError::ParseError("Invalid G1 point".to_string()))
}

/// Convert a G2 affine point to gnark format (128 bytes, big-endian, uncompressed)
///
/// G2 points on BN254 have coordinates in Fq2 (quadratic extension)
/// gnark format: x.c0, x.c1, y.c0, y.c1 (each 32 bytes, big-endian)
pub fn g2_to_gnark(point: &G2Affine) -> [u8; G2_SIZE] {
    let mut bytes = [0u8; G2_SIZE];

    if point.is_zero() {
        return bytes;
    }

    // Get coordinates (unwrap is safe for non-zero points)
    let x = point.x().unwrap();
    let y = point.y().unwrap();

    // Fq2 = c0 + c1 * u
    // gnark uses: x.A0, x.A1, y.A0, y.A1 (where A0 = c0, A1 = c1)
    let x_c0_bytes = fq_to_be_bytes(&x.c0);
    let x_c1_bytes = fq_to_be_bytes(&x.c1);
    let y_c0_bytes = fq_to_be_bytes(&y.c0);
    let y_c1_bytes = fq_to_be_bytes(&y.c1);

    bytes[..32].copy_from_slice(&x_c0_bytes);
    bytes[32..64].copy_from_slice(&x_c1_bytes);
    bytes[64..96].copy_from_slice(&y_c0_bytes);
    bytes[96..].copy_from_slice(&y_c1_bytes);

    bytes
}

/// Convert gnark format to G2 affine point
pub fn g2_from_gnark(bytes: &[u8; G2_SIZE]) -> Result<G2Affine, ArkworksError> {
    if bytes.iter().all(|&b| b == 0) {
        return Ok(G2Affine::zero());
    }

    let x_c0 = fq_from_be_bytes(&bytes[..32])?;
    let x_c1 = fq_from_be_bytes(&bytes[32..64])?;
    let y_c0 = fq_from_be_bytes(&bytes[64..96])?;
    let y_c1 = fq_from_be_bytes(&bytes[96..])?;

    let x = Fq2::new(x_c0, x_c1);
    let y = Fq2::new(y_c0, y_c1);

    G2Affine::new(x, y)
        .try_into()
        .map_err(|_| ArkworksError::ParseError("Invalid G2 point".to_string()))
}

/// Convert Fq element to 32 bytes big-endian
fn fq_to_be_bytes(fq: &Fq) -> [u8; FIELD_SIZE] {
    let mut bytes = [0u8; FIELD_SIZE];
    let repr = fq.into_bigint();
    let le_bytes = repr.to_bytes_le();

    // Reverse to big-endian
    for (i, &b) in le_bytes.iter().enumerate() {
        if i < FIELD_SIZE {
            bytes[FIELD_SIZE - 1 - i] = b;
        }
    }

    bytes
}

/// Convert Fr element to 32 bytes big-endian
pub fn fr_to_be_bytes(fr: &Fr) -> [u8; FIELD_SIZE] {
    let mut bytes = [0u8; FIELD_SIZE];
    let repr = fr.into_bigint();
    let le_bytes = repr.to_bytes_le();

    // Reverse to big-endian
    for (i, &b) in le_bytes.iter().enumerate() {
        if i < FIELD_SIZE {
            bytes[FIELD_SIZE - 1 - i] = b;
        }
    }

    bytes
}

/// Convert 32 bytes big-endian to Fq element
fn fq_from_be_bytes(bytes: &[u8]) -> Result<Fq, ArkworksError> {
    if bytes.len() != FIELD_SIZE {
        return Err(ArkworksError::ParseError(format!(
            "Expected {} bytes, got {}",
            FIELD_SIZE,
            bytes.len()
        )));
    }

    // Convert from big-endian to little-endian
    let mut le_bytes = [0u8; FIELD_SIZE];
    for (i, &b) in bytes.iter().enumerate() {
        le_bytes[FIELD_SIZE - 1 - i] = b;
    }

    Fq::from_le_bytes_mod_order(&le_bytes)
        .try_into()
        .map_err(|_| ArkworksError::ParseError("Invalid Fq element".to_string()))
}

/// Convert 32 bytes big-endian to Fr element
pub fn fr_from_be_bytes(bytes: &[u8]) -> Result<Fr, ArkworksError> {
    if bytes.len() != FIELD_SIZE {
        return Err(ArkworksError::ParseError(format!(
            "Expected {} bytes, got {}",
            FIELD_SIZE,
            bytes.len()
        )));
    }

    // Convert from big-endian to little-endian
    let mut le_bytes = [0u8; FIELD_SIZE];
    for (i, &b) in bytes.iter().enumerate() {
        le_bytes[FIELD_SIZE - 1 - i] = b;
    }

    Fr::from_le_bytes_mod_order(&le_bytes)
        .try_into()
        .map_err(|_| ArkworksError::ParseError("Invalid Fr element".to_string()))
}

/// Convert arkworks Groth16 proof to gnark format (256 bytes)
///
/// Layout: A (G1, 64 bytes) || B (G2, 128 bytes) || C (G1, 64 bytes)
pub fn proof_to_gnark(proof: &Proof<Bn254>) -> Result<Vec<u8>, ArkworksError> {
    let mut bytes = Vec::with_capacity(PROOF_SIZE);

    bytes.extend_from_slice(&g1_to_gnark(&proof.a));
    bytes.extend_from_slice(&g2_to_gnark(&proof.b));
    bytes.extend_from_slice(&g1_to_gnark(&proof.c));

    Ok(bytes)
}

/// Convert gnark format proof to arkworks Proof
pub fn proof_from_gnark(bytes: &[u8]) -> Result<Proof<Bn254>, ArkworksError> {
    if bytes.len() != PROOF_SIZE {
        return Err(ArkworksError::ParseError(format!(
            "Invalid proof size: expected {}, got {}",
            PROOF_SIZE,
            bytes.len()
        )));
    }

    let a_bytes: [u8; G1_SIZE] = bytes[..G1_SIZE].try_into().unwrap();
    let b_bytes: [u8; G2_SIZE] = bytes[G1_SIZE..G1_SIZE + G2_SIZE].try_into().unwrap();
    let c_bytes: [u8; G1_SIZE] = bytes[G1_SIZE + G2_SIZE..].try_into().unwrap();

    let a = g1_from_gnark(&a_bytes)?;
    let b = g2_from_gnark(&b_bytes)?;
    let c = g1_from_gnark(&c_bytes)?;

    Ok(Proof { a, b, c })
}

/// Convert public inputs to gnark format (32 bytes per input, big-endian)
pub fn public_inputs_to_gnark(inputs: &[Fr]) -> Vec<u8> {
    let mut bytes = Vec::with_capacity(inputs.len() * FIELD_SIZE);
    for input in inputs {
        bytes.extend_from_slice(&fr_to_be_bytes(input));
    }
    bytes
}

/// Convert gnark format public inputs to Fr elements
pub fn public_inputs_from_gnark(bytes: &[u8]) -> Result<Vec<Fr>, ArkworksError> {
    if bytes.len() % FIELD_SIZE != 0 {
        return Err(ArkworksError::ParseError(format!(
            "Invalid public inputs size: {} is not a multiple of {}",
            bytes.len(),
            FIELD_SIZE
        )));
    }

    let mut inputs = Vec::new();
    for chunk in bytes.chunks(FIELD_SIZE) {
        inputs.push(fr_from_be_bytes(chunk)?);
    }
    Ok(inputs)
}

/// Convert arkworks verifying key to gnark-compatible format
///
/// gnark-verifier-solana expects:
/// - alpha (G1): 64 bytes
/// - beta (G2): 128 bytes
/// - gamma (G2): 128 bytes
/// - delta (G2): 128 bytes
/// - gamma_abc (array of G1): 64 bytes each
pub fn verifying_key_to_gnark(vk: &VerifyingKey<Bn254>) -> Result<Vec<u8>, ArkworksError> {
    let num_public_inputs = vk.gamma_abc_g1.len();
    let vk_size = G1_SIZE + G2_SIZE * 3 + G1_SIZE * num_public_inputs;

    let mut bytes = Vec::with_capacity(vk_size);

    // Alpha (G1)
    bytes.extend_from_slice(&g1_to_gnark(&vk.alpha_g1));

    // Beta (G2)
    bytes.extend_from_slice(&g2_to_gnark(&vk.beta_g2));

    // Gamma (G2)
    bytes.extend_from_slice(&g2_to_gnark(&vk.gamma_g2));

    // Delta (G2)
    bytes.extend_from_slice(&g2_to_gnark(&vk.delta_g2));

    // Gamma_ABC (array of G1)
    for point in &vk.gamma_abc_g1 {
        bytes.extend_from_slice(&g1_to_gnark(point));
    }

    Ok(bytes)
}

/// Convert gnark-compatible format to arkworks verifying key
pub fn verifying_key_from_gnark(bytes: &[u8], num_public_inputs: usize) -> Result<VerifyingKey<Bn254>, ArkworksError> {
    let expected_size = G1_SIZE + G2_SIZE * 3 + G1_SIZE * (num_public_inputs + 1);

    if bytes.len() != expected_size {
        return Err(ArkworksError::ParseError(format!(
            "Invalid verifying key size: expected {}, got {}",
            expected_size,
            bytes.len()
        )));
    }

    let mut offset = 0;

    // Alpha (G1)
    let alpha_bytes: [u8; G1_SIZE] = bytes[offset..offset + G1_SIZE].try_into().unwrap();
    let alpha_g1 = g1_from_gnark(&alpha_bytes)?;
    offset += G1_SIZE;

    // Beta (G2)
    let beta_bytes: [u8; G2_SIZE] = bytes[offset..offset + G2_SIZE].try_into().unwrap();
    let beta_g2 = g2_from_gnark(&beta_bytes)?;
    offset += G2_SIZE;

    // Gamma (G2)
    let gamma_bytes: [u8; G2_SIZE] = bytes[offset..offset + G2_SIZE].try_into().unwrap();
    let gamma_g2 = g2_from_gnark(&gamma_bytes)?;
    offset += G2_SIZE;

    // Delta (G2)
    let delta_bytes: [u8; G2_SIZE] = bytes[offset..offset + G2_SIZE].try_into().unwrap();
    let delta_g2 = g2_from_gnark(&delta_bytes)?;
    offset += G2_SIZE;

    // Gamma_ABC (array of G1)
    let mut gamma_abc_g1 = Vec::with_capacity(num_public_inputs + 1);
    for _ in 0..=num_public_inputs {
        let point_bytes: [u8; G1_SIZE] = bytes[offset..offset + G1_SIZE].try_into().unwrap();
        gamma_abc_g1.push(g1_from_gnark(&point_bytes)?);
        offset += G1_SIZE;
    }

    Ok(VerifyingKey {
        alpha_g1,
        beta_g2,
        gamma_g2,
        delta_g2,
        gamma_abc_g1,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use ark_std::UniformRand;

    #[test]
    fn test_fr_roundtrip() {
        let mut rng = ark_std::test_rng();
        for _ in 0..10 {
            let original = Fr::rand(&mut rng);
            let bytes = fr_to_be_bytes(&original);
            let recovered = fr_from_be_bytes(&bytes).unwrap();
            assert_eq!(original, recovered);
        }
    }

    #[test]
    fn test_g1_roundtrip() {
        let mut rng = ark_std::test_rng();
        for _ in 0..10 {
            let original = G1Affine::rand(&mut rng);
            let bytes = g1_to_gnark(&original);
            let recovered = g1_from_gnark(&bytes).unwrap();
            assert_eq!(original, recovered);
        }
    }

    #[test]
    fn test_g2_roundtrip() {
        let mut rng = ark_std::test_rng();
        for _ in 0..10 {
            let original = G2Affine::rand(&mut rng);
            let bytes = g2_to_gnark(&original);
            let recovered = g2_from_gnark(&bytes).unwrap();
            assert_eq!(original, recovered);
        }
    }

    #[test]
    fn test_proof_size() {
        // Verify the expected sizes
        assert_eq!(G1_SIZE, 64);
        assert_eq!(G2_SIZE, 128);
        assert_eq!(PROOF_SIZE, 256);
    }
}
