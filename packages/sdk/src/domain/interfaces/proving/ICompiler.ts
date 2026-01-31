import type { CompiledCircuit } from '../../types.js';
import type { ParsedCircuit } from '../../entities/circuit.js';

/**
 * Options for circuit compilation
 */
export interface CompileOptions {
  /**
   * The parsed circuit from JS source.
   * When provided, enables dynamic R1CS generation based on the actual circuit logic.
   * Without this, the proving system may use hardcoded R1CS patterns.
   */
  parsedCircuit?: ParsedCircuit;
}

export interface ICompiler {
  compile(noirCode: string, options?: CompileOptions): Promise<CompiledCircuit>;
}
