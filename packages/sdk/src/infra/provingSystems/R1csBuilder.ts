/**
 * R1csBuilder - Generates R1CS constraints from ParsedCircuit
 *
 * R1CS (Rank-1 Constraint System) only supports multiplication gates:
 * (Σ a_i * w_i) * (Σ b_j * w_j) = (Σ c_k * w_k)
 *
 * This builder converts parsed JavaScript circuit statements into R1CS constraints.
 *
 * Witness layout (matching Noir's convention):
 * - w_0 = 1 (constant, always)
 * - w_1, w_2, ... = inputs (private first, then public - matches Noir)
 * - w_k, w_k+1, ... = intermediate variables
 */

import type {
  ParsedCircuit,
  Statement,
  Expr,
  BinaryExpr,
} from '../../domain/entities/circuit.js';

/**
 * R1CS constraint: A * B = C
 * Each vector is a list of (coefficient_hex, witness_index) pairs
 */
export interface R1csConstraint {
  a: [string, number][];
  b: [string, number][];
  c: [string, number][];
}

/**
 * Auxiliary witness computation instruction
 * Tells the prover how to compute auxiliary witnesses from input witnesses
 */
export interface AuxWitnessComputation {
  /** Type of computation */
  type: 'subtract' | 'bit_decompose';
  /** Witness index to compute */
  targetIdx: number;
  /** For 'subtract': left operand witness index */
  leftIdx?: number;
  /** For 'subtract': right operand witness index */
  rightIdx?: number;
  /** For 'subtract': additional constant offset to subtract (e.g., -1 for > operator) */
  offset?: number;
  /** For 'bit_decompose': source value witness index */
  sourceIdx?: number;
  /** For 'bit_decompose': array of bit witness indices (LSB first) */
  bitIndices?: number[];
  /** For 'bit_decompose': number of bits */
  numBits?: number;
}

/**
 * Complete R1CS definition for arkworks-groth16-wasm
 */
export interface R1csDefinition {
  num_witnesses: number;
  public_inputs: number[];
  private_inputs: number[];
  constraints: R1csConstraint[];
  /** Instructions for computing auxiliary witnesses */
  auxWitnessComputations?: AuxWitnessComputation[];
}

/**
 * Builds R1CS constraints from a ParsedCircuit
 */
export class R1csBuilder {
  private constraints: R1csConstraint[] = [];
  private witnessMap: Map<string, number> = new Map();
  private nextWitnessIdx: number = 1; // w_0 = 1 is reserved
  private publicIndices: number[] = [];
  private privateIndices: number[] = [];
  private auxWitnessComputations: AuxWitnessComputation[] = [];

  // BN254 scalar field modulus - 1 (for representing -1)
  // Fr modulus = 0x30644e72e131a029b85045b68181585d2833e84879b9709143e1f593f0000001
  // -1 mod Fr = Fr - 1
  private readonly NEG_ONE =
    '0x30644e72e131a029b85045b68181585d2833e84879b9709143e1f593f0000000';

  // Number of bits for range checks (64 bits handles values up to ~18 quintillion)
  private readonly COMPARISON_BITS = 64;

  constructor(private parsedCircuit: ParsedCircuit) {}

  /**
   * Build R1CS definition from the parsed circuit
   */
  build(): R1csDefinition {
    // 1. Register all inputs (public first, then private)
    this.registerInputs();

    // 2. Process all statements
    for (const stmt of this.parsedCircuit.statements) {
      this.processStatement(stmt);
    }

    return {
      num_witnesses: this.nextWitnessIdx,
      public_inputs: this.publicIndices,
      private_inputs: this.privateIndices,
      constraints: this.constraints,
      auxWitnessComputations: this.auxWitnessComputations.length > 0 ? this.auxWitnessComputations : undefined,
    };
  }

  /**
   * Get the witness index for an input parameter name
   */
  getWitnessIndex(name: string): number | undefined {
    return this.witnessMap.get(name);
  }

  /**
   * Register all circuit inputs as witnesses
   * IMPORTANT: Noir orders witnesses as private first, then public
   * We must match this order for the witness values to align correctly
   */
  private registerInputs(): void {
    // Register private inputs first (to match Noir's witness ordering)
    for (const param of this.parsedCircuit.privateParams) {
      const idx = this.nextWitnessIdx++;
      this.witnessMap.set(param.name, idx);
      this.privateIndices.push(idx);
    }

    // Register public inputs next
    for (const param of this.parsedCircuit.publicParams) {
      const idx = this.nextWitnessIdx++;
      this.witnessMap.set(param.name, idx);
      this.publicIndices.push(idx);
    }
  }

  /**
   * Process a single statement and generate constraints
   */
  private processStatement(stmt: Statement): void {
    switch (stmt.kind) {
      case 'assert':
        this.processAssert(stmt.condition);
        break;
      case 'variable_declaration':
        this.processVariableDecl(stmt.name, stmt.initializer);
        break;
      case 'assignment':
        // For assignments, we just update the witness mapping
        // The actual constraint comes from how the variable is used
        this.processAssignment(stmt.target, stmt.value);
        break;
      case 'if_statement':
        // If statements require careful handling - process both branches
        // For now, just process consequent and alternate statements
        for (const s of stmt.consequent) {
          this.processStatement(s);
        }
        if (stmt.alternate) {
          for (const s of stmt.alternate) {
            this.processStatement(s);
          }
        }
        break;
      case 'for_statement':
        // For loops need to be unrolled - not yet supported
        throw new Error(
          'For loops are not yet supported in R1CS generation. ' +
            'Use the Barretenberg backend for complex circuits.'
        );
    }
  }

  /**
   * Process an assert statement
   * The condition must evaluate to true for a valid proof
   */
  private processAssert(condition: Expr): void {
    if (condition.kind === 'binary') {
      this.processBinaryAssert(condition);
    } else if (condition.kind === 'identifier') {
      // assert(x) means x must be non-zero, which is complex in R1CS
      // For now, treat as x == 1
      const idx = this.getOrCreateWitness(condition);
      this.constraints.push({
        a: [['0x1', idx]],
        b: [['0x1', 0]], // * 1
        c: [['0x1', 0]], // = 1 (w_0)
      });
    } else {
      throw new Error(`Unsupported assert condition kind: ${condition.kind}`);
    }
  }

  /**
   * Process a binary expression in an assert
   */
  private processBinaryAssert(expr: BinaryExpr): void {
    const { left, operator, right } = expr;

    switch (operator) {
      case '==':
        this.processEquality(left, right);
        break;
      case '!=':
        // a != b requires inverse check - complex in R1CS
        throw new Error(
          'Inequality (!=) is not yet supported in R1CS. Use equality (==) instead.'
        );
      case '+':
      case '-':
      case '*':
      case '/':
      case '%':
        // These don't make sense as standalone assert conditions
        // They should be part of an equality: assert(a + b == c)
        throw new Error(
          `Arithmetic operator ${operator} must be part of an equality assertion. ` +
            `Use: assert(a ${operator} b == c)`
        );
      case '>=':
        this.processGreaterThanOrEqual(left, right);
        break;
      case '>':
        this.processGreaterThan(left, right);
        break;
      case '<=':
        // a <= b is equivalent to b >= a
        this.processGreaterThanOrEqual(right, left);
        break;
      case '<':
        // a < b is equivalent to b > a
        this.processGreaterThan(right, left);
        break;
      case '&':
      case '|':
        // Logical operators
        throw new Error(
          `Logical operator ${operator} is not yet supported in R1CS.`
        );
      default:
        throw new Error(`Unsupported operator in assert: ${operator}`);
    }
  }

  /**
   * Process an equality assertion: assert(left == right)
   */
  private processEquality(left: Expr, right: Expr): void {
    // Check for multiplication pattern: assert(a * b == c)
    if (left.kind === 'binary' && left.operator === '*') {
      this.processMultiplicationEquality(left.left, left.right, right);
      return;
    }

    // Check for reverse multiplication pattern: assert(c == a * b)
    if (right.kind === 'binary' && right.operator === '*') {
      this.processMultiplicationEquality(right.left, right.right, left);
      return;
    }

    // Check for addition pattern: assert(a + b == c)
    if (left.kind === 'binary' && left.operator === '+') {
      this.processAdditionEquality(left.left, left.right, right);
      return;
    }

    // Check for reverse addition pattern: assert(c == a + b)
    if (right.kind === 'binary' && right.operator === '+') {
      this.processAdditionEquality(right.left, right.right, left);
      return;
    }

    // Check for subtraction pattern: assert(a - b == c)
    if (left.kind === 'binary' && left.operator === '-') {
      this.processSubtractionEquality(left.left, left.right, right);
      return;
    }

    // Check for reverse subtraction: assert(c == a - b)
    if (right.kind === 'binary' && right.operator === '-') {
      this.processSubtractionEquality(right.left, right.right, left);
      return;
    }

    // Simple equality: assert(a == b)
    // Represented as: (a - b) * 1 = 0
    const leftIdx = this.getOrCreateWitness(left);
    const rightIdx = this.getOrCreateWitness(right);

    this.constraints.push({
      a: [
        ['0x1', leftIdx],
        [this.NEG_ONE, rightIdx],
      ], // a - b
      b: [['0x1', 0]], // * 1 (w_0 = 1)
      c: [], // = 0
    });
  }

  /**
   * Process multiplication equality: assert(a * b == c)
   * R1CS: a * b = c
   */
  private processMultiplicationEquality(
    left: Expr,
    right: Expr,
    result: Expr
  ): void {
    const leftIdx = this.getOrCreateWitness(left);
    const rightIdx = this.getOrCreateWitness(right);
    const resultIdx = this.getOrCreateWitness(result);

    this.constraints.push({
      a: [['0x1', leftIdx]],
      b: [['0x1', rightIdx]],
      c: [['0x1', resultIdx]],
    });
  }

  /**
   * Process addition equality: assert(a + b == c)
   * R1CS: (a + b - c) * 1 = 0
   * Which is: (a + b) * 1 = c
   */
  private processAdditionEquality(
    left: Expr,
    right: Expr,
    result: Expr
  ): void {
    const leftIdx = this.getOrCreateWitness(left);
    const rightIdx = this.getOrCreateWitness(right);
    const resultIdx = this.getOrCreateWitness(result);

    this.constraints.push({
      a: [
        ['0x1', leftIdx],
        ['0x1', rightIdx],
      ], // a + b
      b: [['0x1', 0]], // * 1
      c: [['0x1', resultIdx]], // = c
    });
  }

  /**
   * Process subtraction equality: assert(a - b == c)
   * R1CS: (a - b) * 1 = c
   */
  private processSubtractionEquality(
    left: Expr,
    right: Expr,
    result: Expr
  ): void {
    const leftIdx = this.getOrCreateWitness(left);
    const rightIdx = this.getOrCreateWitness(right);
    const resultIdx = this.getOrCreateWitness(result);

    this.constraints.push({
      a: [
        ['0x1', leftIdx],
        [this.NEG_ONE, rightIdx],
      ], // a - b
      b: [['0x1', 0]], // * 1
      c: [['0x1', resultIdx]], // = c
    });
  }

  /**
   * Process greater than or equal: assert(a >= b)
   * Uses bit decomposition to prove that a - b is non-negative.
   *
   * The approach:
   * 1. Create diff = a - b
   * 2. Decompose diff into COMPARISON_BITS bits
   * 3. For each bit: bit_i * (1 - bit_i) = 0 (ensures 0 or 1)
   * 4. Sum of bits * powers of 2 = diff
   *
   * If decomposition succeeds, diff is in [0, 2^COMPARISON_BITS - 1], so a >= b
   */
  private processGreaterThanOrEqual(left: Expr, right: Expr): void {
    const leftIdx = this.getOrCreateWitness(left);
    const rightIdx = this.getOrCreateWitness(right);

    // Create witness for diff = a - b
    const diffIdx = this.nextWitnessIdx++;

    // Record auxiliary witness computation for diff
    this.auxWitnessComputations.push({
      type: 'subtract',
      targetIdx: diffIdx,
      leftIdx,
      rightIdx,
    });

    // Constraint: diff = a - b
    // (a - b) * 1 = diff
    this.constraints.push({
      a: [
        ['0x1', leftIdx],
        [this.NEG_ONE, rightIdx],
      ],
      b: [['0x1', 0]], // * 1
      c: [['0x1', diffIdx]],
    });

    // Bit decomposition of diff
    this.addBitDecompositionConstraints(diffIdx);
  }

  /**
   * Process greater than: assert(a > b)
   * Equivalent to assert(a - b - 1 >= 0), or assert(a >= b + 1)
   */
  private processGreaterThan(left: Expr, right: Expr): void {
    const leftIdx = this.getOrCreateWitness(left);
    const rightIdx = this.getOrCreateWitness(right);

    // Create witness for diff = a - b - 1
    const diffIdx = this.nextWitnessIdx++;

    // Record auxiliary witness computation for diff (with -1 offset for > operator)
    this.auxWitnessComputations.push({
      type: 'subtract',
      targetIdx: diffIdx,
      leftIdx,
      rightIdx,
      offset: -1, // For > operator: diff = left - right - 1
    });

    // Constraint: diff = a - b - 1
    // (a - b - 1) * 1 = diff
    this.constraints.push({
      a: [
        ['0x1', leftIdx],
        [this.NEG_ONE, rightIdx],
        [this.NEG_ONE, 0], // -1 (using w_0 = 1)
      ],
      b: [['0x1', 0]], // * 1
      c: [['0x1', diffIdx]],
    });

    // Bit decomposition of diff (must be non-negative)
    this.addBitDecompositionConstraints(diffIdx);
  }

  /**
   * Add bit decomposition constraints for a value.
   * Creates COMPARISON_BITS witnesses for the bits and constrains:
   * 1. Each bit is 0 or 1: bit * (1 - bit) = 0
   * 2. Sum of bits * 2^i = value
   */
  private addBitDecompositionConstraints(valueIdx: number): void {
    const bitIndices: number[] = [];

    // Create witnesses for each bit
    for (let i = 0; i < this.COMPARISON_BITS; i++) {
      const bitIdx = this.nextWitnessIdx++;
      bitIndices.push(bitIdx);

      // Constraint: bit_i * (1 - bit_i) = 0
      // Rearranged: bit_i * bit_i - bit_i = 0
      // Or: bit_i * bit_i = bit_i
      this.constraints.push({
        a: [['0x1', bitIdx]],
        b: [['0x1', bitIdx]],
        c: [['0x1', bitIdx]],
      });
    }

    // Record auxiliary witness computation for bit decomposition
    this.auxWitnessComputations.push({
      type: 'bit_decompose',
      targetIdx: bitIndices[0], // First bit index (for reference)
      sourceIdx: valueIdx,
      bitIndices,
      numBits: this.COMPARISON_BITS,
    });

    // Constraint: sum(bit_i * 2^i) = value
    // (bit_0 * 1 + bit_1 * 2 + bit_2 * 4 + ...) * 1 = value
    const sumTerms: [string, number][] = [];
    for (let i = 0; i < this.COMPARISON_BITS; i++) {
      // 2^i as hex
      const coeff = (1n << BigInt(i)).toString(16);
      sumTerms.push([`0x${coeff}`, bitIndices[i]]);
    }

    this.constraints.push({
      a: sumTerms,
      b: [['0x1', 0]], // * 1
      c: [['0x1', valueIdx]],
    });
  }

  /**
   * Process a variable declaration: let x = expr
   * Creates a new witness for x and adds constraint if needed
   */
  private processVariableDecl(name: string, initializer: Expr): void {
    // Create witness for the new variable
    const varIdx = this.nextWitnessIdx++;
    this.witnessMap.set(name, varIdx);

    // Add constraint based on the initializer
    if (initializer.kind === 'identifier') {
      // let x = y → x = y → (x - y) * 1 = 0
      const initIdx = this.getOrCreateWitness(initializer);
      this.constraints.push({
        a: [
          ['0x1', varIdx],
          [this.NEG_ONE, initIdx],
        ],
        b: [['0x1', 0]],
        c: [],
      });
    } else if (initializer.kind === 'literal') {
      // let x = 5 → x = 5 (handled at witness assignment time)
      // No constraint needed as the value is fixed
    } else if (initializer.kind === 'binary') {
      // let x = a + b or let x = a * b, etc.
      this.processVariableInitBinary(varIdx, initializer);
    } else {
      throw new Error(
        `Unsupported initializer kind for variable declaration: ${initializer.kind}`
      );
    }
  }

  /**
   * Process a binary expression as variable initializer
   */
  private processVariableInitBinary(varIdx: number, expr: BinaryExpr): void {
    const { left, operator, right } = expr;
    const leftIdx = this.getOrCreateWitness(left);
    const rightIdx = this.getOrCreateWitness(right);

    switch (operator) {
      case '*':
        // let x = a * b → a * b = x
        this.constraints.push({
          a: [['0x1', leftIdx]],
          b: [['0x1', rightIdx]],
          c: [['0x1', varIdx]],
        });
        break;
      case '+':
        // let x = a + b → (a + b) * 1 = x
        this.constraints.push({
          a: [
            ['0x1', leftIdx],
            ['0x1', rightIdx],
          ],
          b: [['0x1', 0]],
          c: [['0x1', varIdx]],
        });
        break;
      case '-':
        // let x = a - b → (a - b) * 1 = x
        this.constraints.push({
          a: [
            ['0x1', leftIdx],
            [this.NEG_ONE, rightIdx],
          ],
          b: [['0x1', 0]],
          c: [['0x1', varIdx]],
        });
        break;
      default:
        throw new Error(
          `Unsupported operator in variable initializer: ${operator}`
        );
    }
  }

  /**
   * Process an assignment: x = expr
   * Updates the witness mapping
   */
  private processAssignment(target: string, value: Expr): void {
    const existingIdx = this.witnessMap.get(target);
    if (existingIdx === undefined) {
      throw new Error(`Assignment to undeclared variable: ${target}`);
    }

    // For mutable variables, we need to create a new witness
    // and add equality constraint
    if (value.kind === 'identifier') {
      const valueIdx = this.getOrCreateWitness(value);
      this.constraints.push({
        a: [
          ['0x1', existingIdx],
          [this.NEG_ONE, valueIdx],
        ],
        b: [['0x1', 0]],
        c: [],
      });
    } else if (value.kind === 'binary') {
      this.processVariableInitBinary(existingIdx, value);
    }
  }

  /**
   * Get or create a witness index for an expression
   */
  private getOrCreateWitness(expr: Expr): number {
    if (expr.kind === 'identifier') {
      const existing = this.witnessMap.get(expr.name);
      if (existing !== undefined) {
        return existing;
      }
      // Unknown identifier - create new witness
      const idx = this.nextWitnessIdx++;
      this.witnessMap.set(expr.name, idx);
      return idx;
    }

    if (expr.kind === 'literal') {
      // Literals are handled specially - they become part of the witness
      // The actual value is set during witness generation
      // For now, we create a witness for each literal usage
      // In a more optimized version, we could use the constant directly
      const idx = this.nextWitnessIdx++;
      return idx;
    }

    if (expr.kind === 'binary') {
      // Binary expression needs intermediate witness
      const idx = this.nextWitnessIdx++;
      this.processVariableInitBinary(idx, expr);
      return idx;
    }

    if (expr.kind === 'unary') {
      // Unary expression (e.g., -x)
      const operandIdx = this.getOrCreateWitness(expr.operand);
      if (expr.operator === '-') {
        // -x needs a witness and constraint: result = -1 * x
        const idx = this.nextWitnessIdx++;
        this.constraints.push({
          a: [[this.NEG_ONE, operandIdx]],
          b: [['0x1', 0]],
          c: [['0x1', idx]],
        });
        return idx;
      }
      throw new Error(`Unsupported unary operator: ${expr.operator}`);
    }

    throw new Error(`Unsupported expression kind: ${expr.kind}`);
  }
}
