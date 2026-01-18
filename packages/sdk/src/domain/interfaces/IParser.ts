import type { ParsedCircuit } from '../entities/circuit.js';
import type { CircuitFunction, InputValue } from '../types.js';

export interface IParser {
  parse(fn: CircuitFunction, publicInputs: InputValue[], privateInputs: InputValue[]): ParsedCircuit;
}
