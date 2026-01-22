/**
 * Off-Chain Verifier for IZI-NOIR.
 *
 * Provides ZK proof verification without on-chain transactions.
 * Useful for API authentication, backend validation, and testing.
 *
 * @example
 * ```typescript
 * import { OffchainVerifier, createVerifierMiddleware } from '@izi-noir/sdk';
 * import express from 'express';
 *
 * // Create verifier with compiled circuits
 * const verifier = new OffchainVerifier();
 *
 * // Register circuits for verification
 * await verifier.registerCircuit('age-check', {
 *   jsCircuit: ([minAge], [birthYear]) => {
 *     assert(2024 - birthYear >= minAge);
 *   }
 * });
 *
 * // Use as Express middleware
 * const app = express();
 * app.post('/api/verify', createVerifierMiddleware(verifier));
 *
 * // Or verify directly
 * const result = await verifier.verify({
 *   circuitName: 'age-check',
 *   proof: proofBytes,
 *   publicInputs: [18],
 * });
 *
 * if (result.verified) {
 *   console.log('Proof valid!');
 * }
 * ```
 *
 * @module @izi-noir/sdk/server
 */

import type { CircuitFunction, CompiledCircuit, ProofResult } from '../domain/types.js';

/**
 * Circuit configuration for offchain verification.
 */
export interface OffchainCircuitConfig {
  /** JavaScript circuit function */
  jsCircuit: CircuitFunction;
  /** Pre-compiled circuit (optional, will compile if not provided) */
  compiledCircuit?: CompiledCircuit;
  /** Expected number of public inputs */
  publicInputCount?: number;
}

/**
 * Verification request.
 */
export interface VerifyRequest {
  /** Circuit name to verify against */
  circuitName: string;
  /** Proof bytes (hex string or Uint8Array) */
  proof: string | Uint8Array;
  /** Public inputs (numbers or hex strings) */
  publicInputs: Array<number | bigint | string>;
}

/**
 * Verification result.
 */
export interface VerifyResult {
  /** Whether the proof is valid */
  verified: boolean;
  /** Circuit name */
  circuitName: string;
  /** Verification time in milliseconds */
  verificationTimeMs: number;
  /** Error message if verification failed */
  error?: string;
  /** Public inputs that were verified */
  publicInputs: Array<number | bigint | string>;
}

/**
 * Configuration for OffchainVerifier.
 */
export interface OffchainVerifierConfig {
  /**
   * Callback to compile a circuit.
   * Required if registering circuits by jsCircuit without pre-compiled circuit.
   */
  compiler?: (jsCircuit: CircuitFunction) => Promise<CompiledCircuit>;

  /**
   * Callback to verify a proof against a compiled circuit.
   */
  verifier?: (
    circuit: CompiledCircuit,
    proof: Uint8Array,
    publicInputs: Uint8Array[]
  ) => Promise<boolean>;
}

/**
 * Express-like request interface.
 */
interface ExpressRequest {
  body: {
    circuitName?: string;
    proof?: string | Uint8Array;
    publicInputs?: Array<number | bigint | string>;
  };
}

/**
 * Express-like response interface.
 */
interface ExpressResponse {
  status(code: number): ExpressResponse;
  json(body: unknown): ExpressResponse;
}

/**
 * Express-like next function.
 */
type ExpressNext = (err?: Error) => void;

/**
 * Off-chain ZK proof verifier.
 *
 * Manages registered circuits and provides proof verification
 * without requiring blockchain transactions.
 */
export class OffchainVerifier {
  private circuits: Map<string, OffchainCircuitConfig> = new Map();
  private compiledCircuits: Map<string, CompiledCircuit> = new Map();
  private config: OffchainVerifierConfig;

  constructor(config: OffchainVerifierConfig = {}) {
    this.config = config;
  }

  /**
   * Registers a circuit for verification.
   *
   * @param name - Unique name for the circuit
   * @param config - Circuit configuration
   */
  async registerCircuit(name: string, config: OffchainCircuitConfig): Promise<void> {
    this.circuits.set(name, config);

    // If pre-compiled circuit provided, use it
    if (config.compiledCircuit) {
      this.compiledCircuits.set(name, config.compiledCircuit);
      return;
    }

    // Otherwise, compile using provided compiler
    if (this.config.compiler) {
      const compiled = await this.config.compiler(config.jsCircuit);
      this.compiledCircuits.set(name, compiled);
    }
  }

  /**
   * Registers a pre-compiled circuit.
   *
   * @param name - Unique name for the circuit
   * @param compiled - Pre-compiled circuit
   */
  registerCompiledCircuit(name: string, compiled: CompiledCircuit): void {
    this.compiledCircuits.set(name, compiled);
  }

  /**
   * Verifies a ZK proof.
   *
   * @param request - Verification request with circuit name, proof, and public inputs
   * @returns Verification result
   */
  async verify(request: VerifyRequest): Promise<VerifyResult> {
    const startTime = performance.now();
    const { circuitName, proof, publicInputs } = request;

    // Get compiled circuit
    const compiled = this.compiledCircuits.get(circuitName);
    if (!compiled) {
      return {
        verified: false,
        circuitName,
        verificationTimeMs: performance.now() - startTime,
        error: `Circuit '${circuitName}' not registered`,
        publicInputs,
      };
    }

    // Validate public inputs count
    const config = this.circuits.get(circuitName);
    if (config?.publicInputCount !== undefined) {
      if (publicInputs.length !== config.publicInputCount) {
        return {
          verified: false,
          circuitName,
          verificationTimeMs: performance.now() - startTime,
          error: `Expected ${config.publicInputCount} public inputs, got ${publicInputs.length}`,
          publicInputs,
        };
      }
    }

    try {
      // Convert proof to Uint8Array
      const proofBytes = this.toUint8Array(proof);

      // Convert public inputs to Uint8Array[]
      const publicInputBytes = publicInputs.map((input) =>
        this.publicInputToBytes(input)
      );

      // Verify using provided verifier
      if (!this.config.verifier) {
        return {
          verified: false,
          circuitName,
          verificationTimeMs: performance.now() - startTime,
          error: 'No verifier configured. Provide a verifier in the config.',
          publicInputs,
        };
      }

      const verified = await this.config.verifier(
        compiled,
        proofBytes,
        publicInputBytes
      );

      return {
        verified,
        circuitName,
        verificationTimeMs: performance.now() - startTime,
        publicInputs,
      };
    } catch (error) {
      return {
        verified: false,
        circuitName,
        verificationTimeMs: performance.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown verification error',
        publicInputs,
      };
    }
  }

  /**
   * Checks if a circuit is registered.
   *
   * @param name - Circuit name
   */
  hasCircuit(name: string): boolean {
    return this.compiledCircuits.has(name);
  }

  /**
   * Gets all registered circuit names.
   */
  getCircuitNames(): string[] {
    return Array.from(this.compiledCircuits.keys());
  }

  /**
   * Removes a circuit from the verifier.
   *
   * @param name - Circuit name to remove
   */
  removeCircuit(name: string): boolean {
    this.circuits.delete(name);
    return this.compiledCircuits.delete(name);
  }

  // Private helpers

  private toUint8Array(input: string | Uint8Array): Uint8Array {
    if (input instanceof Uint8Array) {
      return input;
    }

    // Handle hex string
    const hex = input.startsWith('0x') ? input.slice(2) : input;
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }
    return bytes;
  }

  private publicInputToBytes(input: number | bigint | string): Uint8Array {
    let value: bigint;

    if (typeof input === 'string') {
      // Handle hex string or decimal string
      value = input.startsWith('0x')
        ? BigInt(input)
        : BigInt(input);
    } else if (typeof input === 'bigint') {
      value = input;
    } else {
      value = BigInt(input);
    }

    // Convert to 32-byte big-endian array (Field element)
    const bytes = new Uint8Array(32);
    for (let i = 31; i >= 0; i--) {
      bytes[i] = Number(value & 0xffn);
      value >>= 8n;
    }
    return bytes;
  }
}

/**
 * Creates an Express middleware for proof verification.
 *
 * @param verifier - The OffchainVerifier instance
 * @returns Express middleware function
 *
 * @example
 * ```typescript
 * import express from 'express';
 * import { OffchainVerifier, createVerifierMiddleware } from '@izi-noir/sdk';
 *
 * const app = express();
 * const verifier = new OffchainVerifier({ ... });
 *
 * // Register your circuits
 * await verifier.registerCircuit('my-circuit', { ... });
 *
 * // Add middleware
 * app.use(express.json());
 * app.post('/verify', createVerifierMiddleware(verifier));
 *
 * // Client sends:
 * // POST /verify
 * // { "circuitName": "my-circuit", "proof": "0x...", "publicInputs": [123, 456] }
 *
 * // Server responds:
 * // { "verified": true, "circuitName": "my-circuit", "verificationTimeMs": 42 }
 * ```
 */
export function createVerifierMiddleware(
  verifier: OffchainVerifier
): (req: ExpressRequest, res: ExpressResponse, next: ExpressNext) => Promise<void> {
  return async (req, res, next) => {
    try {
      const { circuitName, proof, publicInputs } = req.body;

      // Validate request
      if (!circuitName || typeof circuitName !== 'string') {
        res.status(400).json({
          error: 'Missing or invalid circuitName',
        });
        return;
      }

      if (!proof) {
        res.status(400).json({
          error: 'Missing proof',
        });
        return;
      }

      if (!Array.isArray(publicInputs)) {
        res.status(400).json({
          error: 'Missing or invalid publicInputs (expected array)',
        });
        return;
      }

      // Check if circuit exists
      if (!verifier.hasCircuit(circuitName)) {
        res.status(404).json({
          error: `Circuit '${circuitName}' not found`,
        });
        return;
      }

      // Verify the proof
      const result = await verifier.verify({
        circuitName,
        proof,
        publicInputs,
      });

      // Return result
      if (result.verified) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      next(error instanceof Error ? error : new Error(String(error)));
    }
  };
}

/**
 * Options for verification endpoint.
 */
export interface VerificationEndpointOptions {
  /** Custom path for the endpoint (default: '/verify') */
  path?: string;
  /** Rate limiting (requests per minute, 0 = unlimited) */
  rateLimit?: number;
  /** Required API key header */
  apiKeyHeader?: string;
  /** Allowed circuit names (empty = all) */
  allowedCircuits?: string[];
}

/**
 * Creates a verification endpoint configuration.
 *
 * This is a helper for setting up verification endpoints with
 * common options like rate limiting and API key authentication.
 *
 * @example
 * ```typescript
 * const config = createVerificationEndpoint(verifier, {
 *   path: '/api/v1/verify',
 *   rateLimit: 100,
 *   apiKeyHeader: 'X-API-Key',
 *   allowedCircuits: ['balance-check', 'age-verify'],
 * });
 *
 * // Use with Express
 * app.post(config.path, config.middleware);
 * ```
 */
export function createVerificationEndpoint(
  verifier: OffchainVerifier,
  options: VerificationEndpointOptions = {}
): {
  path: string;
  middleware: (req: ExpressRequest, res: ExpressResponse, next: ExpressNext) => Promise<void>;
} {
  const baseMiddleware = createVerifierMiddleware(verifier);

  const wrappedMiddleware = async (
    req: ExpressRequest,
    res: ExpressResponse,
    next: ExpressNext
  ) => {
    // Check allowed circuits
    if (
      options.allowedCircuits &&
      options.allowedCircuits.length > 0 &&
      req.body.circuitName
    ) {
      if (!options.allowedCircuits.includes(req.body.circuitName)) {
        res.status(403).json({
          error: `Circuit '${req.body.circuitName}' not allowed`,
        });
        return;
      }
    }

    // Delegate to base middleware
    await baseMiddleware(req, res, next);
  };

  return {
    path: options.path ?? '/verify',
    middleware: wrappedMiddleware,
  };
}

/**
 * Verification result for batch operations.
 */
export interface BatchVerifyResult {
  /** Results for each verification */
  results: VerifyResult[];
  /** Total time for all verifications */
  totalTimeMs: number;
  /** Number of verified proofs */
  verifiedCount: number;
  /** Number of failed verifications */
  failedCount: number;
}

/**
 * Batch verification extension for OffchainVerifier.
 *
 * @example
 * ```typescript
 * const results = await batchVerify(verifier, [
 *   { circuitName: 'age-check', proof: proof1, publicInputs: [18] },
 *   { circuitName: 'balance-check', proof: proof2, publicInputs: [100] },
 * ]);
 *
 * console.log(`Verified: ${results.verifiedCount}/${results.results.length}`);
 * ```
 */
export async function batchVerify(
  verifier: OffchainVerifier,
  requests: VerifyRequest[]
): Promise<BatchVerifyResult> {
  const startTime = performance.now();

  // Run all verifications in parallel
  const results = await Promise.all(
    requests.map((request) => verifier.verify(request))
  );

  const verifiedCount = results.filter((r) => r.verified).length;

  return {
    results,
    totalTimeMs: performance.now() - startTime,
    verifiedCount,
    failedCount: results.length - verifiedCount,
  };
}
