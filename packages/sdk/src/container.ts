import { AcornParser } from './infra/parser/AcornParser.js';
import { Barretenberg } from './infra/provingSystems/Barretenberg.js';
import { ArkworksWasm } from './infra/provingSystems/ArkworksWasm.js';
import type { CreateProofDependencies } from './application/CreateProofUseCase.js';
import type { ArkworksWasmConfig } from './infra/provingSystems/ArkworksWasm.js';

/**
 * Create default container with Barretenberg backend
 *
 * @deprecated Use IziNoir.init({ provider: Provider.Barretenberg }) instead
 */
export function createDefaultContainer(): CreateProofDependencies {
  return {
    parser: new AcornParser(),
    provingSystem: new Barretenberg(),
  };
}

/**
 * Create container with ArkworksWasm backend (Groth16 for Solana, 100% browser)
 *
 * @deprecated Use IziNoir.init({ provider: Provider.Arkworks }) instead
 *
 * @example
 * ```ts
 * // Preferred:
 * const izi = await IziNoir.init({ provider: Provider.Arkworks });
 * await izi.compile(noirCode);
 * const proof = await izi.proveForChain('solana', inputs);
 * ```
 */
export function createArkworksWasmContainer(config?: ArkworksWasmConfig): CreateProofDependencies {
  return {
    parser: new AcornParser(),
    provingSystem: new ArkworksWasm(config),
  };
}
