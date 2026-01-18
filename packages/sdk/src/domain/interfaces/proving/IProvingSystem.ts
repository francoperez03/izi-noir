import type { ICompiler } from './ICompiler.js';
import type { IProver } from './IProver.js';
import type { IVerifier } from './IVerifier.js';

/**
 * Unified interface for a complete proving system.
 * Combines compilation, proof generation, and verification into a single abstraction.
 *
 * Implementations:
 * - Barretenberg: WASM-based (browser compatible), UltraHonk proofs
 * - Sunspot: CLI-based (Node.js only), Groth16 proofs for Solana
 */
export interface IProvingSystem extends ICompiler, IProver, IVerifier {}
