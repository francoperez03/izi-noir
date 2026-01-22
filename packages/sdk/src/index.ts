// =============================================================================
// Main API - Unified IziNoir class
// =============================================================================

export { IziNoir, Provider, type IziNoirConfig, type CircuitPaths } from './IziNoir.js';

// =============================================================================
// WASM Initialization (for advanced users)
// =============================================================================

export { initNoirWasm, isWasmInitialized, markWasmInitialized } from './infra/wasm/wasmInit.js';

// =============================================================================
// Proving Systems (direct use)
// =============================================================================

// Browser-compatible providers
export { Barretenberg } from './infra/provingSystems/Barretenberg.js';
export { ArkworksWasm, isArkworksCircuit } from './infra/provingSystems/ArkworksWasm.js';
export type {
  ArkworksWasmConfig,
  ArkworksCompiledCircuit,
  ArkworksWasmModule,
  ArkworksSetupResult,
  ArkworksProofResult,
} from './infra/provingSystems/ArkworksWasm.js';

// Note: Sunspot is Node.js only and NOT exported from the main entry point.
// Import from '@izi-noir/sdk/sunspot' for Sunspot support.

// =============================================================================
// Interfaces
// =============================================================================

export type {
  IProvingSystem,
  ICompiler,
  IProver,
  IVerifier,
} from './domain/interfaces/proving/index.js';
export type { IParser } from './domain/interfaces/parsing/index.js';

// =============================================================================
// Domain Types
// =============================================================================

export type {
  ProofResult,
  ProofTimings,
  ProofData,
  CircuitFunction,
  InputValue,
  CompiledCircuit,
  InputMap,
  ProverOptions,
  VerifierOptions,
} from './domain/types.js';

export type {
  ParsedCircuit,
  CircuitParam,
  Expr,
  BinaryExpr,
  IdentifierExpr,
  LiteralExpr,
  MemberExpr,
  BinaryOperator,
  Statement,
  AssertStatement,
} from './domain/entities/circuit.js';

// =============================================================================
// Legacy API (backwards compatibility)
// =============================================================================

export {
  createProof,
  createDefaultContainer,
  createArkworksWasmContainer,
  createArkworksProof,
} from './container.js';
export type { CreateProofOptions } from './container.js';

// For DI users
export { CreateProofUseCase } from './application/CreateProofUseCase.js';
export type { CreateProofDependencies } from './application/CreateProofUseCase.js';

// Parser implementation
export { AcornParser } from './infra/parser/AcornParser.js';

// Services
export { generateNoir } from './application/services/NoirGenerator.js';

// =============================================================================
// Solana Utilities
// =============================================================================

export { SolanaTransactionBuilder } from './solana/TransactionBuilder.js';
export type {
  TransactionBuilderConfig,
  InstructionData,
  InitVkAccounts,
  VerifyProofAccounts,
  CloseVkAccounts,
  InitAndVerifyInstructions,
} from './solana/TransactionBuilder.js';

// Solana proof data helpers (from providers/solana.ts)
export {
  IZI_NOIR_PROGRAM_ID,
  parseVerifyingKey,
  parseProof,
  parsePublicInputs,
  calculateVkAccountSize,
  calculateVkAccountRent,
  buildInitVkFromBytesData,
  buildVerifyProofData,
} from './providers/solana.js';
export type { SolanaProofData } from './domain/types.js';

// VK Deployment Manager
export {
  VkDeploymentManager,
  createNodeVkDeploymentManager,
  NETWORK_ENDPOINTS,
} from './deployment/VkDeploymentManager.js';
export type {
  VkDeploymentManagerConfig,
  VkDeployment,
  EnsureDeployedOptions,
  DeploymentResult,
  DeploymentsState,
  SolanaNetwork,
  SignerInfo,
} from './deployment/VkDeploymentManager.js';

// =============================================================================
// Circuit Registry
// =============================================================================

export {
  CircuitRegistry,
  getGlobalRegistry,
  defineCircuit,
} from './registry/CircuitRegistry.js';
export type {
  CircuitDefinition,
  CircuitInputDef,
  RegisteredCircuit,
  GetCircuitOptions,
  CircuitRegistryExport,
  CircuitExportEntry,
} from './registry/CircuitRegistry.js';

// =============================================================================
// Off-Chain Verifier
// =============================================================================

export {
  OffchainVerifier,
  createVerifierMiddleware,
  createVerificationEndpoint,
  batchVerify,
} from './server/OffchainVerifier.js';
export type {
  OffchainVerifierConfig,
  OffchainCircuitConfig,
  VerifyRequest,
  VerifyResult,
  VerificationEndpointOptions,
  BatchVerifyResult,
} from './server/OffchainVerifier.js';
