import type { Statement, Expr } from '../../domain/entities/circuit.js';
import type { AcornNode } from './types.js';
import { ExpressionParser } from './ExpressionParser.js';

/**
 * Parses and validates JavaScript for loops for Noir conversion.
 *
 * Supports:
 * - `for (let i = start; i < end; i++)` → `for i in start..end`
 * - `for (let i = start; i <= end; i++)` → `for i in start..=end`
 *
 * Validates:
 * - Init must be a variable declaration
 * - Test must compare loop variable with < or <=
 * - Update must be simple increment (i++, ++i, or i = i + 1)
 */
export class ForLoopParser {
  constructor(private exprParser: ExpressionParser) {}

  /**
   * Parses a for statement into a circuit for_statement.
   * @param node The ForStatement AST node
   * @param parseBlock Function to parse the loop body
   */
  parse(
    node: AcornNode,
    parseBlock: (n: AcornNode) => Statement[]
  ): Statement {
    // Validate and extract init
    const { variable, start } = this.validateInit(node.init as AcornNode | null);

    // Validate and extract test
    const { end, inclusive } = this.validateTest(node.test as AcornNode | null, variable);

    // Validate update
    this.validateUpdate(node.update as AcornNode | null, variable);

    // Parse body
    const body = parseBlock(node.body as AcornNode);

    return {
      kind: 'for_statement',
      variable,
      start,
      end,
      inclusive,
      body,
    };
  }

  /**
   * Validates the for loop initializer.
   * Must be: `let i = start`
   */
  private validateInit(init: AcornNode | null): { variable: string; start: Expr } {
    if (!init || init.type !== 'VariableDeclaration') {
      throw new Error('For loop init must be a variable declaration (let i = start)');
    }

    const declaration = init.declarations[0] as AcornNode;
    if (!declaration || declaration.id.type !== 'Identifier') {
      throw new Error('For loop must declare a simple variable');
    }

    const variable = declaration.id.name as string;
    const startInit = declaration.init as AcornNode | null;
    if (!startInit) {
      throw new Error('For loop variable must have an initializer');
    }

    const start = this.exprParser.parse(startInit);
    if (!start) {
      throw new Error('Could not parse for loop start value');
    }

    return { variable, start };
  }

  /**
   * Validates the for loop test condition.
   * Must be: `i < end` or `i <= end`
   */
  private validateTest(
    test: AcornNode | null,
    variable: string
  ): { end: Expr; inclusive: boolean } {
    if (!test || test.type !== 'BinaryExpression') {
      throw new Error('For loop test must be a comparison (i < end or i <= end)');
    }

    const testLeft = test.left as AcornNode;
    if (testLeft.type !== 'Identifier' || testLeft.name !== variable) {
      throw new Error('For loop test must compare the loop variable');
    }

    const operator = test.operator as string;
    if (operator !== '<' && operator !== '<=') {
      throw new Error('For loop test must use < or <= operator');
    }

    const end = this.exprParser.parse(test.right as AcornNode);
    if (!end) {
      throw new Error('Could not parse for loop end value');
    }

    return { end, inclusive: operator === '<=' };
  }

  /**
   * Validates the for loop update expression.
   * Must be: `i++`, `++i`, or `i = i + 1`
   */
  private validateUpdate(update: AcornNode | null, variable: string): void {
    if (!update) {
      throw new Error('For loop must have an update expression');
    }

    if (!this.isSimpleIncrement(update, variable)) {
      throw new Error('For loop update must be i++ or i = i + 1 or ++i');
    }
  }

  /**
   * Checks if an expression is a simple increment of the variable.
   * Accepts: i++, ++i, i = i + 1
   */
  private isSimpleIncrement(node: AcornNode, variable: string): boolean {
    // i++ or ++i
    if (node.type === 'UpdateExpression') {
      const arg = node.argument as AcornNode;
      return (
        node.operator === '++' &&
        arg.type === 'Identifier' &&
        arg.name === variable
      );
    }

    // i = i + 1
    if (node.type === 'AssignmentExpression') {
      const left = node.left as AcornNode;
      const right = node.right as AcornNode;

      if (left.type !== 'Identifier' || left.name !== variable) {
        return false;
      }

      if (right.type === 'BinaryExpression') {
        const binLeft = right.left as AcornNode;
        const binRight = right.right as AcornNode;

        return (
          right.operator === '+' &&
          binLeft.type === 'Identifier' &&
          binLeft.name === variable &&
          binRight.type === 'Literal' &&
          binRight.value === 1
        );
      }
    }

    return false;
  }
}
