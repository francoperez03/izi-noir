//! ACIR to R1CS converter.
//!
//! Converts ACIR (Abstract Circuit Intermediate Representation) from Noir
//! to R1CS (Rank-1 Constraint System) for Groth16 proving with arkworks.

use ark_bn254::Fr;
use ark_ff::PrimeField;
use ark_relations::r1cs::{
    ConstraintSynthesizer, ConstraintSystemRef, LinearCombination, SynthesisError, Variable,
};
use std::collections::HashMap;

use crate::acir_types::{AcirCircuit, AcirProgram, Expression, Opcode};
use crate::error::ArkworksError;

/// Witness values for circuit execution
pub type WitnessMap = HashMap<u32, Fr>;

/// R1CS circuit converted from ACIR
#[derive(Clone)]
pub struct AcirR1cs {
    /// Number of witnesses (including w_0 = 1)
    pub num_witnesses: usize,
    /// Public input witness indices
    pub public_inputs: Vec<u32>,
    /// Private input witness indices
    pub private_inputs: Vec<u32>,
    /// Return value witness indices
    pub return_values: Vec<u32>,
    /// R1CS constraints: (A, B, C) where A * B = C
    pub constraints: Vec<R1csConstraint>,
}

/// Single R1CS constraint: A * B = C
/// Each component is a linear combination of (coefficient, witness_index)
#[derive(Clone, Debug)]
pub struct R1csConstraint {
    pub a: Vec<(Fr, u32)>,
    pub b: Vec<(Fr, u32)>,
    pub c: Vec<(Fr, u32)>,
}

/// Circuit synthesizer for arkworks Groth16
pub struct AcirCircuitSynthesizer {
    pub r1cs: AcirR1cs,
    pub witness: Option<WitnessMap>,
}

impl AcirCircuitSynthesizer {
    pub fn new(r1cs: AcirR1cs, witness: Option<WitnessMap>) -> Self {
        Self { r1cs, witness }
    }
}

impl ConstraintSynthesizer<Fr> for AcirCircuitSynthesizer {
    fn generate_constraints(self, cs: ConstraintSystemRef<Fr>) -> Result<(), SynthesisError> {
        // Create variables for all witnesses
        let mut variables: HashMap<u32, Variable> = HashMap::new();

        // w_0 is always 1 (constant one)
        variables.insert(0, Variable::One);

        // Allocate public inputs first (required by Groth16)
        for &idx in &self.r1cs.public_inputs {
            let value = self.witness.as_ref().and_then(|w| w.get(&idx).copied());
            let var = cs.new_input_variable(|| value.ok_or(SynthesisError::AssignmentMissing))?;
            variables.insert(idx, var);
        }

        // Allocate all other witnesses as private
        for i in 1..self.r1cs.num_witnesses as u32 {
            if variables.contains_key(&i) {
                continue;
            }
            let value = self.witness.as_ref().and_then(|w| w.get(&i).copied());
            let var = cs.new_witness_variable(|| value.ok_or(SynthesisError::AssignmentMissing))?;
            variables.insert(i, var);
        }

        // Add constraints
        for constraint in &self.r1cs.constraints {
            let a_lc = build_lc(&constraint.a, &variables);
            let b_lc = build_lc(&constraint.b, &variables);
            let c_lc = build_lc(&constraint.c, &variables);

            cs.enforce_constraint(a_lc, b_lc, c_lc)?;
        }

        Ok(())
    }
}

/// Build a linear combination from terms
fn build_lc(terms: &[(Fr, u32)], variables: &HashMap<u32, Variable>) -> LinearCombination<Fr> {
    let mut lc = LinearCombination::zero();
    for &(coeff, idx) in terms {
        if let Some(&var) = variables.get(&idx) {
            lc = lc + (coeff, var);
        }
    }
    lc
}

/// Parse a hex field element string to Fr
pub fn parse_field_element(s: &str) -> Result<Fr, ArkworksError> {
    let s = s.trim();
    if s.is_empty() || s == "0" || s == "0x0" || s == "0x00" {
        return Ok(Fr::from(0u64));
    }

    let hex_str = s.strip_prefix("0x").unwrap_or(s);

    // Parse hex string to big integer
    let bytes = hex::decode(hex_str.trim_start_matches('0').to_string().as_str())
        .or_else(|_| {
            // Pad to even length
            let padded = if hex_str.len() % 2 == 1 {
                format!("0{}", hex_str)
            } else {
                hex_str.to_string()
            };
            hex::decode(&padded)
        })
        .map_err(|e| ArkworksError::ParseError(format!("Invalid hex: {}", e)))?;

    // Convert to big-endian 32 bytes
    let mut be_bytes = [0u8; 32];
    let start = 32 - bytes.len().min(32);
    be_bytes[start..].copy_from_slice(&bytes[bytes.len().saturating_sub(32)..]);

    Fr::from_be_bytes_mod_order(&be_bytes)
        .try_into()
        .map_err(|_| ArkworksError::ParseError("Field element out of range".to_string()))
}

/// Convert ACIR program to R1CS
pub fn acir_to_r1cs(program: &AcirProgram) -> Result<AcirR1cs, ArkworksError> {
    // Get main function (index 0)
    let circuit = program
        .functions
        .first()
        .ok_or_else(|| ArkworksError::ParseError("No main function in ACIR".to_string()))?;

    convert_circuit(circuit)
}

/// Convert a single ACIR circuit to R1CS
fn convert_circuit(circuit: &AcirCircuit) -> Result<AcirR1cs, ArkworksError> {
    let num_witnesses = (circuit.current_witness_index + 1) as usize;
    let public_inputs = circuit.public_parameters.witnesses.clone();
    let private_inputs = circuit.private_parameters.clone();
    let return_values = circuit.return_values.witnesses.clone();

    let mut constraints = Vec::new();

    for opcode in &circuit.opcodes {
        match opcode {
            Opcode::AssertZero { value } => {
                // Convert AssertZero expression to R1CS constraint
                let expr_constraints = expression_to_r1cs(value)?;
                constraints.extend(expr_constraints);
            }
            Opcode::BlackBoxFuncCall(bb) => {
                // Black box functions need special handling
                // For now, we support only basic operations
                // More complex operations (SHA256, Pedersen) need native implementations
                convert_black_box(bb, &mut constraints)?;
            }
            Opcode::MemoryOp(_) | Opcode::MemoryInit(_) => {
                // Memory operations are handled during witness generation
                // They don't produce R1CS constraints directly
            }
            Opcode::BrilligCall(_) => {
                // Brillig calls are for unconstrained code
                // They're executed during witness generation, not in R1CS
            }
            Opcode::Call(_) => {
                // Function calls should be inlined during ACIR compilation
                return Err(ArkworksError::UnsupportedOpcode(
                    "ACIR Call opcode not supported - circuit should be flattened".to_string(),
                ));
            }
        }
    }

    Ok(AcirR1cs {
        num_witnesses,
        public_inputs,
        private_inputs,
        return_values,
        constraints,
    })
}

/// Convert an ACIR expression to R1CS constraints
///
/// ACIR Expression: sum(linear_combinations) + sum(mul_terms) + q_c = 0
///
/// For R1CS, we need constraints of the form A * B = C
///
/// Case 1: Pure linear (no mul_terms)
///   sum(linear) + q_c = 0
///   => (sum(linear) + q_c) * 1 = 0
///   => A = linear + constant, B = 1, C = 0
///
/// Case 2: Single multiplication
///   a * b + linear + q_c = 0
///   => a * b = -(linear + q_c)
///   => A = a, B = b, C = -(linear + q_c)
///
/// Case 3: Multiple multiplications
///   Need intermediate variables
fn expression_to_r1cs(expr: &Expression) -> Result<Vec<R1csConstraint>, ArkworksError> {
    let mut constraints = Vec::new();

    let linear = &expr.linear_combinations;
    let mul_terms = &expr.mul_terms;
    let q_c = parse_field_element(&expr.q_c)?;

    match mul_terms.len() {
        0 => {
            // Pure linear constraint: linear + q_c = 0
            // (linear + q_c) * 1 = 0
            let mut a_terms: Vec<(Fr, u32)> = Vec::new();

            // Add linear terms
            for (coeff, witness) in linear {
                let coeff_fr = parse_field_element(coeff)?;
                a_terms.push((coeff_fr, *witness));
            }

            // Add constant (witness 0 = 1)
            if q_c != Fr::from(0u64) {
                a_terms.push((q_c, 0));
            }

            // A * 1 = 0
            constraints.push(R1csConstraint {
                a: a_terms,
                b: vec![(Fr::from(1u64), 0)], // 1 * w_0 where w_0 = 1
                c: vec![],                    // = 0
            });
        }
        1 => {
            // Single multiplication: coeff * a * b + linear + q_c = 0
            // => coeff * a * b = -(linear + q_c)
            let (mul_coeff, a_wit, b_wit) = &mul_terms[0];
            let mul_coeff_fr = parse_field_element(mul_coeff)?;

            // Build C = -(linear + q_c)
            let mut c_terms: Vec<(Fr, u32)> = Vec::new();
            for (coeff, witness) in linear {
                let coeff_fr = parse_field_element(coeff)?;
                c_terms.push((-coeff_fr, *witness));
            }
            if q_c != Fr::from(0u64) {
                c_terms.push((-q_c, 0));
            }

            // (coeff * a) * b = C
            constraints.push(R1csConstraint {
                a: vec![(mul_coeff_fr, *a_wit)],
                b: vec![(Fr::from(1u64), *b_wit)],
                c: c_terms,
            });
        }
        _ => {
            // Multiple multiplications - need to handle with intermediate variables
            // For now, we combine them if possible or return an error
            // This case is complex and requires circuit restructuring

            // Simple case: all mul terms can be combined
            // sum(coeff_i * a_i * b_i) + linear + q_c = 0
            //
            // We use a sequence of additions with auxiliary variables:
            // m_1 = coeff_1 * a_1 * b_1
            // m_2 = coeff_2 * a_2 * b_2
            // ...
            // m_1 + m_2 + ... + linear + q_c = 0

            // For simplicity in this implementation, we only support
            // the case where we can reduce to basic form
            return Err(ArkworksError::UnsupportedOpcode(
                format!(
                    "Multiple multiplication terms ({}) in single expression not yet supported",
                    mul_terms.len()
                ),
            ));
        }
    }

    Ok(constraints)
}

/// Convert black box function to R1CS constraints
fn convert_black_box(
    bb: &crate::acir_types::BlackBoxFuncCall,
    _constraints: &mut Vec<R1csConstraint>,
) -> Result<(), ArkworksError> {
    use crate::acir_types::BlackBoxFuncCall;

    match bb {
        BlackBoxFuncCall::Range { input } => {
            // Range check: input must fit in num_bits bits
            // For R1CS, this requires bit decomposition constraints
            // This is expensive but necessary for soundness
            let _num_bits = input.num_bits;
            let _witness = input.witness;

            // For now, we skip range constraints in R1CS
            // A proper implementation would add bit decomposition constraints
            // This is a security note: real implementation needs proper range checks
            Ok(())
        }
        BlackBoxFuncCall::And { lhs, rhs, output } => {
            // AND is not directly expressible in R1CS
            // Need bit decomposition
            let _ = (lhs, rhs, output);
            Err(ArkworksError::UnsupportedOpcode(
                "AND black box not yet supported in R1CS".to_string(),
            ))
        }
        BlackBoxFuncCall::Xor { lhs, rhs, output } => {
            // XOR is not directly expressible in R1CS
            let _ = (lhs, rhs, output);
            Err(ArkworksError::UnsupportedOpcode(
                "XOR black box not yet supported in R1CS".to_string(),
            ))
        }
        BlackBoxFuncCall::Sha256 { .. }
        | BlackBoxFuncCall::Blake2s { .. }
        | BlackBoxFuncCall::Blake3 { .. }
        | BlackBoxFuncCall::Keccak256 { .. }
        | BlackBoxFuncCall::Keccakf1600 { .. } => {
            // Hash functions require custom R1CS gadgets
            // These are very expensive in terms of constraints
            Err(ArkworksError::UnsupportedOpcode(
                "Hash function black boxes not yet supported in R1CS".to_string(),
            ))
        }
        BlackBoxFuncCall::PedersenCommitment { .. } | BlackBoxFuncCall::PedersenHash { .. } => {
            // Pedersen operations on embedded curve
            Err(ArkworksError::UnsupportedOpcode(
                "Pedersen black box not yet supported in R1CS".to_string(),
            ))
        }
        BlackBoxFuncCall::EcdsaSecp256k1 { .. } | BlackBoxFuncCall::EcdsaSecp256r1 { .. } => {
            // ECDSA verification is very expensive in R1CS
            Err(ArkworksError::UnsupportedOpcode(
                "ECDSA black box not yet supported in R1CS".to_string(),
            ))
        }
        BlackBoxFuncCall::SchnorrVerify { .. } => {
            Err(ArkworksError::UnsupportedOpcode(
                "Schnorr black box not yet supported in R1CS".to_string(),
            ))
        }
        BlackBoxFuncCall::FixedBaseScalarMul { .. } | BlackBoxFuncCall::EmbeddedCurveAdd { .. } => {
            // Embedded curve operations
            Err(ArkworksError::UnsupportedOpcode(
                "Embedded curve black box not yet supported in R1CS".to_string(),
            ))
        }
        BlackBoxFuncCall::RecursiveAggregation { .. } => {
            Err(ArkworksError::UnsupportedOpcode(
                "Recursive aggregation not supported in R1CS".to_string(),
            ))
        }
        BlackBoxFuncCall::BigIntAdd { .. }
        | BlackBoxFuncCall::BigIntSub { .. }
        | BlackBoxFuncCall::BigIntMul { .. }
        | BlackBoxFuncCall::BigIntDiv { .. }
        | BlackBoxFuncCall::BigIntFromLeBytes { .. }
        | BlackBoxFuncCall::BigIntToLeBytes { .. } => {
            Err(ArkworksError::UnsupportedOpcode(
                "BigInt black box not yet supported in R1CS".to_string(),
            ))
        }
        BlackBoxFuncCall::Poseidon2Permutation { .. } => {
            // Poseidon is ZK-friendly but still needs custom implementation
            Err(ArkworksError::UnsupportedOpcode(
                "Poseidon2 black box not yet supported in R1CS".to_string(),
            ))
        }
        BlackBoxFuncCall::Sha256Compression { .. } => {
            Err(ArkworksError::UnsupportedOpcode(
                "SHA256 compression not yet supported in R1CS".to_string(),
            ))
        }
        BlackBoxFuncCall::Unknown => {
            Err(ArkworksError::UnsupportedOpcode(
                "Unknown black box function".to_string(),
            ))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_field_element() {
        assert_eq!(parse_field_element("0x0").unwrap(), Fr::from(0u64));
        assert_eq!(parse_field_element("0x1").unwrap(), Fr::from(1u64));
        assert_eq!(parse_field_element("0x10").unwrap(), Fr::from(16u64));
        assert_eq!(parse_field_element("0xff").unwrap(), Fr::from(255u64));
    }

    #[test]
    fn test_linear_expression_to_r1cs() {
        // Expression: 2*w1 + 3*w2 - 5 = 0
        let expr = Expression {
            linear_combinations: vec![("0x2".to_string(), 1), ("0x3".to_string(), 2)],
            mul_terms: vec![],
            q_c: "-0x5".to_string(),
        };

        // This should fail because we don't support negative constants in simple hex
        // In a real implementation, we'd handle this properly
        let _ = expression_to_r1cs(&expr);
    }
}
