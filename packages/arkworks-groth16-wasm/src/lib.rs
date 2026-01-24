//! arkworks-groth16-wasm
//!
//! WASM bindings for Groth16 proving using arkworks.
//! Generates proofs compatible with gnark-verifier-solana.
//!
//! # Features
//!
//! - **100% client-side**: Runs entirely in the browser
//! - **gnark-compatible**: Proofs verify with gnark-verifier-solana
//! - **BN254 curve**: Same curve as gnark for Solana compatibility
//!
//! # Usage
//!
//! ```javascript
//! import init, { Groth16, setup, prove, verify } from 'arkworks-groth16-wasm';
//!
//! await init();
//!
//! // Setup (trusted setup - for testing only)
//! const { provingKey, verifyingKey } = await setup(acirJson);
//!
//! // Prove
//! const { proof, publicInputs } = await prove(provingKey, acirJson, witnessMap);
//!
//! // Verify
//! const isValid = await verify(verifyingKey, proof, publicInputs);
//! ```

pub mod acir_to_r1cs;
pub mod acir_types;
pub mod error;
pub mod gnark_compat;
pub mod groth16;

use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use acir_to_r1cs::{acir_to_r1cs, parse_field_element, WitnessMap};
use acir_types::AcirProgram;

// Initialize panic hook for better error messages in browser
#[wasm_bindgen(start)]
pub fn init_panic_hook() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

/// JavaScript-friendly setup result
#[derive(Serialize, Deserialize)]
pub struct JsSetupResult {
    /// Base64-encoded proving key
    pub proving_key: String,
    /// Base64-encoded verifying key (arkworks format)
    pub verifying_key: String,
    /// Base64-encoded verifying key (gnark format for Solana)
    pub verifying_key_gnark: String,
}

/// JavaScript-friendly proof result
#[derive(Serialize, Deserialize)]
pub struct JsProofResult {
    /// Base64-encoded proof (arkworks format)
    pub proof: String,
    /// Base64-encoded proof (gnark format for Solana, 256 bytes)
    pub proof_gnark: String,
    /// Public inputs as hex strings
    pub public_inputs: Vec<String>,
    /// Public inputs in gnark format (32 bytes each, big-endian)
    pub public_inputs_gnark: String,
}

/// Perform trusted setup for a circuit
///
/// # Arguments
/// * `acir_json` - JSON string of the ACIR program from Noir compiler
///
/// # Returns
/// * `JsSetupResult` with base64-encoded proving and verifying keys
#[wasm_bindgen]
pub fn setup(acir_json: &str) -> Result<JsValue, JsValue> {
    let program: AcirProgram = serde_json::from_str(acir_json)
        .map_err(|e| JsValue::from_str(&format!("Failed to parse ACIR: {}", e)))?;

    let r1cs = acir_to_r1cs(&program)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;

    let setup_result = groth16::setup(&r1cs)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;

    // Serialize keys
    let pk_bytes = setup_result.proving_key
        .serialize_compressed_to_vec()
        .map_err(|e| JsValue::from_str(&format!("Failed to serialize proving key: {}", e)))?;

    let vk_bytes = setup_result.verifying_key
        .serialize_compressed_to_vec()
        .map_err(|e| JsValue::from_str(&format!("Failed to serialize verifying key: {}", e)))?;

    let vk_gnark = gnark_compat::verifying_key_to_gnark(&setup_result.verifying_key)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;

    use base64::{Engine, engine::general_purpose::STANDARD};

    let result = JsSetupResult {
        proving_key: STANDARD.encode(&pk_bytes),
        verifying_key: STANDARD.encode(&vk_bytes),
        verifying_key_gnark: STANDARD.encode(&vk_gnark),
    };

    serde_wasm_bindgen::to_value(&result)
        .map_err(|e| JsValue::from_str(&e.to_string()))
}

/// Generate a Groth16 proof
///
/// # Arguments
/// * `proving_key_b64` - Base64-encoded proving key from setup
/// * `acir_json` - JSON string of the ACIR program
/// * `witness_json` - JSON object mapping witness indices to hex values
///
/// # Returns
/// * `JsProofResult` with proof and public inputs
#[wasm_bindgen]
pub fn prove(
    proving_key_b64: &str,
    acir_json: &str,
    witness_json: &str,
) -> Result<JsValue, JsValue> {
    use base64::{Engine, engine::general_purpose::STANDARD};
    use ark_serialize::CanonicalDeserialize;

    // Decode proving key
    let pk_bytes = STANDARD.decode(proving_key_b64)
        .map_err(|e| JsValue::from_str(&format!("Invalid proving key base64: {}", e)))?;

    let proving_key = ark_groth16::ProvingKey::<ark_bn254::Bn254>::deserialize_compressed(&pk_bytes[..])
        .map_err(|e| JsValue::from_str(&format!("Failed to deserialize proving key: {}", e)))?;

    // Parse ACIR
    let program: AcirProgram = serde_json::from_str(acir_json)
        .map_err(|e| JsValue::from_str(&format!("Failed to parse ACIR: {}", e)))?;

    let r1cs = acir_to_r1cs(&program)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;

    // Parse witness
    let witness_map: HashMap<String, String> = serde_json::from_str(witness_json)
        .map_err(|e| JsValue::from_str(&format!("Failed to parse witness: {}", e)))?;

    let mut witness = WitnessMap::new();
    // Always set w_0 = 1
    witness.insert(0, ark_bn254::Fr::from(1u64));

    for (key, value) in witness_map {
        let idx: u32 = key.parse()
            .map_err(|_| JsValue::from_str(&format!("Invalid witness index: {}", key)))?;
        let fr = parse_field_element(&value)
            .map_err(|e| JsValue::from_str(&e.to_string()))?;
        witness.insert(idx, fr);
    }

    // Generate proof
    let proof_result = groth16::prove(&proving_key, &r1cs, witness)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;

    // Serialize results
    let proof_bytes = groth16::proof_to_bytes(&proof_result.proof)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;

    let proof_gnark = groth16::proof_to_gnark_bytes(&proof_result.proof)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;

    let public_inputs: Vec<String> = proof_result.public_inputs
        .iter()
        .map(|fr| {
            let bytes = gnark_compat::fr_to_be_bytes(fr);
            format!("0x{}", hex::encode(bytes))
        })
        .collect();

    let public_inputs_gnark_bytes = groth16::public_inputs_to_gnark_bytes(&proof_result.public_inputs);

    let result = JsProofResult {
        proof: STANDARD.encode(&proof_bytes),
        proof_gnark: STANDARD.encode(&proof_gnark),
        public_inputs,
        public_inputs_gnark: STANDARD.encode(&public_inputs_gnark_bytes),
    };

    serde_wasm_bindgen::to_value(&result)
        .map_err(|e| JsValue::from_str(&e.to_string()))
}

/// Verify a Groth16 proof
///
/// # Arguments
/// * `verifying_key_b64` - Base64-encoded verifying key from setup
/// * `proof_b64` - Base64-encoded proof (arkworks format)
/// * `public_inputs_json` - JSON array of public inputs as hex strings
///
/// # Returns
/// * `true` if proof is valid, `false` otherwise
#[wasm_bindgen]
pub fn verify(
    verifying_key_b64: &str,
    proof_b64: &str,
    public_inputs_json: &str,
) -> Result<bool, JsValue> {
    use base64::{Engine, engine::general_purpose::STANDARD};
    use ark_serialize::CanonicalDeserialize;

    // Decode verifying key
    let vk_bytes = STANDARD.decode(verifying_key_b64)
        .map_err(|e| JsValue::from_str(&format!("Invalid verifying key base64: {}", e)))?;

    let verifying_key = ark_groth16::VerifyingKey::<ark_bn254::Bn254>::deserialize_compressed(&vk_bytes[..])
        .map_err(|e| JsValue::from_str(&format!("Failed to deserialize verifying key: {}", e)))?;

    // Decode proof
    let proof_bytes = STANDARD.decode(proof_b64)
        .map_err(|e| JsValue::from_str(&format!("Invalid proof base64: {}", e)))?;

    let proof = groth16::proof_from_bytes(&proof_bytes)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;

    // Parse public inputs
    let inputs_hex: Vec<String> = serde_json::from_str(public_inputs_json)
        .map_err(|e| JsValue::from_str(&format!("Failed to parse public inputs: {}", e)))?;

    let mut public_inputs = Vec::new();
    for hex_str in inputs_hex {
        let fr = parse_field_element(&hex_str)
            .map_err(|e| JsValue::from_str(&e.to_string()))?;
        public_inputs.push(fr);
    }

    // Verify
    groth16::verify(&verifying_key, &proof, &public_inputs)
        .map_err(|e| JsValue::from_str(&e.to_string()))
}

/// Verify a Groth16 proof in gnark format
///
/// # Arguments
/// * `verifying_key_gnark_b64` - Base64-encoded verifying key (gnark format)
/// * `proof_gnark_b64` - Base64-encoded proof (gnark format, 256 bytes)
/// * `public_inputs_gnark_b64` - Base64-encoded public inputs (gnark format)
/// * `num_public_inputs` - Number of public inputs
///
/// # Returns
/// * `true` if proof is valid, `false` otherwise
#[wasm_bindgen]
pub fn verify_gnark(
    verifying_key_gnark_b64: &str,
    proof_gnark_b64: &str,
    public_inputs_gnark_b64: &str,
    num_public_inputs: usize,
) -> Result<bool, JsValue> {
    use base64::{Engine, engine::general_purpose::STANDARD};

    // Decode verifying key
    let vk_bytes = STANDARD.decode(verifying_key_gnark_b64)
        .map_err(|e| JsValue::from_str(&format!("Invalid verifying key base64: {}", e)))?;

    let verifying_key = gnark_compat::verifying_key_from_gnark(&vk_bytes, num_public_inputs)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;

    // Decode proof
    let proof_bytes = STANDARD.decode(proof_gnark_b64)
        .map_err(|e| JsValue::from_str(&format!("Invalid proof base64: {}", e)))?;

    let proof = groth16::proof_from_gnark_bytes(&proof_bytes)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;

    // Decode public inputs
    let inputs_bytes = STANDARD.decode(public_inputs_gnark_b64)
        .map_err(|e| JsValue::from_str(&format!("Invalid public inputs base64: {}", e)))?;

    let public_inputs = groth16::public_inputs_from_gnark_bytes(&inputs_bytes)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;

    // Verify
    groth16::verify(&verifying_key, &proof, &public_inputs)
        .map_err(|e| JsValue::from_str(&e.to_string()))
}

/// Convert ACIR JSON to R1CS information (for debugging)
#[wasm_bindgen]
pub fn acir_to_r1cs_info(acir_json: &str) -> Result<JsValue, JsValue> {
    let program: AcirProgram = serde_json::from_str(acir_json)
        .map_err(|e| JsValue::from_str(&format!("Failed to parse ACIR: {}", e)))?;

    let r1cs = acir_to_r1cs(&program)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;

    #[derive(Serialize)]
    struct R1csInfo {
        num_witnesses: usize,
        num_constraints: usize,
        public_inputs: Vec<u32>,
        private_inputs: Vec<u32>,
        return_values: Vec<u32>,
    }

    let info = R1csInfo {
        num_witnesses: r1cs.num_witnesses,
        num_constraints: r1cs.constraints.len(),
        public_inputs: r1cs.public_inputs,
        private_inputs: r1cs.private_inputs,
        return_values: r1cs.return_values,
    };

    serde_wasm_bindgen::to_value(&info)
        .map_err(|e| JsValue::from_str(&e.to_string()))
}

/// Get library version
#[wasm_bindgen]
pub fn version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

// =============================================================================
// Direct R1CS API (bypasses ACIR bytecode decoding)
// =============================================================================

/// R1CS constraint in JSON format
#[derive(Serialize, Deserialize)]
pub struct JsR1csConstraint {
    /// A terms: [(coefficient_hex, witness_index), ...]
    pub a: Vec<(String, u32)>,
    /// B terms: [(coefficient_hex, witness_index), ...]
    pub b: Vec<(String, u32)>,
    /// C terms: [(coefficient_hex, witness_index), ...]
    pub c: Vec<(String, u32)>,
}

/// R1CS definition in JSON format
#[derive(Serialize, Deserialize)]
pub struct JsR1csDefinition {
    /// Total number of witnesses (including w_0 = 1)
    pub num_witnesses: usize,
    /// Public input witness indices
    pub public_inputs: Vec<u32>,
    /// Private input witness indices
    pub private_inputs: Vec<u32>,
    /// Constraints
    pub constraints: Vec<JsR1csConstraint>,
}

/// Perform trusted setup from R1CS definition
///
/// # Arguments
/// * `r1cs_json` - JSON string of R1CS definition
///
/// # Returns
/// * `JsSetupResult` with base64-encoded proving and verifying keys
#[wasm_bindgen]
pub fn setup_from_r1cs(r1cs_json: &str) -> Result<JsValue, JsValue> {
    let js_r1cs: JsR1csDefinition = serde_json::from_str(r1cs_json)
        .map_err(|e| JsValue::from_str(&format!("Failed to parse R1CS JSON: {}", e)))?;

    // Convert to internal R1CS format
    let r1cs = convert_js_r1cs(&js_r1cs)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;

    let setup_result = groth16::setup(&r1cs)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;

    // Serialize keys
    let pk_bytes = setup_result.proving_key
        .serialize_compressed_to_vec()
        .map_err(|e| JsValue::from_str(&format!("Failed to serialize proving key: {}", e)))?;

    let vk_bytes = setup_result.verifying_key
        .serialize_compressed_to_vec()
        .map_err(|e| JsValue::from_str(&format!("Failed to serialize verifying key: {}", e)))?;

    let vk_gnark = gnark_compat::verifying_key_to_gnark(&setup_result.verifying_key)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;

    use base64::{Engine, engine::general_purpose::STANDARD};

    let result = JsSetupResult {
        proving_key: STANDARD.encode(&pk_bytes),
        verifying_key: STANDARD.encode(&vk_bytes),
        verifying_key_gnark: STANDARD.encode(&vk_gnark),
    };

    serde_wasm_bindgen::to_value(&result)
        .map_err(|e| JsValue::from_str(&e.to_string()))
}

/// Generate a Groth16 proof from R1CS definition
///
/// # Arguments
/// * `proving_key_b64` - Base64-encoded proving key from setup
/// * `r1cs_json` - JSON string of R1CS definition
/// * `witness_json` - JSON object mapping witness indices to hex values
///
/// # Returns
/// * `JsProofResult` with proof and public inputs
#[wasm_bindgen]
pub fn prove_from_r1cs(
    proving_key_b64: &str,
    r1cs_json: &str,
    witness_json: &str,
) -> Result<JsValue, JsValue> {
    use base64::{Engine, engine::general_purpose::STANDARD};
    use ark_serialize::CanonicalDeserialize;

    // Decode proving key
    let pk_bytes = STANDARD.decode(proving_key_b64)
        .map_err(|e| JsValue::from_str(&format!("Invalid proving key base64: {}", e)))?;

    let proving_key = ark_groth16::ProvingKey::<ark_bn254::Bn254>::deserialize_compressed(&pk_bytes[..])
        .map_err(|e| JsValue::from_str(&format!("Failed to deserialize proving key: {}", e)))?;

    // Parse R1CS
    let js_r1cs: JsR1csDefinition = serde_json::from_str(r1cs_json)
        .map_err(|e| JsValue::from_str(&format!("Failed to parse R1CS JSON: {}", e)))?;

    let r1cs = convert_js_r1cs(&js_r1cs)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;

    // Parse witness
    let witness_map: HashMap<String, String> = serde_json::from_str(witness_json)
        .map_err(|e| JsValue::from_str(&format!("Failed to parse witness: {}", e)))?;

    let mut witness = WitnessMap::new();
    // Always set w_0 = 1
    witness.insert(0, ark_bn254::Fr::from(1u64));

    for (key, value) in witness_map {
        let idx: u32 = key.parse()
            .map_err(|_| JsValue::from_str(&format!("Invalid witness index: {}", key)))?;
        let fr = parse_field_element(&value)
            .map_err(|e| JsValue::from_str(&e.to_string()))?;
        witness.insert(idx, fr);
    }

    // Generate proof
    let proof_result = groth16::prove(&proving_key, &r1cs, witness)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;

    // Serialize results
    let proof_bytes = groth16::proof_to_bytes(&proof_result.proof)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;

    let proof_gnark = groth16::proof_to_gnark_bytes(&proof_result.proof)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;

    let public_inputs: Vec<String> = proof_result.public_inputs
        .iter()
        .map(|fr| {
            let bytes = gnark_compat::fr_to_be_bytes(fr);
            format!("0x{}", hex::encode(bytes))
        })
        .collect();

    let public_inputs_gnark_bytes = groth16::public_inputs_to_gnark_bytes(&proof_result.public_inputs);

    let result = JsProofResult {
        proof: STANDARD.encode(&proof_bytes),
        proof_gnark: STANDARD.encode(&proof_gnark),
        public_inputs,
        public_inputs_gnark: STANDARD.encode(&public_inputs_gnark_bytes),
    };

    serde_wasm_bindgen::to_value(&result)
        .map_err(|e| JsValue::from_str(&e.to_string()))
}

/// Convert JS R1CS definition to internal format
fn convert_js_r1cs(js_r1cs: &JsR1csDefinition) -> Result<acir_to_r1cs::AcirR1cs, error::ArkworksError> {
    let mut constraints = Vec::new();

    for c in &js_r1cs.constraints {
        let a: Vec<(ark_bn254::Fr, u32)> = c.a.iter()
            .map(|(coeff, idx)| Ok((parse_field_element(coeff)?, *idx)))
            .collect::<Result<Vec<_>, error::ArkworksError>>()?;

        let b: Vec<(ark_bn254::Fr, u32)> = c.b.iter()
            .map(|(coeff, idx)| Ok((parse_field_element(coeff)?, *idx)))
            .collect::<Result<Vec<_>, error::ArkworksError>>()?;

        let c_terms: Vec<(ark_bn254::Fr, u32)> = c.c.iter()
            .map(|(coeff, idx)| Ok((parse_field_element(coeff)?, *idx)))
            .collect::<Result<Vec<_>, error::ArkworksError>>()?;

        constraints.push(acir_to_r1cs::R1csConstraint { a, b, c: c_terms });
    }

    Ok(acir_to_r1cs::AcirR1cs {
        num_witnesses: js_r1cs.num_witnesses,
        public_inputs: js_r1cs.public_inputs.clone(),
        private_inputs: js_r1cs.private_inputs.clone(),
        return_values: js_r1cs.public_inputs.clone(), // Return values = public outputs
        constraints,
    })
}

// Helper trait for serialization
trait SerializeCompressedToVec {
    fn serialize_compressed_to_vec(&self) -> Result<Vec<u8>, ark_serialize::SerializationError>;
}

impl<T: ark_serialize::CanonicalSerialize> SerializeCompressedToVec for T {
    fn serialize_compressed_to_vec(&self) -> Result<Vec<u8>, ark_serialize::SerializationError> {
        let mut bytes = Vec::new();
        self.serialize_compressed(&mut bytes)?;
        Ok(bytes)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_version() {
        assert!(!version().is_empty());
    }
}
