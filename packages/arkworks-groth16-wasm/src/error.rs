//! Error types for arkworks-groth16-wasm.

use thiserror::Error;
use wasm_bindgen::JsValue;

/// Errors that can occur during proof generation/verification
#[derive(Error, Debug)]
pub enum ArkworksError {
    #[error("Parse error: {0}")]
    ParseError(String),

    #[error("Unsupported ACIR opcode: {0}")]
    UnsupportedOpcode(String),

    #[error("Synthesis error: {0}")]
    SynthesisError(String),

    #[error("Proof generation error: {0}")]
    ProofError(String),

    #[error("Verification error: {0}")]
    VerificationError(String),

    #[error("Serialization error: {0}")]
    SerializationError(String),

    #[error("Invalid input: {0}")]
    InvalidInput(String),

    #[error("Missing witness value for index {0}")]
    MissingWitness(u32),

    #[error("WASM error: {0}")]
    WasmError(String),
}

impl From<ArkworksError> for JsValue {
    fn from(err: ArkworksError) -> Self {
        JsValue::from_str(&err.to_string())
    }
}

impl From<ark_relations::r1cs::SynthesisError> for ArkworksError {
    fn from(err: ark_relations::r1cs::SynthesisError) -> Self {
        ArkworksError::SynthesisError(err.to_string())
    }
}

impl From<ark_serialize::SerializationError> for ArkworksError {
    fn from(err: ark_serialize::SerializationError) -> Self {
        ArkworksError::SerializationError(err.to_string())
    }
}

impl From<serde_json::Error> for ArkworksError {
    fn from(err: serde_json::Error) -> Self {
        ArkworksError::ParseError(err.to_string())
    }
}

impl From<base64::DecodeError> for ArkworksError {
    fn from(err: base64::DecodeError) -> Self {
        ArkworksError::ParseError(format!("Base64 decode error: {}", err))
    }
}
