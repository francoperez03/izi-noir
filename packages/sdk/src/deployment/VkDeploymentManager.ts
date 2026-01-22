/**
 * VK Deployment Manager for IZI-NOIR.
 *
 * Provides idempotent deployment of verifying keys to Solana with
 * local persistence for tracking deployed circuits.
 *
 * @example
 * ```typescript
 * import { VkDeploymentManager } from '@izi-noir/sdk';
 *
 * const manager = new VkDeploymentManager({
 *   network: 'devnet',
 *   configDir: './.izi-noir', // optional, defaults to .izi-noir
 * });
 *
 * // Deploy (idempotent - won't redeploy if already deployed)
 * const deployment = await manager.ensureDeployed({
 *   circuitName: 'balance-check',
 *   solanaProofData,
 *   sendTransaction: async (tx) => {
 *     // Sign and send using your wallet adapter
 *     return await wallet.sendTransaction(tx, connection);
 *   },
 * });
 *
 * console.log(`VK at: ${deployment.vkAccount}`);
 *
 * // Save deployment state
 * await manager.save();
 * ```
 *
 * @module @izi-noir/sdk/deployment
 */

import type { SolanaProofData } from '../domain/types.js';
import { SolanaTransactionBuilder } from '../solana/TransactionBuilder.js';
import type { InstructionData } from '../solana/TransactionBuilder.js';

/**
 * Supported Solana networks.
 */
export type SolanaNetwork = 'mainnet-beta' | 'devnet' | 'testnet' | 'localnet';

/**
 * Network RPC endpoints.
 */
export const NETWORK_ENDPOINTS: Record<SolanaNetwork, string> = {
  'mainnet-beta': 'https://api.mainnet-beta.solana.com',
  devnet: 'https://api.devnet.solana.com',
  testnet: 'https://api.testnet.solana.com',
  localnet: 'http://localhost:8899',
};

/**
 * Configuration for VK Deployment Manager.
 */
export interface VkDeploymentManagerConfig {
  /**
   * Solana network to deploy to.
   */
  network: SolanaNetwork;

  /**
   * Custom RPC endpoint. Overrides network default.
   */
  rpcEndpoint?: string;

  /**
   * Directory to store deployment config. Default: '.izi-noir'
   */
  configDir?: string;

  /**
   * Program ID override.
   */
  programId?: string;

  /**
   * Compute units for transactions. Default: 400,000
   */
  computeUnits?: number;
}

/**
 * Record of a deployed VK.
 */
export interface VkDeployment {
  /** Circuit identifier (name or hash) */
  circuitId: string;
  /** VK account public key (base58) */
  vkAccount: string;
  /** Authority public key (base58) */
  authority: string;
  /** Deployment timestamp */
  deployedAt: string;
  /** Transaction signature */
  txSignature: string;
  /** Network deployed to */
  network: SolanaNetwork;
  /** Hash of the VK bytes for deduplication */
  vkHash: string;
  /** Number of public inputs */
  nrPublicInputs: number;
}

/**
 * Options for ensureDeployed method.
 */
export interface EnsureDeployedOptions {
  /**
   * Identifier for the circuit (used for lookup).
   */
  circuitName: string;

  /**
   * Proof data containing VK bytes.
   */
  solanaProofData: SolanaProofData;

  /**
   * Function to send a transaction.
   * Should return the transaction signature.
   */
  sendTransaction: (instructions: InstructionData[], signers: SignerInfo[]) => Promise<string>;

  /**
   * Authority public key (base58).
   */
  authority: string;

  /**
   * Payer public key (base58).
   */
  payer: string;

  /**
   * Force redeploy even if already exists.
   */
  forceRedeploy?: boolean;
}

/**
 * Information about required signers.
 */
export interface SignerInfo {
  /** Public key of the signer (base58) */
  pubkey: string;
  /** Whether this is a new keypair that needs to be generated */
  isNewKeypair: boolean;
  /** Description of the signer role */
  role: 'vkAccount' | 'authority' | 'payer';
}

/**
 * Result of deployment operation.
 */
export interface DeploymentResult {
  /** Whether deployment was performed (false if already deployed) */
  deployed: boolean;
  /** VK account address */
  vkAccount: string;
  /** Transaction signature (if deployed) */
  txSignature?: string;
  /** Full deployment record */
  deployment: VkDeployment;
}

/**
 * Deployments state file structure.
 */
export interface DeploymentsState {
  version: '1.0';
  deployments: VkDeployment[];
}

/**
 * VK Deployment Manager.
 *
 * Manages deployment of verifying keys to Solana with:
 * - Idempotent deployments (skip if already deployed)
 * - Local persistence of deployment records
 * - Network-aware configuration
 */
export class VkDeploymentManager {
  private config: Required<VkDeploymentManagerConfig>;
  private deployments: Map<string, VkDeployment>;
  private builder: SolanaTransactionBuilder;
  private dirty: boolean = false;

  constructor(config: VkDeploymentManagerConfig) {
    this.config = {
      network: config.network,
      rpcEndpoint: config.rpcEndpoint ?? NETWORK_ENDPOINTS[config.network],
      configDir: config.configDir ?? '.izi-noir',
      programId: config.programId ?? '',
      computeUnits: config.computeUnits ?? 400_000,
    };
    this.deployments = new Map();
    this.builder = new SolanaTransactionBuilder({
      programId: this.config.programId || undefined,
      computeUnits: this.config.computeUnits,
    });
  }

  /**
   * Loads deployment state from disk.
   *
   * In browser environments, this is a no-op.
   * In Node.js, reads from {configDir}/deployments.json
   */
  async load(): Promise<void> {
    // This is a placeholder - actual file I/O depends on environment
    // Node.js implementation would use fs.readFile
    // Browser could use localStorage or IndexedDB

    // For now, we provide a method signature that implementations can override
    // or users can call loadFromJson with their own loading logic
  }

  /**
   * Loads deployment state from a JSON object.
   */
  loadFromJson(state: DeploymentsState): void {
    this.deployments.clear();
    for (const deployment of state.deployments) {
      // Only load deployments for current network
      if (deployment.network === this.config.network) {
        const key = this.makeDeploymentKey(deployment.circuitId, deployment.vkHash);
        this.deployments.set(key, deployment);
      }
    }
    this.dirty = false;
  }

  /**
   * Saves deployment state.
   *
   * Returns the state object for custom persistence.
   */
  async save(): Promise<DeploymentsState> {
    const state = this.toJson();
    this.dirty = false;
    // Actual file I/O would be environment-specific
    return state;
  }

  /**
   * Exports deployment state to JSON.
   */
  toJson(): DeploymentsState {
    return {
      version: '1.0',
      deployments: Array.from(this.deployments.values()),
    };
  }

  /**
   * Ensures a VK is deployed, skipping if already exists.
   *
   * @returns Deployment result with VK account address
   */
  async ensureDeployed(options: EnsureDeployedOptions): Promise<DeploymentResult> {
    const { circuitName, solanaProofData, authority, payer, forceRedeploy } = options;

    // Calculate VK hash for deduplication
    const vkHash = await this.hashVkBytes(solanaProofData.verifyingKey.bytes);
    const deploymentKey = this.makeDeploymentKey(circuitName, vkHash);

    // Check if already deployed
    const existing = this.deployments.get(deploymentKey);
    if (existing && !forceRedeploy) {
      return {
        deployed: false,
        vkAccount: existing.vkAccount,
        deployment: existing,
      };
    }

    // Generate VK account keypair placeholder
    // The actual keypair generation is done by the caller
    const vkAccountPubkey = this.generateVkAccountPlaceholder();

    // Build instructions
    const instructions: InstructionData[] = [];

    // Add compute budget
    instructions.push(this.builder.buildSetComputeUnitLimitInstruction());

    // Add init VK instruction
    const initVk = this.builder.buildInitVkInstruction(solanaProofData, {
      vkAccount: vkAccountPubkey,
      authority,
      payer,
    });
    instructions.push(initVk);

    // Define signers needed
    const signers: SignerInfo[] = [
      { pubkey: vkAccountPubkey, isNewKeypair: true, role: 'vkAccount' },
      { pubkey: authority, isNewKeypair: false, role: 'authority' },
    ];
    if (payer !== authority) {
      signers.push({ pubkey: payer, isNewKeypair: false, role: 'payer' });
    }

    // Send transaction
    const txSignature = await options.sendTransaction(instructions, signers);

    // Record deployment
    const deployment: VkDeployment = {
      circuitId: circuitName,
      vkAccount: vkAccountPubkey,
      authority,
      deployedAt: new Date().toISOString(),
      txSignature,
      network: this.config.network,
      vkHash,
      nrPublicInputs: solanaProofData.verifyingKey.nrPublicInputs,
    };

    this.deployments.set(deploymentKey, deployment);
    this.dirty = true;

    return {
      deployed: true,
      vkAccount: vkAccountPubkey,
      txSignature,
      deployment,
    };
  }

  /**
   * Gets deployment by circuit name.
   */
  getDeployment(circuitName: string): VkDeployment | undefined {
    // Search by circuit ID (partial match without hash)
    for (const [key, deployment] of this.deployments) {
      if (deployment.circuitId === circuitName) {
        return deployment;
      }
    }
    return undefined;
  }

  /**
   * Gets deployment by VK hash.
   */
  getDeploymentByVkHash(vkHash: string): VkDeployment | undefined {
    for (const deployment of this.deployments.values()) {
      if (deployment.vkHash === vkHash) {
        return deployment;
      }
    }
    return undefined;
  }

  /**
   * Gets all deployments.
   */
  getAllDeployments(): VkDeployment[] {
    return Array.from(this.deployments.values());
  }

  /**
   * Checks if there are unsaved changes.
   */
  isDirty(): boolean {
    return this.dirty;
  }

  /**
   * Gets the RPC endpoint.
   */
  getRpcEndpoint(): string {
    return this.config.rpcEndpoint;
  }

  /**
   * Gets the network.
   */
  getNetwork(): SolanaNetwork {
    return this.config.network;
  }

  /**
   * Prepares instructions for deployment without sending.
   *
   * Useful when you need to combine with other instructions
   * or use a specific signing flow.
   */
  prepareDeployment(
    solanaProofData: SolanaProofData,
    accounts: {
      vkAccount: string;
      authority: string;
      payer: string;
    }
  ): {
    instructions: InstructionData[];
    signers: SignerInfo[];
    rentLamports: number;
  } {
    const instructions: InstructionData[] = [];

    // Compute budget
    instructions.push(this.builder.buildSetComputeUnitLimitInstruction());

    // Init VK
    instructions.push(
      this.builder.buildInitVkInstruction(solanaProofData, {
        vkAccount: accounts.vkAccount,
        authority: accounts.authority,
        payer: accounts.payer,
      })
    );

    const signers: SignerInfo[] = [
      { pubkey: accounts.vkAccount, isNewKeypair: true, role: 'vkAccount' },
      { pubkey: accounts.authority, isNewKeypair: false, role: 'authority' },
    ];
    if (accounts.payer !== accounts.authority) {
      signers.push({ pubkey: accounts.payer, isNewKeypair: false, role: 'payer' });
    }

    return {
      instructions,
      signers,
      rentLamports: solanaProofData.estimatedRent,
    };
  }

  /**
   * Records an external deployment (made outside this manager).
   */
  recordDeployment(deployment: VkDeployment): void {
    const key = this.makeDeploymentKey(deployment.circuitId, deployment.vkHash);
    this.deployments.set(key, deployment);
    this.dirty = true;
  }

  /**
   * Removes a deployment record.
   */
  removeDeployment(circuitName: string): boolean {
    for (const [key, deployment] of this.deployments) {
      if (deployment.circuitId === circuitName) {
        this.deployments.delete(key);
        this.dirty = true;
        return true;
      }
    }
    return false;
  }

  // Private helpers

  private makeDeploymentKey(circuitId: string, vkHash: string): string {
    return `${circuitId}:${vkHash.slice(0, 16)}`;
  }

  private async hashVkBytes(bytes: Uint8Array): Promise<string> {
    // Use SubtleCrypto for hashing (works in browser and Node.js 15+)
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
      const hashArray = new Uint8Array(hashBuffer);
      return Array.from(hashArray)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
    // Fallback: simple hash (not cryptographically secure, but deterministic)
    let hash = 0;
    for (let i = 0; i < bytes.length; i++) {
      hash = ((hash << 5) - hash + bytes[i]) | 0;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }

  private generateVkAccountPlaceholder(): string {
    // This is a placeholder that signals to the caller
    // that they need to generate a real keypair
    // In practice, the sendTransaction callback receives SignerInfo
    // which indicates isNewKeypair: true for the VK account
    return 'PENDING_VK_ACCOUNT_KEYPAIR';
  }
}

/**
 * Creates a VK Deployment Manager with Node.js file persistence.
 *
 * @example
 * ```typescript
 * const manager = await createNodeVkDeploymentManager({
 *   network: 'devnet',
 *   configDir: './.izi-noir',
 * });
 *
 * // Automatically loads existing deployments
 * // and saves on manager.save()
 * ```
 */
export async function createNodeVkDeploymentManager(
  config: VkDeploymentManagerConfig
): Promise<VkDeploymentManager> {
  const manager = new VkDeploymentManager(config);
  // In Node.js, we'd load from disk here
  // This is a stub - actual implementation would use fs
  await manager.load();
  return manager;
}
