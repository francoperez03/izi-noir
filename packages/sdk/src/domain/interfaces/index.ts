// Re-export all interfaces
export type {
  IProvingSystem,
  ICompiler,
  IProver,
  IVerifier,
} from './proving/index.js';

export type { IParser } from './parsing/index.js';

export type { IChainFormatter, ChainProofDataFor } from './chain/index.js';
