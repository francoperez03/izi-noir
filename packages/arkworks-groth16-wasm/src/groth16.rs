//! Groth16 proving system using arkworks.
//!
//! This module provides Groth16 setup, proving, and verification
//! using the arkworks library on the BN254 curve.

use ark_bn254::{Bn254, Fr};
use ark_groth16::{
    prepare_verifying_key, Groth16, PreparedVerifyingKey, Proof, ProvingKey, VerifyingKey,
};
use ark_serialize::{CanonicalDeserialize, CanonicalSerialize};
use ark_snark::SNARK;
use ark_std::rand::rngs::OsRng;

use crate::acir_to_r1cs::{AcirCircuitSynthesizer, AcirR1cs, WitnessMap};
use crate::error::ArkworksError;
use crate::gnark_compat;

/// Result of Groth16 setup
pub struct SetupResult {
    pub proving_key: ProvingKey<Bn254>,
    pub verifying_key: VerifyingKey<Bn254>,
}

/// Result of Groth16 proof generation
pub struct ProofResult {
    /// Proof in arkworks format
    pub proof: Proof<Bn254>,
    /// Public inputs (field elements)
    pub public_inputs: Vec<Fr>,
}

/// Groth16 prover for BN254 curve
pub struct Groth16Prover {
    proving_key: ProvingKey<Bn254>,
    verifying_key: VerifyingKey<Bn254>,
    prepared_vk: PreparedVerifyingKey<Bn254>,
}

impl Groth16Prover {
    /// Create a new prover from a setup result
    pub fn new(setup: SetupResult) -> Self {
        let prepared_vk = prepare_verifying_key(&setup.verifying_key);
        Self {
            proving_key: setup.proving_key,
            verifying_key: setup.verifying_key,
            prepared_vk,
        }
    }

    /// Create a prover from serialized keys
    pub fn from_keys(pk_bytes: &[u8], vk_bytes: &[u8]) -> Result<Self, ArkworksError> {
        let proving_key = ProvingKey::deserialize_compressed(pk_bytes)?;
        let verifying_key = VerifyingKey::deserialize_compressed(vk_bytes)?;
        let prepared_vk = prepare_verifying_key(&verifying_key);

        Ok(Self {
            proving_key,
            verifying_key,
            prepared_vk,
        })
    }

    /// Generate a proof
    pub fn prove(
        &self,
        r1cs: &AcirR1cs,
        witness: WitnessMap,
    ) -> Result<ProofResult, ArkworksError> {
        let circuit = AcirCircuitSynthesizer::new(r1cs.clone(), Some(witness.clone()));

        // Generate proof
        let mut rng = OsRng;
        let proof = Groth16::<Bn254>::prove(&self.proving_key, circuit, &mut rng)
            .map_err(|e| ArkworksError::ProofError(e.to_string()))?;

        // Extract public inputs in order
        let public_inputs: Vec<Fr> = r1cs
            .public_inputs
            .iter()
            .map(|&idx| {
                witness
                    .get(&idx)
                    .copied()
                    .ok_or(ArkworksError::MissingWitness(idx))
            })
            .collect::<Result<Vec<_>, _>>()?;

        Ok(ProofResult {
            proof,
            public_inputs,
        })
    }

    /// Verify a proof
    pub fn verify(&self, proof: &Proof<Bn254>, public_inputs: &[Fr]) -> Result<bool, ArkworksError> {
        Groth16::<Bn254>::verify_with_processed_vk(&self.prepared_vk, public_inputs, proof)
            .map_err(|e| ArkworksError::VerificationError(e.to_string()))
    }

    /// Get the proving key bytes (compressed)
    pub fn proving_key_bytes(&self) -> Result<Vec<u8>, ArkworksError> {
        let mut bytes = Vec::new();
        self.proving_key.serialize_compressed(&mut bytes)?;
        Ok(bytes)
    }

    /// Get the verifying key bytes (compressed)
    pub fn verifying_key_bytes(&self) -> Result<Vec<u8>, ArkworksError> {
        let mut bytes = Vec::new();
        self.verifying_key.serialize_compressed(&mut bytes)?;
        Ok(bytes)
    }

    /// Get the verifying key in gnark-compatible format
    pub fn verifying_key_gnark(&self) -> Result<Vec<u8>, ArkworksError> {
        gnark_compat::verifying_key_to_gnark(&self.verifying_key)
    }

    /// Get the verifying key
    pub fn get_verifying_key(&self) -> &VerifyingKey<Bn254> {
        &self.verifying_key
    }
}

/// Perform trusted setup for a circuit
///
/// WARNING: This is for testing/development only.
/// Production systems should use a multi-party computation (MPC) ceremony.
pub fn setup(r1cs: &AcirR1cs) -> Result<SetupResult, ArkworksError> {
    let circuit = AcirCircuitSynthesizer::new(r1cs.clone(), None);

    let mut rng = OsRng;
    let (pk, vk) = Groth16::<Bn254>::circuit_specific_setup(circuit, &mut rng)
        .map_err(|e| ArkworksError::SynthesisError(e.to_string()))?;

    Ok(SetupResult {
        proving_key: pk,
        verifying_key: vk,
    })
}

/// Generate a proof
pub fn prove(
    proving_key: &ProvingKey<Bn254>,
    r1cs: &AcirR1cs,
    witness: WitnessMap,
) -> Result<ProofResult, ArkworksError> {
    let circuit = AcirCircuitSynthesizer::new(r1cs.clone(), Some(witness.clone()));

    let mut rng = OsRng;
    let proof = Groth16::<Bn254>::prove(proving_key, circuit, &mut rng)
        .map_err(|e| ArkworksError::ProofError(e.to_string()))?;

    let public_inputs: Vec<Fr> = r1cs
        .public_inputs
        .iter()
        .map(|&idx| {
            witness
                .get(&idx)
                .copied()
                .ok_or(ArkworksError::MissingWitness(idx))
        })
        .collect::<Result<Vec<_>, _>>()?;

    Ok(ProofResult {
        proof,
        public_inputs,
    })
}

/// Verify a proof
pub fn verify(
    verifying_key: &VerifyingKey<Bn254>,
    proof: &Proof<Bn254>,
    public_inputs: &[Fr],
) -> Result<bool, ArkworksError> {
    let prepared_vk = prepare_verifying_key(verifying_key);
    Groth16::<Bn254>::verify_with_processed_vk(&prepared_vk, public_inputs, proof)
        .map_err(|e| ArkworksError::VerificationError(e.to_string()))
}

/// Serialize a proof to bytes (arkworks compressed format)
pub fn proof_to_bytes(proof: &Proof<Bn254>) -> Result<Vec<u8>, ArkworksError> {
    let mut bytes = Vec::new();
    proof.serialize_compressed(&mut bytes)?;
    Ok(bytes)
}

/// Deserialize a proof from bytes
pub fn proof_from_bytes(bytes: &[u8]) -> Result<Proof<Bn254>, ArkworksError> {
    Proof::deserialize_compressed(bytes).map_err(|e| e.into())
}

/// Serialize a proof to gnark-compatible format (256 bytes)
pub fn proof_to_gnark_bytes(proof: &Proof<Bn254>) -> Result<Vec<u8>, ArkworksError> {
    gnark_compat::proof_to_gnark(proof)
}

/// Deserialize a proof from gnark format
pub fn proof_from_gnark_bytes(bytes: &[u8]) -> Result<Proof<Bn254>, ArkworksError> {
    gnark_compat::proof_from_gnark(bytes)
}

/// Serialize public inputs to gnark-compatible format
pub fn public_inputs_to_gnark_bytes(inputs: &[Fr]) -> Vec<u8> {
    gnark_compat::public_inputs_to_gnark(inputs)
}

/// Deserialize public inputs from gnark format
pub fn public_inputs_from_gnark_bytes(bytes: &[u8]) -> Result<Vec<Fr>, ArkworksError> {
    gnark_compat::public_inputs_from_gnark(bytes)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::acir_to_r1cs::R1csConstraint;
    use ark_ff::One;

    /// Create a simple test circuit: x * y = z (where z is public)
    fn create_test_r1cs() -> AcirR1cs {
        // Witness layout:
        // w_0 = 1 (constant)
        // w_1 = x (private)
        // w_2 = y (private)
        // w_3 = z (public)
        //
        // Constraint: w_1 * w_2 = w_3
        AcirR1cs {
            num_witnesses: 4,
            public_inputs: vec![3], // z is public
            private_inputs: vec![1, 2], // x, y are private
            return_values: vec![3],
            constraints: vec![R1csConstraint {
                a: vec![(Fr::one(), 1)], // x
                b: vec![(Fr::one(), 2)], // y
                c: vec![(Fr::one(), 3)], // z
            }],
        }
    }

    #[test]
    fn test_setup_prove_verify() {
        let r1cs = create_test_r1cs();

        // Setup
        let setup_result = setup(&r1cs).expect("Setup failed");

        // Create witness: x=3, y=4, z=12
        let mut witness = WitnessMap::new();
        witness.insert(0, Fr::one()); // constant 1
        witness.insert(1, Fr::from(3u64)); // x = 3
        witness.insert(2, Fr::from(4u64)); // y = 4
        witness.insert(3, Fr::from(12u64)); // z = 12

        // Prove
        let proof_result = prove(&setup_result.proving_key, &r1cs, witness)
            .expect("Proof generation failed");

        // Verify
        let is_valid = verify(
            &setup_result.verifying_key,
            &proof_result.proof,
            &proof_result.public_inputs,
        )
        .expect("Verification failed");

        assert!(is_valid, "Proof should be valid");
    }

    #[test]
    fn test_invalid_proof_rejected() {
        let r1cs = create_test_r1cs();

        // Setup
        let setup_result = setup(&r1cs).expect("Setup failed");

        // Create witness with wrong z: x=3, y=4, z=11 (should be 12)
        let mut witness = WitnessMap::new();
        witness.insert(0, Fr::one());
        witness.insert(1, Fr::from(3u64));
        witness.insert(2, Fr::from(4u64));
        witness.insert(3, Fr::from(11u64)); // Wrong!

        // This should fail during proof generation because constraints aren't satisfied
        let result = prove(&setup_result.proving_key, &r1cs, witness);
        assert!(result.is_err(), "Proof generation should fail for invalid witness");
    }

    #[test]
    fn test_gnark_serialization_roundtrip() {
        let r1cs = create_test_r1cs();
        let setup_result = setup(&r1cs).expect("Setup failed");

        let mut witness = WitnessMap::new();
        witness.insert(0, Fr::one());
        witness.insert(1, Fr::from(3u64));
        witness.insert(2, Fr::from(4u64));
        witness.insert(3, Fr::from(12u64));

        let proof_result = prove(&setup_result.proving_key, &r1cs, witness)
            .expect("Proof generation failed");

        // Serialize to gnark format
        let gnark_bytes = proof_to_gnark_bytes(&proof_result.proof)
            .expect("Gnark serialization failed");

        assert_eq!(gnark_bytes.len(), 256, "Gnark proof should be 256 bytes");

        // Deserialize back
        let recovered_proof = proof_from_gnark_bytes(&gnark_bytes)
            .expect("Gnark deserialization failed");

        // Verify recovered proof
        let is_valid = verify(
            &setup_result.verifying_key,
            &recovered_proof,
            &proof_result.public_inputs,
        )
        .expect("Verification failed");

        assert!(is_valid, "Recovered proof should be valid");
    }
}
