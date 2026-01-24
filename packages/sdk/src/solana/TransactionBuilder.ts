/**
 * Transaction builder for IZI-NOIR Solana program.
 *
 * Provides a high-level API for building Solana transactions without
 * requiring Anchor or deep knowledge of instruction formats.
 *
 * @example
 * ```typescript
 * import { SolanaTransactionBuilder } from '@izi-noir/sdk';
 *
 * const builder = new SolanaTransactionBuilder({
 *   computeUnits: 400_000,
 *   programId: 'EYhRED7EuMyyVjx57aDXUD9h6ArnEKng64qtz8999KrS',
 * });
 *
 * // Build init VK transaction
 * const initData = builder.buildInitVkInstructionData(solanaProofData);
 *
 * // Build verify proof transaction
 * const verifyData = builder.buildVerifyProofInstructionData(
 *   solanaProofData.proof.bytes,
 *   solanaProofData.publicInputs.bytes
 * );
 * ```
 *
 * @module @izi-noir/sdk/solana
 */

import type { SolanaProofData } from '../domain/types.js';
import {
  IZI_NOIR_PROGRAM_ID,
  PROOF_SIZE,
  FIELD_SIZE,
  G1_SIZE,
  G2_SIZE,
  buildInitVkFromBytesData,
  buildVerifyProofData,
  calculateVkAccountSize,
  calculateVkAccountRent,
} from '../providers/solana.js';

// Re-export for convenience
export { IZI_NOIR_PROGRAM_ID, calculateVkAccountSize, calculateVkAccountRent };

/**
 * Configuration for the transaction builder.
 */
export interface TransactionBuilderConfig {
  /**
   * Program ID of the IZI-NOIR verifier program.
   * Defaults to the deployed devnet program.
   */
  programId?: string;

  /**
   * Compute units to request for transactions.
   * Default: 400,000 (sufficient for most proof verifications)
   */
  computeUnits?: number;

  /**
   * Priority fee in microLamports per compute unit.
   * Default: 0 (no priority fee)
   */
  priorityFee?: number;
}

/**
 * Account configuration for init_vk instruction.
 */
export interface InitVkAccounts {
  /** Public key of the VK account (as base58 string) */
  vkAccount: string;
  /** Public key of the authority (as base58 string) */
  authority: string;
  /** Public key of the payer (as base58 string) */
  payer: string;
}

/**
 * Account configuration for verify_proof instruction.
 */
export interface VerifyProofAccounts {
  /** Public key of the VK account (as base58 string) */
  vkAccount: string;
}

/**
 * Account configuration for close_vk instruction.
 */
export interface CloseVkAccounts {
  /** Public key of the VK account (as base58 string) */
  vkAccount: string;
  /** Public key of the authority (as base58 string) */
  authority: string;
}

/**
 * Instruction data and accounts for a Solana instruction.
 */
export interface InstructionData {
  /** Raw instruction data bytes */
  data: Uint8Array;
  /** Program ID (base58) */
  programId: string;
  /** Account keys with metadata */
  keys: Array<{
    pubkey: string;
    isSigner: boolean;
    isWritable: boolean;
  }>;
}

/**
 * Result of building init and verify transactions together.
 */
export interface InitAndVerifyInstructions {
  /** Init VK instruction */
  initVk: InstructionData;
  /** Verify proof instruction */
  verifyProof: InstructionData;
  /** Compute budget instruction (set compute units) */
  computeBudget?: InstructionData;
  /** Priority fee instruction (if configured) */
  priorityFee?: InstructionData;
  /** Required rent for VK account in lamports */
  rentLamports: number;
  /** Size of VK account in bytes */
  accountSize: number;
}

// System program ID
const SYSTEM_PROGRAM_ID = '11111111111111111111111111111111';
// Compute Budget program ID
const COMPUTE_BUDGET_PROGRAM_ID = 'ComputeBudget111111111111111111111111111111';

/**
 * Transaction builder for IZI-NOIR Solana program.
 *
 * This class provides methods to build instruction data for the IZI-NOIR
 * Solana program without requiring Anchor or @solana/web3.js dependencies.
 *
 * The returned instruction data can be used with any Solana library:
 * - @solana/web3.js
 * - @solana/kit (new)
 * - Anchor
 * - Mobile wallet adapters
 */
export class SolanaTransactionBuilder {
  private programId: string;
  private computeUnits: number;
  private priorityFee: number;

  constructor(config: TransactionBuilderConfig = {}) {
    this.programId = config.programId ?? IZI_NOIR_PROGRAM_ID;
    this.computeUnits = config.computeUnits ?? 400_000;
    this.priorityFee = config.priorityFee ?? 0;
  }

  /**
   * Builds the instruction data for initializing a VK account.
   *
   * @param solanaProofData - Proof data from `izi.proveForSolana()`
   * @param accounts - Account public keys
   * @returns Instruction data ready for transaction building
   *
   * @example
   * ```typescript
   * const initInstruction = builder.buildInitVkInstruction(solanaProofData, {
   *   vkAccount: vkKeypair.publicKey.toBase58(),
   *   authority: wallet.publicKey.toBase58(),
   *   payer: wallet.publicKey.toBase58(),
   * });
   * ```
   */
  buildInitVkInstruction(
    solanaProofData: SolanaProofData,
    accounts: InitVkAccounts
  ): InstructionData {
    const data = buildInitVkFromBytesData(
      solanaProofData.verifyingKey.nrPublicInputs,
      solanaProofData.verifyingKey.bytes
    );

    return {
      data,
      programId: this.programId,
      keys: [
        { pubkey: accounts.vkAccount, isSigner: true, isWritable: true },
        { pubkey: accounts.authority, isSigner: true, isWritable: false },
        { pubkey: accounts.payer, isSigner: true, isWritable: true },
        { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
    };
  }

  /**
   * Builds the instruction data for verifying a proof.
   *
   * @param proofBytes - 256-byte Groth16 proof
   * @param publicInputs - Array of 32-byte public inputs
   * @param accounts - Account public keys
   * @returns Instruction data ready for transaction building
   *
   * @example
   * ```typescript
   * const verifyInstruction = builder.buildVerifyProofInstruction(
   *   solanaProofData.proof.bytes,
   *   solanaProofData.publicInputs.bytes,
   *   { vkAccount: vkAccountPubkey.toBase58() }
   * );
   * ```
   */
  buildVerifyProofInstruction(
    proofBytes: Uint8Array,
    publicInputs: Uint8Array[],
    accounts: VerifyProofAccounts
  ): InstructionData {
    const data = buildVerifyProofData(proofBytes, publicInputs);

    return {
      data,
      programId: this.programId,
      keys: [
        { pubkey: accounts.vkAccount, isSigner: false, isWritable: false },
      ],
    };
  }

  /**
   * Builds the instruction data for closing a VK account.
   *
   * @param accounts - Account public keys
   * @returns Instruction data ready for transaction building
   */
  buildCloseVkInstruction(accounts: CloseVkAccounts): InstructionData {
    // Anchor discriminator for "close_vk"
    // From IDL: [82, 29, 77, 141, 76, 53, 205, 244]
    const discriminator = new Uint8Array([82, 29, 77, 141, 76, 53, 205, 244]);

    return {
      data: discriminator,
      programId: this.programId,
      keys: [
        { pubkey: accounts.vkAccount, isSigner: false, isWritable: true },
        { pubkey: accounts.authority, isSigner: true, isWritable: true },
      ],
    };
  }

  /**
   * Builds a compute budget instruction to set compute unit limit.
   *
   * @param units - Number of compute units (default: configured value)
   * @returns Instruction data
   */
  buildSetComputeUnitLimitInstruction(units?: number): InstructionData {
    const cu = units ?? this.computeUnits;
    const data = new Uint8Array(5);
    data[0] = 2; // SetComputeUnitLimit instruction
    new DataView(data.buffer).setUint32(1, cu, true);

    return {
      data,
      programId: COMPUTE_BUDGET_PROGRAM_ID,
      keys: [],
    };
  }

  /**
   * Builds a compute budget instruction to set priority fee.
   *
   * @param microLamports - Priority fee in microLamports per CU
   * @returns Instruction data
   */
  buildSetComputeUnitPriceInstruction(microLamports?: number): InstructionData {
    const fee = microLamports ?? this.priorityFee;
    const data = new Uint8Array(9);
    data[0] = 3; // SetComputeUnitPrice instruction
    // 8-byte little-endian u64
    const view = new DataView(data.buffer);
    view.setBigUint64(1, BigInt(fee), true);

    return {
      data,
      programId: COMPUTE_BUDGET_PROGRAM_ID,
      keys: [],
    };
  }

  /**
   * Builds all instructions needed to initialize a VK and verify a proof.
   *
   * This is a convenience method that combines:
   * - Compute budget instructions (if configured)
   * - Init VK instruction
   * - Verify proof instruction
   *
   * @param solanaProofData - Proof data from `izi.proveForSolana()`
   * @param vkAccountPubkey - Public key for the new VK account
   * @param authorityPubkey - Authority for the VK account
   * @param payerPubkey - Payer for the transaction
   * @returns All instruction data and metadata
   *
   * @example
   * ```typescript
   * const result = builder.buildInitAndVerifyInstructions(
   *   solanaProofData,
   *   vkKeypair.publicKey.toBase58(),
   *   wallet.publicKey.toBase58(),
   *   wallet.publicKey.toBase58()
   * );
   *
   * // Use with @solana/web3.js:
   * const transaction = new Transaction();
   * if (result.computeBudget) {
   *   transaction.add(toTransactionInstruction(result.computeBudget));
   * }
   * transaction.add(toTransactionInstruction(result.initVk));
   * // ... sign and send
   * ```
   */
  buildInitAndVerifyInstructions(
    solanaProofData: SolanaProofData,
    vkAccountPubkey: string,
    authorityPubkey: string,
    payerPubkey: string
  ): InitAndVerifyInstructions {
    const result: InitAndVerifyInstructions = {
      initVk: this.buildInitVkInstruction(solanaProofData, {
        vkAccount: vkAccountPubkey,
        authority: authorityPubkey,
        payer: payerPubkey,
      }),
      verifyProof: this.buildVerifyProofInstruction(
        solanaProofData.proof.bytes,
        solanaProofData.publicInputs.bytes,
        { vkAccount: vkAccountPubkey }
      ),
      rentLamports: solanaProofData.estimatedRent,
      accountSize: solanaProofData.accountSize,
    };

    // Add compute budget if configured
    if (this.computeUnits > 0) {
      result.computeBudget = this.buildSetComputeUnitLimitInstruction();
    }

    // Add priority fee if configured
    if (this.priorityFee > 0) {
      result.priorityFee = this.buildSetComputeUnitPriceInstruction();
    }

    return result;
  }

  /**
   * Validates that SolanaProofData has the correct format.
   *
   * @param data - Proof data to validate
   * @throws Error if validation fails
   */
  validateSolanaProofData(data: SolanaProofData): void {
    // Validate proof size
    if (data.proof.bytes.length !== PROOF_SIZE) {
      throw new Error(
        `Invalid proof size: expected ${PROOF_SIZE} bytes, got ${data.proof.bytes.length}`
      );
    }

    // Validate VK size
    const expectedVkSize = G1_SIZE + G2_SIZE * 3 + G1_SIZE * (data.verifyingKey.nrPublicInputs + 1);
    if (data.verifyingKey.bytes.length !== expectedVkSize) {
      throw new Error(
        `Invalid VK size: expected ${expectedVkSize} bytes for ${data.verifyingKey.nrPublicInputs} public inputs, got ${data.verifyingKey.bytes.length}`
      );
    }

    // Validate public inputs
    for (let i = 0; i < data.publicInputs.bytes.length; i++) {
      if (data.publicInputs.bytes[i].length !== FIELD_SIZE) {
        throw new Error(
          `Invalid public input ${i} size: expected ${FIELD_SIZE} bytes, got ${data.publicInputs.bytes[i].length}`
        );
      }
    }

    // Validate public inputs count matches VK
    if (data.publicInputs.bytes.length !== data.verifyingKey.nrPublicInputs) {
      throw new Error(
        `Public inputs count mismatch: VK expects ${data.verifyingKey.nrPublicInputs}, got ${data.publicInputs.bytes.length}`
      );
    }
  }

  /**
   * Gets the program ID being used.
   */
  getProgramId(): string {
    return this.programId;
  }

  /**
   * Gets the configured compute units.
   */
  getComputeUnits(): number {
    return this.computeUnits;
  }

  /**
   * Gets the configured priority fee.
   */
  getPriorityFee(): number {
    return this.priorityFee;
  }
}

/**
 * Helper to convert InstructionData to a format compatible with @solana/web3.js.
 *
 * This is a type definition only - actual conversion requires @solana/web3.js.
 *
 * @example
 * ```typescript
 * import { PublicKey, TransactionInstruction } from '@solana/web3.js';
 *
 * function toTransactionInstruction(data: InstructionData): TransactionInstruction {
 *   return new TransactionInstruction({
 *     programId: new PublicKey(data.programId),
 *     keys: data.keys.map(k => ({
 *       pubkey: new PublicKey(k.pubkey),
 *       isSigner: k.isSigner,
 *       isWritable: k.isWritable,
 *     })),
 *     data: Buffer.from(data.data),
 *   });
 * }
 * ```
 */
export type Web3JsInstructionConverter = (data: InstructionData) => unknown;
