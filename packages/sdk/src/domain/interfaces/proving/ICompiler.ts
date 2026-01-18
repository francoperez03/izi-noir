import type { CompiledCircuit } from '../../types.js';

export interface ICompiler {
  compile(noirCode: string): Promise<CompiledCircuit>;
}
