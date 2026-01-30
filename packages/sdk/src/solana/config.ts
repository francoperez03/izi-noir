/**
 * Network configuration for Solana deployments.
 */

export enum Network {
  Devnet = 'devnet',
  Testnet = 'testnet',
  Mainnet = 'mainnet-beta',
  Localnet = 'localnet',
}

export interface NetworkConfig {
  rpcUrl: string;
  programId: string;
  explorerUrl: string;
}

export const NETWORK_CONFIG: Record<Network, NetworkConfig> = {
  [Network.Devnet]: {
    rpcUrl: 'https://api.devnet.solana.com',
    programId: 'EYhRED7EuMyyVjx57aDXUD9h6ArnEKng64qtz8999KrS',
    explorerUrl: 'https://explorer.solana.com/?cluster=devnet',
  },
  [Network.Testnet]: {
    rpcUrl: 'https://api.testnet.solana.com',
    programId: 'EYhRED7EuMyyVjx57aDXUD9h6ArnEKng64qtz8999KrS',
    explorerUrl: 'https://explorer.solana.com/?cluster=testnet',
  },
  [Network.Mainnet]: {
    rpcUrl: 'https://api.mainnet-beta.solana.com',
    programId: 'EYhRED7EuMyyVjx57aDXUD9h6ArnEKng64qtz8999KrS', // TODO: Update when deployed to mainnet
    explorerUrl: 'https://explorer.solana.com',
  },
  [Network.Localnet]: {
    rpcUrl: 'http://localhost:8899',
    programId: 'EYhRED7EuMyyVjx57aDXUD9h6ArnEKng64qtz8999KrS',
    explorerUrl: 'http://localhost:3000',
  },
};

/**
 * Get the explorer URL for a transaction.
 */
export function getExplorerTxUrl(network: Network, signature: string): string {
  const config = NETWORK_CONFIG[network];
  const clusterParam = network === Network.Mainnet ? '' : `?cluster=${network}`;
  return `${config.explorerUrl.replace(/\?.*$/, '')}/tx/${signature}${clusterParam}`;
}

/**
 * Get the explorer URL for an account.
 */
export function getExplorerAccountUrl(network: Network, address: string): string {
  const config = NETWORK_CONFIG[network];
  const clusterParam = network === Network.Mainnet ? '' : `?cluster=${network}`;
  return `${config.explorerUrl.replace(/\?.*$/, '')}/address/${address}${clusterParam}`;
}
