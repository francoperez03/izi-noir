//! ACIR (Abstract Circuit Intermediate Representation) types.
//!
//! These types represent the ACIR format output by the Noir compiler.
//! We parse these to convert to R1CS constraints for Groth16 proving.

use serde::{Deserialize, Serialize};

/// Witness index in the circuit
pub type WitnessIndex = u32;

/// Field element as a hex string (0x...)
pub type FieldElement = String;

/// Complete ACIR program from Noir compiler output
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AcirProgram {
    /// List of functions (usually just main)
    pub functions: Vec<AcirCircuit>,
    /// Unconstrained functions (for unconstrained Noir code)
    #[serde(default)]
    pub unconstrained_functions: Vec<serde_json::Value>,
}

/// A single ACIR circuit (function)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AcirCircuit {
    /// Current witness index (total witnesses)
    pub current_witness_index: u32,
    /// Expression width for optimization
    #[serde(default)]
    pub expression_width: Option<ExpressionWidth>,
    /// List of opcodes
    pub opcodes: Vec<Opcode>,
    /// Private parameters (witness indices)
    pub private_parameters: Vec<WitnessIndex>,
    /// Public parameters
    pub public_parameters: PublicParameters,
    /// Return values
    pub return_values: PublicInputs,
    /// Assertion payloads for error messages
    #[serde(default)]
    pub assert_messages: Vec<serde_json::Value>,
}

/// Expression width for circuit optimization
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "width")]
pub enum ExpressionWidth {
    Unbounded,
    Bounded(u32),
}

/// Public parameters specification
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PublicParameters {
    /// Witness indices that are public inputs
    #[serde(default)]
    pub witnesses: Vec<WitnessIndex>,
}

/// Public inputs specification (also used for return values)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PublicInputs {
    /// Witness indices that are public inputs/return values
    #[serde(default)]
    pub witnesses: Vec<WitnessIndex>,
}

/// ACIR Opcode - each represents a constraint or operation
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum Opcode {
    /// Arithmetic expression: sum of linear terms + mul terms + constant = 0
    #[serde(rename = "AssertZero")]
    AssertZero { value: Expression },

    /// Black box function call (SHA256, Pedersen, etc.)
    #[serde(rename = "BlackBoxFuncCall")]
    BlackBoxFuncCall(BlackBoxFuncCall),

    /// Memory operations
    #[serde(rename = "MemoryOp")]
    MemoryOp(MemoryOp),

    /// Memory initialization
    #[serde(rename = "MemoryInit")]
    MemoryInit(MemoryInit),

    /// Brillig VM call (for unconstrained code)
    #[serde(rename = "BrilligCall")]
    BrilligCall(BrilligCall),

    /// Call to another ACIR function
    #[serde(rename = "Call")]
    Call(AcirCall),
}

/// Arithmetic expression: linear_combinations + mul_terms + q_c = 0
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Expression {
    /// Linear terms: [(coefficient, witness)]
    #[serde(default)]
    pub linear_combinations: Vec<(FieldElement, WitnessIndex)>,
    /// Quadratic terms: [(coefficient, witness_a, witness_b)]
    #[serde(default)]
    pub mul_terms: Vec<(FieldElement, WitnessIndex, WitnessIndex)>,
    /// Constant term
    #[serde(default)]
    pub q_c: FieldElement,
}

impl Default for Expression {
    fn default() -> Self {
        Self {
            linear_combinations: Vec::new(),
            mul_terms: Vec::new(),
            q_c: "0x0".to_string(),
        }
    }
}

/// Black box function call
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "name")]
pub enum BlackBoxFuncCall {
    #[serde(rename = "SHA256")]
    Sha256 {
        inputs: Vec<FunctionInput>,
        outputs: Vec<WitnessIndex>,
    },
    #[serde(rename = "Blake2s")]
    Blake2s {
        inputs: Vec<FunctionInput>,
        outputs: Vec<WitnessIndex>,
    },
    #[serde(rename = "Blake3")]
    Blake3 {
        inputs: Vec<FunctionInput>,
        outputs: Vec<WitnessIndex>,
    },
    #[serde(rename = "Keccak256")]
    Keccak256 {
        inputs: Vec<FunctionInput>,
        outputs: Vec<WitnessIndex>,
    },
    #[serde(rename = "Keccakf1600")]
    Keccakf1600 {
        inputs: Vec<FunctionInput>,
        outputs: Vec<WitnessIndex>,
    },
    #[serde(rename = "PedersenCommitment")]
    PedersenCommitment {
        inputs: Vec<FunctionInput>,
        domain_separator: u32,
        outputs: (WitnessIndex, WitnessIndex),
    },
    #[serde(rename = "PedersenHash")]
    PedersenHash {
        inputs: Vec<FunctionInput>,
        domain_separator: u32,
        output: WitnessIndex,
    },
    #[serde(rename = "EcdsaSecp256k1")]
    EcdsaSecp256k1 {
        public_key_x: Vec<FunctionInput>,
        public_key_y: Vec<FunctionInput>,
        signature: Vec<FunctionInput>,
        hashed_message: Vec<FunctionInput>,
        output: WitnessIndex,
    },
    #[serde(rename = "EcdsaSecp256r1")]
    EcdsaSecp256r1 {
        public_key_x: Vec<FunctionInput>,
        public_key_y: Vec<FunctionInput>,
        signature: Vec<FunctionInput>,
        hashed_message: Vec<FunctionInput>,
        output: WitnessIndex,
    },
    #[serde(rename = "SchnorrVerify")]
    SchnorrVerify {
        public_key_x: FunctionInput,
        public_key_y: FunctionInput,
        signature: Vec<FunctionInput>,
        message: Vec<FunctionInput>,
        output: WitnessIndex,
    },
    #[serde(rename = "FixedBaseScalarMul")]
    FixedBaseScalarMul {
        low: FunctionInput,
        high: FunctionInput,
        outputs: (WitnessIndex, WitnessIndex),
    },
    #[serde(rename = "EmbeddedCurveAdd")]
    EmbeddedCurveAdd {
        input1: (FunctionInput, FunctionInput, FunctionInput),
        input2: (FunctionInput, FunctionInput, FunctionInput),
        outputs: (WitnessIndex, WitnessIndex, WitnessIndex),
    },
    #[serde(rename = "AND")]
    And {
        lhs: FunctionInput,
        rhs: FunctionInput,
        output: WitnessIndex,
    },
    #[serde(rename = "XOR")]
    Xor {
        lhs: FunctionInput,
        rhs: FunctionInput,
        output: WitnessIndex,
    },
    #[serde(rename = "RANGE")]
    Range { input: FunctionInput },
    #[serde(rename = "RecursiveAggregation")]
    RecursiveAggregation {
        verification_key: Vec<FunctionInput>,
        proof: Vec<FunctionInput>,
        public_inputs: Vec<FunctionInput>,
        key_hash: FunctionInput,
    },
    #[serde(rename = "BigIntAdd")]
    BigIntAdd {
        lhs: u32,
        rhs: u32,
        output: u32,
    },
    #[serde(rename = "BigIntSub")]
    BigIntSub {
        lhs: u32,
        rhs: u32,
        output: u32,
    },
    #[serde(rename = "BigIntMul")]
    BigIntMul {
        lhs: u32,
        rhs: u32,
        output: u32,
    },
    #[serde(rename = "BigIntDiv")]
    BigIntDiv {
        lhs: u32,
        rhs: u32,
        output: u32,
    },
    #[serde(rename = "BigIntFromLeBytes")]
    BigIntFromLeBytes {
        inputs: Vec<FunctionInput>,
        modulus: Vec<u8>,
        output: u32,
    },
    #[serde(rename = "BigIntToLeBytes")]
    BigIntToLeBytes {
        input: u32,
        outputs: Vec<WitnessIndex>,
    },
    #[serde(rename = "Poseidon2Permutation")]
    Poseidon2Permutation {
        inputs: Vec<FunctionInput>,
        outputs: Vec<WitnessIndex>,
        len: u32,
    },
    #[serde(rename = "Sha256Compression")]
    Sha256Compression {
        inputs: Vec<FunctionInput>,
        hash_values: Vec<FunctionInput>,
        outputs: Vec<WitnessIndex>,
    },
    /// Catch-all for unknown black box functions
    #[serde(other)]
    Unknown,
}

/// Input to a black box function
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FunctionInput {
    /// Witness index
    pub witness: WitnessIndex,
    /// Number of bits (for range constraints)
    pub num_bits: u32,
}

/// Memory operation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryOp {
    pub block_id: u32,
    pub op: MemoryOpKind,
    pub index: Expression,
    pub value: Expression,
}

/// Memory operation kind
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryOpKind {
    pub inner: u8, // 0 = read, 1 = write
}

/// Memory initialization
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryInit {
    pub block_id: u32,
    pub init: Vec<WitnessIndex>,
}

/// Brillig VM call (for unconstrained Noir code)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BrilligCall {
    pub id: u32,
    pub inputs: Vec<BrilligInputs>,
    pub outputs: Vec<BrilligOutputs>,
    #[serde(default)]
    pub predicate: Option<Expression>,
}

/// Brillig inputs
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum BrilligInputs {
    Single(Expression),
    Array(Vec<Expression>),
    MemoryArray(u32),
}

/// Brillig outputs
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum BrilligOutputs {
    Simple(WitnessIndex),
    Array(Vec<WitnessIndex>),
}

/// Call to another ACIR function
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AcirCall {
    pub id: u32,
    pub inputs: Vec<Expression>,
    pub outputs: Vec<WitnessIndex>,
    #[serde(default)]
    pub predicate: Option<Expression>,
}

/// Compiled Noir circuit (full JSON output)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompiledNoirCircuit {
    /// Base64-encoded, gzipped ACIR bytecode
    pub bytecode: String,
    /// ABI describing inputs/outputs
    pub abi: CircuitAbi,
    /// Debug symbols (optional)
    #[serde(default)]
    pub debug_symbols: Option<String>,
    /// File map for source locations
    #[serde(default)]
    pub file_map: Option<serde_json::Value>,
}

/// Circuit ABI (Application Binary Interface)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CircuitAbi {
    /// Input/output parameters
    pub parameters: Vec<AbiParameter>,
    /// Return type (if any)
    #[serde(default)]
    pub return_type: Option<AbiType>,
    /// Error types for assertions
    #[serde(default)]
    pub error_types: serde_json::Value,
}

/// ABI parameter
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AbiParameter {
    /// Parameter name
    pub name: String,
    /// Parameter type
    #[serde(rename = "type")]
    pub typ: AbiType,
    /// Visibility (public, private, databus)
    pub visibility: AbiVisibility,
}

/// ABI type
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "kind")]
pub enum AbiType {
    #[serde(rename = "field")]
    Field,
    #[serde(rename = "boolean")]
    Boolean,
    #[serde(rename = "integer")]
    Integer { sign: String, width: u32 },
    #[serde(rename = "string")]
    String { length: u32 },
    #[serde(rename = "array")]
    Array { length: u32, #[serde(rename = "type")] typ: Box<AbiType> },
    #[serde(rename = "struct")]
    Struct { path: String, fields: Vec<(String, AbiType)> },
    #[serde(rename = "tuple")]
    Tuple { fields: Vec<AbiType> },
}

/// ABI visibility
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum AbiVisibility {
    Private,
    Public,
    #[serde(rename = "databus")]
    DataBus,
}
