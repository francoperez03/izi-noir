/**
 * Solana types for IZI-NOIR SDK.
 */

/**
 * Minimal wallet adapter interface compatible with @solana/wallet-adapter-react.
 *
 * This interface requires only the essential methods for deploying and verifying
 * proofs on Solana, making it compatible with any wallet adapter implementation.
 *
 * @example
 * ```typescript
 * // Works with @solana/wallet-adapter-react
 * const { publicKey, sendTransaction } = useWallet();
 *
 * await izi.deploy({ publicKey, sendTransaction });
 * ```
 */
export interface WalletAdapter {
  /**
   * The wallet's public key.
   */
  publicKey: {
    toBase58(): string;
    toBytes(): Uint8Array;
  } | null;

  /**
   * Send a transaction to the network.
   * This signature is compatible with @solana/wallet-adapter-react's sendTransaction.
   *
   * @param transaction - The transaction to send (web3.js Transaction type)
   * @param connection - The Solana connection
   * @param options - Optional send options
   * @returns The transaction signature
   */
  sendTransaction: SendTransactionFunction;
}

/**
 * Function type for sending transactions.
 * Compatible with @solana/wallet-adapter-react.
 */
export type SendTransactionFunction = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transaction: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  connection: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options?: any
) => Promise<string>;

/**
 * Result of a deploy operation.
 */
export interface DeployResult {
  /** The VK account address (base58) */
  vkAccount: string;
  /** Transaction signature */
  signature: string;
  /** Explorer URL for the transaction */
  explorerUrl: string;
}

/**
 * Result of an on-chain verification.
 */
export interface VerifyOnChainResult {
  /** Whether the proof was verified successfully */
  verified: boolean;
  /** Transaction signature */
  signature: string;
  /** Explorer URL for the transaction */
  explorerUrl: string;
}
