import { Buffer } from 'buffer';
import {
  Provider,
  Chain,
  type IziNoirConfig,
  type CircuitPaths,
} from './domain/types/provider.js';
import type { IProvingSystem } from './domain/interfaces/proving/IProvingSystem.js';
import type {
  CompiledCircuit,
  InputMap,
  ProofData,
  SolanaProofData,
  VerifyingKeyData,
  CompileResult,
} from './domain/types.js';
import type { IChainFormatter } from './domain/interfaces/chain/IChainFormatter.js';
import type { ChainId, CircuitMetadata } from './domain/types/chain.js';
import { initNoirWasm } from './infra/wasm/wasmInit.js';
import { Network, NETWORK_CONFIG, getExplorerTxUrl, getExplorerAccountUrl } from './solana/config.js';
import type { WalletAdapter, DeployResult, VerifyOnChainResult } from './solana/types.js';
import { SolanaTransactionBuilder } from './solana/TransactionBuilder.js';

/**
 * Data needed to deploy a verifying key to Solana.
 * Use with SolanaTransactionBuilder or your own transaction logic.
 */
export interface SolanaDeployData {
  /** The proof data with VK and public inputs */
  proofData: SolanaProofData;
  /** Program ID to use */
  programId: string;
  /** Compute units for the transaction */
  computeUnits: number;
}

/**
 * Main class for ZK proof generation with multiple backend providers.
 *
 * @example
 * ```typescript
 * import { IziNoir, Provider, Chain } from '@izi-noir/sdk';
 *
 * // On-chain mode: Initialize with chain for blockchain-specific formatting
 * const izi = await IziNoir.init({
 *   provider: Provider.Arkworks,
 *   chain: Chain.Solana
 * });
 *
 * await izi.compile(noirCode);
 * const proof = await izi.prove(inputs);  // Returns SolanaProofData
 * console.log(izi.vk);  // Verifying key available
 *
 * // Offchain mode: No chain specified
 * const iziOffchain = await IziNoir.init({ provider: Provider.Arkworks });
 * const rawProof = await iziOffchain.prove(inputs);  // Returns ProofData
 * const verified = await iziOffchain.verify(rawProof.proof, rawProof.publicInputs);
 * ```
 */
export class IziNoir {
  private provingSystem: IProvingSystem;
  private compiledCircuit: CompiledCircuit | null = null;
  private chainFormatters: Map<string, IChainFormatter> = new Map();
  private readonly chain?: Chain;
  private _verifyingKey?: VerifyingKeyData;
  private _lastProof?: SolanaProofData | ProofData;
  private readonly _network: Network;
  private _vkAccount?: string;

  private constructor(provingSystem: IProvingSystem, chain?: Chain, network?: Network) {
    this.provingSystem = provingSystem;
    this.chain = chain;
    this._network = network ?? Network.Devnet;
  }

  /**
   * Get the verifying key.
   * Available after calling compile() (for Arkworks/Sunspot providers with chain configured).
   */
  get vk(): VerifyingKeyData | undefined {
    return this._verifyingKey;
  }

  /**
   * Get the deployed VK account address.
   * Only available after calling deploy().
   */
  get vkAccount(): string | undefined {
    return this._vkAccount;
  }

  /**
   * Get the configured network.
   */
  get network(): Network {
    return this._network;
  }

  /**
   * Get the configured chain, if any.
   */
  get targetChain(): Chain | undefined {
    return this.chain;
  }

  /**
   * Check if operating in offchain mode (no chain configured).
   */
  get isOffchain(): boolean {
    return this.chain === undefined;
  }

  /**
   * Register a chain formatter for chain-specific proof formatting.
   *
   * @param formatter - The chain formatter to register
   */
  registerChainFormatter<T extends ChainId>(formatter: IChainFormatter<T>): void {
    this.chainFormatters.set(formatter.chainId, formatter);
  }

  /**
   * Get a registered chain formatter.
   *
   * @param chainId - The chain ID to get the formatter for
   * @returns The formatter or undefined if not registered
   */
  getChainFormatter<T extends ChainId>(chainId: T): IChainFormatter<T> | undefined {
    return this.chainFormatters.get(chainId) as IChainFormatter<T> | undefined;
  }

  /**
   * Initialize IziNoir with the specified provider and optional chain.
   *
   * @param config - Configuration specifying the provider, chain, and optional circuit paths
   * @returns Initialized IziNoir instance
   *
   * @example
   * ```typescript
   * // On-chain mode (Solana)
   * const izi = await IziNoir.init({
   *   provider: Provider.Arkworks,
   *   chain: Chain.Solana
   * });
   *
   * // Offchain mode (no chain formatting)
   * const iziOffchain = await IziNoir.init({
   *   provider: Provider.Arkworks
   * });
   *
   * // Barretenberg (browser-compatible, ~16KB proofs, offchain only)
   * const bb = await IziNoir.init({ provider: Provider.Barretenberg });
   * ```
   */
  static async init(config: IziNoirConfig): Promise<IziNoir> {
    // Initialize WASM (no-op if already initialized)
    await initNoirWasm();

    let provingSystem: IProvingSystem;

    switch (config.provider) {
      case Provider.Barretenberg: {
        if (config.chain) {
          throw new Error(
            'Barretenberg provider does not support chain formatting. ' +
              'Use Provider.Arkworks for on-chain proofs.'
          );
        }
        const { Barretenberg } = await import('./infra/provingSystems/Barretenberg.js');
        provingSystem = new Barretenberg();
        return new IziNoir(provingSystem);
      }
      case Provider.Arkworks: {
        const { ArkworksWasm } = await import('./infra/provingSystems/ArkworksWasm.js');
        const arkworksInstance = new ArkworksWasm();
        provingSystem = arkworksInstance;

        const instance = new IziNoir(provingSystem, config.chain, config.network);

        // Auto-register SolanaFormatter if chain is Solana or for backwards compatibility
        if (config.chain === Chain.Solana || !config.chain) {
          const { SolanaFormatter } = await import('./infra/chainFormatters/SolanaFormatter.js');
          instance.registerChainFormatter(new SolanaFormatter(arkworksInstance));
        }

        return instance;
      }
      case Provider.Sunspot: {
        throw new Error(
          'Sunspot is not available in the main entry point. ' +
            'Import from "@izi-noir/sdk/sunspot" for Sunspot support.'
        );
      }
      default:
        throw new Error(`Unknown provider: ${config.provider}`);
    }
  }

  /**
   * Get the underlying proving system instance.
   * Useful for advanced use cases.
   */
  getProvingSystem(): IProvingSystem {
    return this.provingSystem;
  }

  /**
   * Get the currently compiled circuit, if any.
   */
  getCompiledCircuit(): CompiledCircuit | null {
    return this.compiledCircuit;
  }

  /**
   * Compile Noir code into a circuit.
   * Performs trusted setup (generates PK and VK) during compilation.
   * After compile(), the verifying key is available via `this.vk`.
   *
   * @param noirCode - The Noir source code to compile
   * @returns CompileResult with circuit and verifying key
   *
   * @example
   * ```typescript
   * const { circuit, verifyingKey } = await izi.compile(noirCode);
   * console.log('VK:', izi.vk);  // Available immediately after compile
   * ```
   */
  async compile(noirCode: string): Promise<CompileResult> {
    this.compiledCircuit = await this.provingSystem.compile(noirCode);

    // Extract VK from compiled circuit if available (Arkworks does setup during compile)
    const vk = await this.extractVerifyingKey(this.compiledCircuit);
    if (vk) {
      this._verifyingKey = vk;
    }

    return {
      circuit: this.compiledCircuit,
      verifyingKey: this._verifyingKey!,
    };
  }

  /**
   * Extract verifying key from compiled circuit.
   * Works for Arkworks circuits that have VK cached after setup.
   */
  private async extractVerifyingKey(circuit: CompiledCircuit): Promise<VerifyingKeyData | undefined> {
    // Check if it's an Arkworks circuit with cached VK
    if ('__arkworks' in circuit && (circuit as any).__arkworks === true) {
      const arkworksCircuit = circuit as any;
      if (arkworksCircuit.verifyingKeyGnark) {
        // Convert base64 to Uint8Array
        const binaryString = atob(arkworksCircuit.verifyingKeyGnark);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        // Count public inputs from ABI
        const nrPublicInputs = circuit.abi.parameters.filter(
          (p: any) => p.visibility === 'public'
        ).length;

        return {
          base64: arkworksCircuit.verifyingKeyGnark,
          bytes,
          nrPublicInputs,
        };
      }
    }
    return undefined;
  }

  /**
   * Generate a proof for the given inputs.
   * Uses the cached proving key from compile() for fast proof generation.
   *
   * If a chain is configured, returns chain-formatted proof data.
   * Otherwise, returns raw proof data.
   *
   * @param inputs - The inputs (both public and private) for the circuit
   * @param circuit - Optional circuit to use (defaults to last compiled circuit)
   * @returns The proof data - type depends on configured chain
   * @throws Error if no circuit is available
   *
   * @example
   * ```typescript
   * // With chain configured - returns SolanaProofData
   * const izi = await IziNoir.init({ provider: Provider.Arkworks, chain: Chain.Solana });
   * await izi.compile(noirCode);  // VK available after compile
   * const proof = await izi.prove({ expected: '100', secret: '10' });
   *
   * // Offchain mode - returns ProofData
   * const iziOffchain = await IziNoir.init({ provider: Provider.Arkworks });
   * await iziOffchain.compile(noirCode);
   * const rawProof = await iziOffchain.prove({ expected: '100', secret: '10' });
   * ```
   */
  async prove(inputs: InputMap, circuit?: CompiledCircuit): Promise<ProofData | SolanaProofData> {
    const circuitToUse = circuit || this.compiledCircuit;
    if (!circuitToUse) {
      throw new Error('No circuit available. Call compile() first or provide a circuit.');
    }

    // Generate raw proof
    const rawProof = await this.provingSystem.generateProof(circuitToUse, inputs);

    // If no chain configured, return raw proof (offchain mode)
    if (!this.chain) {
      this._lastProof = rawProof;
      return rawProof;
    }

    // Get formatter for the configured chain
    const formatter = this.chainFormatters.get(this.chain);
    if (!formatter) {
      throw new Error(
        `No formatter registered for chain: ${this.chain}. ` +
          'This is an internal error - please report it.'
      );
    }

    // Build circuit metadata
    const metadata: CircuitMetadata = {
      numPublicInputs: rawProof.publicInputs.length,
    };

    // Format for target chain
    const formattedProof = await formatter.formatProof(rawProof, circuitToUse, metadata);
    const chainProof = formattedProof as unknown as SolanaProofData;

    this._lastProof = chainProof;

    return chainProof;
  }

  /**
   * Verify a proof.
   * Available in both on-chain and offchain modes.
   *
   * @param proof - The proof bytes to verify
   * @param publicInputs - The public inputs that were used
   * @param circuit - Optional circuit to use (defaults to last compiled circuit)
   * @returns true if the proof is valid, false otherwise
   * @throws Error if no circuit is available
   */
  async verify(
    proof: Uint8Array,
    publicInputs: string[],
    circuit?: CompiledCircuit
  ): Promise<boolean> {
    const circuitToUse = circuit || this.compiledCircuit;
    if (!circuitToUse) {
      throw new Error('No circuit available. Call compile() first or provide a circuit.');
    }
    return this.provingSystem.verifyProof(circuitToUse, proof, publicInputs);
  }

  /**
   * Convenience method: compile, prove, and verify in one call.
   *
   * @param noirCode - The Noir source code to compile
   * @param inputs - The inputs (both public and private) for the circuit
   * @returns Object containing proof data and verification result
   *
   * @example
   * ```typescript
   * const { proof, verified } = await izi.createProof(noirCode, {
   *   x: '100',
   *   y: '10',
   * });
   * console.log(`Verified: ${verified}`);
   * ```
   */
  async createProof(
    noirCode: string,
    inputs: InputMap
  ): Promise<{ proof: ProofData | SolanaProofData; verified: boolean }> {
    const { circuit } = await this.compile(noirCode);
    const proof = await this.prove(inputs, circuit);

    // For verification, extract raw proof bytes
    const proofBytes =
      'proof' in proof && proof.proof instanceof Uint8Array
        ? proof.proof
        : (proof as SolanaProofData).proof.bytes;
    const pubInputs = Array.isArray(proof.publicInputs)
      ? (proof.publicInputs as string[])
      : (proof as SolanaProofData).publicInputs.hex;

    const verified = await this.verify(proofBytes, pubInputs, circuit);
    return { proof, verified };
  }

  /**
   * Get deployment data for the verifying key.
   * Returns the data needed to deploy to the configured blockchain.
   * Use with SolanaTransactionBuilder to build and send the transaction.
   *
   * @param options - Optional configuration
   * @returns Deployment data that can be used with SolanaTransactionBuilder
   * @throws Error if no chain is configured (offchain mode)
   * @throws Error if prove() hasn't been called yet
   *
   * @example
   * ```typescript
   * const izi = await IziNoir.init({ provider: Provider.Arkworks, chain: Chain.Solana });
   * await izi.compile(noirCode);
   * await izi.prove(inputs);
   *
   * // Get deployment data
   * const deployData = izi.getDeployData();
   *
   * // Use with SolanaTransactionBuilder in your frontend
   * const builder = new SolanaTransactionBuilder({ programId: deployData.programId });
   * const { initVk, rentLamports, accountSize } = builder.buildInitAndVerifyInstructions(
   *   deployData.proofData,
   *   vkAccountPubkey,
   *   authority,
   *   payer
   * );
   * ```
   */
  getDeployData(options?: { programId?: string; computeUnits?: number }): SolanaDeployData {
    if (!this.chain) {
      throw new Error('Cannot deploy in offchain mode. Initialize with a chain parameter.');
    }

    if (!this._verifyingKey || !this._lastProof) {
      throw new Error('Must call prove() before getDeployData().');
    }

    if (this.chain !== Chain.Solana) {
      throw new Error(`Deployment for ${this.chain} is not yet supported.`);
    }

    return {
      proofData: this._lastProof as SolanaProofData,
      programId: options?.programId ?? 'EYhRED7EuMyyVjx57aDXUD9h6ArnEKng64qtz8999KrS',
      computeUnits: options?.computeUnits ?? 400_000,
    };
  }

  /**
   * Deploy the verifying key to Solana.
   *
   * This method handles the full deployment flow:
   * 1. Generates a keypair for the VK account
   * 2. Builds the init transaction
   * 3. Sends and confirms the transaction
   * 4. Stores the VK account address on the instance
   *
   * @param wallet - Wallet adapter with publicKey and sendTransaction
   * @returns Deploy result with VK account address and transaction signature
   * @throws Error if not in Solana chain mode or prove() hasn't been called
   *
   * @example
   * ```typescript
   * const izi = await IziNoir.init({
   *   provider: Provider.Arkworks,
   *   chain: Chain.Solana,
   *   network: Network.Devnet
   * });
   *
   * await izi.compile(noirCode);
   * await izi.prove(inputs);
   *
   * // Deploy VK in one line
   * const { vkAccount, signature } = await izi.deploy(wallet);
   * console.log(`VK deployed at: ${vkAccount}`);
   * ```
   */
  async deploy(wallet: WalletAdapter): Promise<DeployResult> {
    if (this.chain !== Chain.Solana) {
      throw new Error('deploy() requires Chain.Solana. Initialize with { chain: Chain.Solana }');
    }

    if (!this._lastProof || !this._verifyingKey) {
      throw new Error('Must call prove() before deploy()');
    }

    if (!wallet.publicKey) {
      throw new Error('Wallet not connected');
    }

    const proofData = this._lastProof as SolanaProofData;
    const networkConfig = NETWORK_CONFIG[this._network];

    // Dynamic import of @solana/web3.js to avoid bundling issues
    const { Connection, Keypair, Transaction, PublicKey } = await import('@solana/web3.js');

    const connection = new Connection(networkConfig.rpcUrl, 'confirmed');
    const vkKeypair = Keypair.generate();
    const authority = wallet.publicKey;

    // Build transaction using SolanaTransactionBuilder
    const builder = new SolanaTransactionBuilder({
      programId: networkConfig.programId,
      computeUnits: 400_000,
    });

    const { initVk, computeBudget } = builder.buildInitAndVerifyInstructions(
      proofData,
      vkKeypair.publicKey.toBase58(),
      authority.toBase58(),
      authority.toBase58()
    );

    // Convert InstructionData to TransactionInstruction
    const toInstruction = (data: { programId: string; keys: Array<{ pubkey: string; isSigner: boolean; isWritable: boolean }>; data: Uint8Array }) => {
      return {
        programId: new PublicKey(data.programId),
        keys: data.keys.map((k) => ({
          pubkey: new PublicKey(k.pubkey),
          isSigner: k.isSigner,
          isWritable: k.isWritable,
        })),
        data: Buffer.from(data.data),
      };
    };

    // Create transaction
    const tx = new Transaction();
    if (computeBudget) {
      tx.add(toInstruction(computeBudget));
    }
    tx.add(toInstruction(initVk));

    // Set transaction properties
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    tx.recentBlockhash = blockhash;
    tx.feePayer = authority as unknown as typeof vkKeypair.publicKey;

    // Partial sign with VK keypair
    tx.partialSign(vkKeypair);

    // Send transaction through wallet
    const signature = await wallet.sendTransaction(tx, connection);

    // Confirm transaction
    await connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight,
    });

    // Store VK account on instance
    this._vkAccount = vkKeypair.publicKey.toBase58();

    return {
      vkAccount: this._vkAccount,
      signature,
      explorerUrl: getExplorerTxUrl(this._network, signature),
    };
  }

  /**
   * Verify the proof on-chain.
   *
   * @param wallet - Wallet adapter with publicKey and sendTransaction
   * @param vkAccount - VK account address (optional if deploy() was called on this instance)
   * @returns Verification result with transaction signature
   * @throws Error if not in Solana chain mode or no VK account available
   *
   * @example
   * ```typescript
   * // After deploy()
   * const { verified, signature } = await izi.verifyOnChain(wallet);
   *
   * // Or with explicit VK account
   * const { verified } = await izi.verifyOnChain(wallet, 'VkAccountAddress...');
   * ```
   */
  async verifyOnChain(wallet: WalletAdapter, vkAccount?: string): Promise<VerifyOnChainResult> {
    if (this.chain !== Chain.Solana) {
      throw new Error('verifyOnChain() requires Chain.Solana');
    }

    if (!this._lastProof) {
      throw new Error('Must call prove() before verifyOnChain()');
    }

    const vk = vkAccount ?? this._vkAccount;
    if (!vk) {
      throw new Error('No VK account. Call deploy() first or provide vkAccount parameter');
    }

    if (!wallet.publicKey) {
      throw new Error('Wallet not connected');
    }

    const proofData = this._lastProof as SolanaProofData;
    const networkConfig = NETWORK_CONFIG[this._network];

    // Dynamic import
    const { Connection, Transaction, PublicKey } = await import('@solana/web3.js');

    const connection = new Connection(networkConfig.rpcUrl, 'confirmed');

    // Build verify instruction
    const builder = new SolanaTransactionBuilder({
      programId: networkConfig.programId,
      computeUnits: 400_000,
    });

    const verifyInstruction = builder.buildVerifyProofInstruction(
      proofData.proof.bytes,
      proofData.publicInputs.bytes,
      { vkAccount: vk }
    );

    const computeBudget = builder.buildSetComputeUnitLimitInstruction();

    // Convert to TransactionInstruction
    const toInstruction = (data: { programId: string; keys: Array<{ pubkey: string; isSigner: boolean; isWritable: boolean }>; data: Uint8Array }) => {
      return {
        programId: new PublicKey(data.programId),
        keys: data.keys.map((k) => ({
          pubkey: new PublicKey(k.pubkey),
          isSigner: k.isSigner,
          isWritable: k.isWritable,
        })),
        data: Buffer.from(data.data),
      };
    };

    // Create transaction
    const tx = new Transaction();
    tx.add(toInstruction(computeBudget));
    tx.add(toInstruction(verifyInstruction));

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    tx.recentBlockhash = blockhash;
    tx.feePayer = new PublicKey(wallet.publicKey.toBase58());

    // Send transaction
    const signature = await wallet.sendTransaction(tx, connection);

    // Confirm transaction
    await connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight,
    });

    return {
      verified: true,
      signature,
      explorerUrl: getExplorerTxUrl(this._network, signature),
    };
  }
}

// Re-export Provider, Chain, Network and types for convenience
export { Provider, Chain, type IziNoirConfig, type CircuitPaths };
export { Network } from './solana/config.js';
export type { WalletAdapter, DeployResult, VerifyOnChainResult } from './solana/types.js';
export type { SolanaProofData, VerifyingKeyData, CompileResult } from './domain/types.js';
export type {
  ChainId,
  CircuitMetadata,
  ChainMetadata,
  SolanaChainMetadata,
  EthereumChainMetadata,
  ChainMetadataFor,
} from './domain/types/chain.js';
export type {
  IChainFormatter,
  ChainProofDataFor,
} from './domain/interfaces/chain/IChainFormatter.js';
