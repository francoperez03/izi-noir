# IZI-NOIR Architecture Guide

> Deep technical documentation of the IZI-NOIR system design

This document provides a comprehensive overview of the IZI-NOIR architecture, including the SDK design patterns, transpilation pipeline, proving systems, and Solana contract architecture.

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              IZI-NOIR System                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                           SDK Layer                                  │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │    │
│  │  │   Parser    │  │  Generator  │  │   Prover    │                 │    │
│  │  │  (Acorn)    │──│   (Noir)    │──│ (BB/Ark/SS) │                 │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                 │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                        Solana Layer                                  │    │
│  │  ┌─────────────────────────────────────────────────────────────┐   │    │
│  │  │                   On-Chain Verifier                          │   │    │
│  │  │  VK Account ──▶ BN254 Pairing ──▶ Verification Result       │   │    │
│  │  └─────────────────────────────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## SDK Architecture

### Clean Architecture

The SDK follows Clean Architecture principles with three distinct layers:

```
┌─────────────────────────────────────────────────────────────────┐
│                       Domain Layer                               │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Entities: ParsedCircuit, Expr, Statement                 │   │
│  │  Types: ProofData, ProofResult, SolanaProofData          │   │
│  │  Interfaces: IParser, IProvingSystem, ICompiler          │   │
│  └──────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│                     Application Layer                            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  CreateProofUseCase: Orchestrates the full pipeline      │   │
│  │  NoirGenerator: Converts AST to Noir source code         │   │
│  └──────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│                    Infrastructure Layer                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Parser: AcornParser, ExpressionParser, StatementParser  │   │
│  │  Proving Systems: Barretenberg, ArkworksWasm, Sunspot    │   │
│  │  WASM: wasmInit, Noir compiler bindings                  │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Design Patterns

#### Strategy Pattern (Proving Systems)

The `IProvingSystem` interface allows swapping backends without changing client code:

```typescript
interface IProvingSystem extends ICompiler, IProver, IVerifier {}

interface ICompiler {
  compile(noirCode: string): Promise<CompiledCircuit>;
}

interface IProver {
  generateProof(circuit: CompiledCircuit, inputs: InputMap): Promise<ProofData>;
}

interface IVerifier {
  verifyProof(circuit: CompiledCircuit, proof: Uint8Array, publicInputs: string[]): Promise<boolean>;
}
```

Implementations:
- `Barretenberg` - UltraHonk via @aztec/bb.js
- `ArkworksWasm` - Groth16 via WASM module
- `Sunspot` - Groth16 via CLI tools

#### Composite Pattern (AST)

Circuit AST uses recursive composition:

```typescript
type Expr =
  | BinaryExpr      // left op right
  | UnaryExpr       // !operand, -operand
  | IdentifierExpr  // variable name
  | LiteralExpr     // 42, true
  | MemberExpr      // arr[i], arr.length
  | ArrayLiteralExpr // [a, b, c]
  | CallExpr        // func(args)
  | IfExpr;         // cond ? a : b

type Statement =
  | AssertStatement
  | VariableDeclaration
  | AssignmentStatement
  | IfStatement
  | ForStatement;
```

#### Dependency Injection

The `CreateProofUseCase` receives dependencies at construction:

```typescript
interface CreateProofDependencies {
  parser: IParser;
  provingSystem: IProvingSystem;
}

const useCase = new CreateProofUseCase({
  parser: new AcornParser(),
  provingSystem: new Barretenberg(),
});
```

Container factories provide preconfigured instances:

```typescript
const defaultDeps = createDefaultContainer();      // Barretenberg
const arkworksDeps = createArkworksWasmContainer(); // Arkworks
```

### File Structure

```
packages/sdk/src/
├── index.ts                    # Public exports
├── IziNoir.ts                  # Main unified class
├── container.ts                # Legacy DI containers
│
├── domain/
│   ├── types.ts                # ProofResult, ProofData, etc.
│   ├── entities/
│   │   └── circuit.ts          # ParsedCircuit, Expr, Statement
│   ├── interfaces/
│   │   ├── parsing/
│   │   │   └── IParser.ts
│   │   └── proving/
│   │       ├── ICompiler.ts
│   │       ├── IProver.ts
│   │       ├── IVerifier.ts
│   │       └── IProvingSystem.ts
│   └── types/
│       └── provider.ts         # Provider enum
│
├── application/
│   ├── CreateProofUseCase.ts   # Main orchestration
│   └── services/
│       └── NoirGenerator.ts    # AST → Noir code
│
├── infra/
│   ├── parser/
│   │   ├── AcornParser.ts      # Main parser
│   │   ├── ExpressionParser.ts # Expression handling
│   │   ├── StatementParser.ts  # Statement handling
│   │   ├── ForLoopParser.ts    # Loop validation
│   │   ├── operatorMaps.ts     # Operator mappings
│   │   └── utils.ts
│   ├── provingSystems/
│   │   ├── Barretenberg.ts
│   │   ├── ArkworksWasm.ts
│   │   └── Sunspot.ts
│   └── wasm/
│       └── wasmInit.ts         # WASM initialization
│
└── providers/
    ├── barretenberg.ts         # Public provider export
    ├── arkworks.ts
    ├── sunspot.ts
    └── solana.ts               # Solana integration helpers
```

## Transpilation Pipeline

### Complete Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Step 1: JavaScript Function                                                 │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  ([expected], [secret]) => {                                          │  │
│  │    assert(secret * secret == expected);                               │  │
│  │  }                                                                    │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ AcornParser.parse()
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Step 2: AST Extraction (Acorn)                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  ArrowFunctionExpression {                                            │  │
│  │    params: [ArrayPattern([expected]), ArrayPattern([secret])],       │  │
│  │    body: BlockStatement {                                             │  │
│  │      body: [ExpressionStatement(CallExpression(assert, ...))]        │  │
│  │    }                                                                  │  │
│  │  }                                                                    │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ StatementParser + ExpressionParser
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Step 3: ParsedCircuit                                                       │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  {                                                                    │  │
│  │    publicParams: [{ name: 'expected', index: 0 }],                   │  │
│  │    privateParams: [{ name: 'secret', index: 0 }],                    │  │
│  │    statements: [{                                                     │  │
│  │      kind: 'assert',                                                 │  │
│  │      condition: {                                                     │  │
│  │        kind: 'binary', operator: '==',                               │  │
│  │        left: { kind: 'binary', operator: '*', ... },                 │  │
│  │        right: { kind: 'identifier', name: 'expected' }               │  │
│  │      }                                                                │  │
│  │    }]                                                                 │  │
│  │  }                                                                    │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ NoirGenerator.generate()
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Step 4: Noir Source Code                                                    │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  fn main(secret: Field, expected: pub Field) {                       │  │
│  │      assert(secret * secret == expected);                            │  │
│  │  }                                                                    │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ noir_wasm.compile()
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Step 5: CompiledCircuit                                                     │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  {                                                                    │  │
│  │    bytecode: "H4sIAAAA...",   // ACIR bytecode (gzip+base64)        │  │
│  │    abi: { parameters: [...], return_type: null }                     │  │
│  │  }                                                                    │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ IProvingSystem.generateProof()
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Step 6: Proof Generation                                                    │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  1. Execute circuit with inputs → witness map                        │  │
│  │  2. Generate proof from witness → proof bytes                        │  │
│  │  3. Extract public inputs → string array                             │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Step 7: ProofData                                                           │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  {                                                                    │  │
│  │    proof: Uint8Array(256),        // 256 bytes for Groth16          │  │
│  │    publicInputs: ["100"]           // Hex-encoded field elements     │  │
│  │  }                                                                    │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Parser Components

#### AcornParser

Entry point for JavaScript parsing:

```typescript
class AcornParser implements IParser {
  parse(circuitFn: CircuitFunction, publicInputs, privateInputs): ParsedCircuit {
    const source = circuitFn.toString();
    const ast = acorn.parse(source, { ecmaVersion: 2020 });

    // Find arrow function or function expression
    const funcNode = findFunctionNode(ast);

    // Extract parameters from destructuring patterns
    const [publicParams, privateParams] = extractParams(funcNode);

    // Parse function body statements
    const statements = statementParser.parseStatements(funcNode.body);

    return { publicParams, privateParams, statements };
  }
}
```

#### ExpressionParser

Handles 8 expression types:

| Expression Type | JavaScript | Noir Output |
|-----------------|------------|-------------|
| Identifier | `x` | `x` |
| Literal | `42`, `true` | `42`, `true` |
| Binary | `a + b` | `a + b` |
| Unary | `!x`, `-y` | `!x`, -y` |
| Member | `arr[i]`, `arr.length` | `arr[i]`, `arr.len()` |
| Array | `[1, 2, 3]` | `[1, 2, 3]` |
| Call | `func(a)` | `func(a)` |
| Conditional | `a ? b : c` | `if a { b } else { c }` |

#### StatementParser

Handles 6 statement types:

| Statement Type | JavaScript | Noir Output |
|----------------|------------|-------------|
| Variable Declaration | `let x = 5` | `let x: Field = 5;` |
| Mutable Variable | `let mut_x = 0` | `let mut x: Field = 0;` |
| Assert | `assert(cond)` | `assert(cond);` |
| Assignment | `x = y` | `x = y;` |
| If Statement | `if (c) {...}` | `if c {...}` |
| For Loop | `for (let i=0;i<n;i++)` | `for i in 0..n` |

### NoirGenerator

Converts ParsedCircuit to Noir source:

```typescript
class NoirGenerator {
  generate(circuit: ParsedCircuit): string {
    const params = this.generateParams(circuit);
    const body = this.generateBody(circuit.statements);
    return `fn main(${params}) {\n${body}\n}`;
  }

  private generateParams(circuit): string {
    // Private params first (no pub modifier)
    const priv = circuit.privateParams.map(p => `${p.name}: Field`);
    // Public params with pub modifier
    const pub = circuit.publicParams.map(p => `${p.name}: pub Field`);
    return [...priv, ...pub].join(', ');
  }
}
```

## Proving System Implementations

### Barretenberg

Uses @aztec/bb.js for UltraHonk proving:

```typescript
class Barretenberg implements IProvingSystem {
  async compile(noirCode: string): Promise<CompiledCircuit> {
    const fm = createFileManager('/temp');
    fm.writeFile('src/main.nr', noirCode);
    fm.writeFile('Nargo.toml', NARGO_CONFIG);

    const result = await noirWasm.compile(fm, '/');
    return result.program;
  }

  async generateProof(circuit, inputs): Promise<ProofData> {
    const noir = new Noir(circuit);
    const { witness } = await noir.execute(inputs);

    const backend = new UltraHonkBackend(circuit.bytecode);
    const proof = await backend.generateProof(witness);

    return { proof: proof.proof, publicInputs: proof.publicInputs };
  }
}
```

**Characteristics:**
- Proof size: ~16 KB
- Browser compatible (WASM)
- Fast proving

### ArkworksWasm

Uses arkworks-groth16-wasm for Groth16:

```typescript
class ArkworksWasm implements IProvingSystem {
  async compile(noirCode: string): Promise<ArkworksCompiledCircuit> {
    // Compile Noir code
    const baseCircuit = await this.compileNoir(noirCode);

    // Extract ACIR for Arkworks
    const acirJson = extractAcir(baseCircuit);

    // Run trusted setup (or load cached keys)
    const { provingKey, verifyingKey } = await arkworks.setup(acirJson);

    return {
      ...baseCircuit,
      __arkworks: true,
      acirJson,
      provingKey,
      verifyingKeyGnark: verifyingKey,
    };
  }

  async generateProof(circuit, inputs): Promise<ProofData> {
    const noir = new Noir(circuit);
    const { witness } = await noir.execute(inputs);

    const proof = await arkworks.prove(
      circuit.provingKey,
      circuit.acirJson,
      witnessToJson(witness)
    );

    return {
      proof: proof.proof_gnark,  // gnark format for Solana
      publicInputs: proof.public_inputs,
    };
  }
}
```

**Characteristics:**
- Proof size: ~256 bytes
- Browser compatible (100% WASM)
- Solana-optimized (gnark format)
- Key caching for performance

### Sunspot

Uses CLI tools (nargo, sunspot) for Groth16:

```typescript
class Sunspot implements IProvingSystem {
  async compile(noirCode: string): Promise<CompiledCircuit> {
    // Create Noir project
    await this.createProject(noirCode);

    // nargo compile
    await this.exec('nargo compile');

    // sunspot compile (ACIR → R1CS)
    await this.exec('sunspot compile');

    // sunspot setup (generate keys)
    await this.exec('sunspot setup');

    return this.loadCircuit();
  }

  async generateProof(circuit, inputs): Promise<ProofData> {
    // nargo execute (generate witness)
    await this.writeInputs(inputs);
    await this.exec('nargo execute');

    // sunspot prove
    const proof = await this.exec('sunspot prove');

    return { proof, publicInputs: this.extractPublicInputs() };
  }
}
```

**Characteristics:**
- Proof size: ~324 bytes
- Node.js only
- Supports pre-compiled circuits
- Production-ready

## Solana Contract Architecture

### Groth16 Verification

The on-chain verifier checks the pairing equation:

```
e(A, B) · e(-α, β) · e(Kx, -γ) · e(C, -δ) = 1
```

Implementation in `verifier.rs`:

```rust
pub fn verify_groth16(
    vk: &VerifyingKeyAccount,
    proof: &Groth16Proof,
    public_inputs: &[[u8; 32]]
) -> Result<()> {
    // 1. Prepare public inputs
    // Kx = k[0] + Σ(public_inputs[i] × k[i+1])
    let kx = prepare_inputs(vk, public_inputs)?;

    // 2. Negate curve elements
    let neg_alpha = negate_g1(&vk.alpha_g1)?;
    let neg_gamma = negate_g2(&vk.gamma_g2)?;
    let neg_delta = negate_g2(&vk.delta_g2)?;

    // 3. Construct pairing input
    // [A, B, -α, β, Kx, -γ, C, -δ]
    let pairing_input = construct_pairing_input(
        proof, neg_alpha, &vk.beta_g2, kx, neg_gamma, neg_delta
    );

    // 4. Execute pairing check
    let result = alt_bn128_pairing_be(&pairing_input)?;

    // 5. Verify result equals 1 (identity in GT)
    require!(result == PAIRING_IDENTITY, VerifierError::ProofVerificationFailed);

    Ok(())
}
```

### Account Structure

```rust
#[account]
pub struct VerifyingKeyAccount {
    pub authority: Pubkey,        // 32 bytes
    pub nr_pubinputs: u8,         // 1 byte
    pub alpha_g1: [u8; 64],       // G1 point
    pub beta_g2: [u8; 128],       // G2 point
    pub gamma_g2: [u8; 128],      // G2 point
    pub delta_g2: [u8; 128],      // G2 point
    pub k: Vec<[u8; 64]>,         // (n+1) G1 points
}
```

### BN254 Syscalls

The program uses Solana's native BN254 operations:

| Syscall | Purpose |
|---------|---------|
| `alt_bn128_pairing_be` | Pairing check |
| `alt_bn128_g1_mul` | G1 scalar multiplication |
| `alt_bn128_g1_add` | G1 point addition |

These syscalls are more efficient than library implementations.

## Data Flow: SDK to Solana

```
┌────────────────────────────────────────────────────────────────────────────┐
│                            Browser/Node.js                                  │
│                                                                             │
│  1. IziNoir.init({ provider: Provider.Arkworks })                          │
│                                                                             │
│  2. izi.compile(noirCode)                                                  │
│     └── Returns: ArkworksCompiledCircuit with VK                           │
│                                                                             │
│  3. izi.proveForSolana(inputs)                                             │
│     └── Returns: SolanaProofData {                                         │
│           verifyingKey: { bytes, nrPublicInputs },                         │
│           proof: { bytes },                                                 │
│           publicInputs: { bytes }                                          │
│         }                                                                   │
└────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                            Solana Transaction                               │
│                                                                             │
│  4. program.methods.initVkFromBytes(nrPublicInputs, vkBytes)               │
│     └── Creates: VerifyingKeyAccount                                       │
│                                                                             │
│  5. program.methods.verifyProof(proofBytes, publicInputs)                  │
│     └── Executes: BN254 pairing check                                      │
│     └── Returns: Ok(()) if valid                                           │
└────────────────────────────────────────────────────────────────────────────┘
```

## Key Design Decisions

### Why JavaScript Transpilation?

1. **Accessibility** - Most developers know JavaScript
2. **Familiarity** - `assert()` is intuitive
3. **Tooling** - Leverage existing JS tooling (linters, formatters, tests)
4. **Iteration Speed** - No new language to learn

### Why Multiple Proving Backends?

| Use Case | Best Backend | Reason |
|----------|--------------|--------|
| Development | Barretenberg | Fast proving |
| Browser Demo | Either | Both support WASM |
| Solana | Arkworks | 256-byte proofs |
| Production CLI | Sunspot | Pre-compiled circuits |

### Why gnark Format for Solana?

1. **Compatibility** - Standard format across tooling
2. **Size** - 256 bytes (A + B + C)
3. **Syscall Support** - Direct use with Solana BN254 ops

### Why Circuit-Agnostic Verifier?

1. **Flexibility** - One program, many circuits
2. **Deployment** - No recompilation for new circuits
3. **Cost** - Amortize deployment cost across circuits
4. **Upgrades** - Add circuits without new program deployment

## Performance Characteristics

### Proof Generation Time (Approximate)

| Backend | Simple Circuit | Complex Circuit |
|---------|----------------|-----------------|
| Barretenberg | ~2-5s | ~10-30s |
| Arkworks | ~5-10s | ~20-60s |
| Sunspot | ~3-8s | ~15-45s |

### Proof Sizes

| Backend | Proof Size | Notes |
|---------|------------|-------|
| Barretenberg | ~16 KB | UltraHonk |
| Arkworks | 256 bytes | Groth16 |
| Sunspot | 324 bytes | Groth16 + metadata |

### On-Chain Costs

| Operation | Compute Units | Transaction Size |
|-----------|--------------|------------------|
| init_vk (1 input) | ~5,000 | ~700 bytes |
| verify_proof | ~200,000-400,000 | ~400 bytes |

## Security Considerations

### Trust Assumptions

1. **Trusted Setup** - Groth16 requires trusted setup (toxic waste must be discarded)
2. **Circuit Correctness** - Transpiler must preserve semantics
3. **WASM Integrity** - WASM modules must be authentic

### Private Input Handling

- Private inputs never leave the prover
- Only proof and public inputs are transmitted
- Memory should be cleared after proving

### On-Chain Security

- VK accounts have authority control
- Proof replay is possible (stateless verification)
- Applications must add nonces if replay prevention needed

## Future Considerations

### Potential Enhancements

1. **More JS Patterns** - Support objects, more array operations
2. **Recursive Proofs** - Proof aggregation
3. **BLS12-381** - Alternative curve support
4. **PLONK Backend** - Universal trusted setup

### Scalability

1. **Proof Aggregation** - Batch multiple proofs
2. **Parallel Proving** - Multi-threaded proof generation
3. **Circuit Caching** - Persistent compiled circuits
