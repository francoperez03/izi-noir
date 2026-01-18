import * as acorn from 'acorn';
import * as walk from 'acorn-walk';
import type { IParser } from '../../domain/interfaces/parsing/IParser.js';
import type {
  ParsedCircuit,
  CircuitParam,
  Statement,
} from '../../domain/entities/circuit.js';
import type { CircuitFunction, InputValue } from '../../domain/types.js';
import type { AcornNode } from './types.js';
import { ExpressionParser } from './ExpressionParser.js';
import { StatementParser } from './StatementParser.js';
import { ForLoopParser } from './ForLoopParser.js';

/**
 * Parses JavaScript circuit functions into a structured representation.
 *
 * The AcornParser is the main orchestrator that:
 * 1. Parses JS source using Acorn
 * 2. Extracts parameters from ([public], [private]) => {} pattern
 * 3. Delegates statement/expression parsing to specialized parsers
 *
 * Architecture:
 * - ExpressionParser: Handles all expression types
 * - StatementParser: Handles statements (vars, if, assert, assignments)
 * - ForLoopParser: Handles for loop validation and parsing
 */
export class AcornParser implements IParser {
  private exprParser = new ExpressionParser();
  private forLoopParser = new ForLoopParser(this.exprParser);
  private stmtParser = new StatementParser(this.exprParser, this.forLoopParser);

  /**
   * Parses a circuit function into public/private parameters and statements.
   *
   * @param fn The circuit function with signature ([public], [private]) => { ... }
   * @param _publicInputs Public input values (used for validation, not parsing)
   * @param _privateInputs Private input values (used for validation, not parsing)
   */
  parse(
    fn: CircuitFunction,
    _publicInputs: InputValue[],
    _privateInputs: InputValue[]
  ): ParsedCircuit {
    const fnSource = fn.toString();

    // Parse as expression (arrow function)
    const ast = acorn.parse(`(${fnSource})`, {
      ecmaVersion: 2022,
      sourceType: 'module',
    }) as AcornNode;

    // Find the function node
    const fnNode = this.findFunctionNode(ast);

    // Extract parameters
    const { publicParams, privateParams } = this.extractParameters(fnNode);

    // Parse body statements
    const statements = this.parseBody(fnNode);

    return { publicParams, privateParams, statements };
  }

  /**
   * Finds the arrow function or function expression in the AST.
   */
  private findFunctionNode(ast: AcornNode): AcornNode {
    let fnNode: AcornNode | null = null;

    walk.simple(ast, {
      ArrowFunctionExpression(node: AcornNode) {
        fnNode = node;
      },
      FunctionExpression(node: AcornNode) {
        fnNode = node;
      },
    });

    if (!fnNode) {
      throw new Error('Could not find function in source');
    }

    return fnNode;
  }

  /**
   * Extracts public and private parameters from the function signature.
   * Expects pattern: ([pub1, pub2], [priv1, priv2]) => { ... }
   */
  private extractParameters(fnNode: AcornNode): {
    publicParams: CircuitParam[];
    privateParams: CircuitParam[];
  } {
    const params = fnNode.params as AcornNode[];

    if (params.length !== 2) {
      throw new Error(
        'Circuit function must have exactly 2 parameters: (publicArgs, privateArgs)'
      );
    }

    const publicParams: CircuitParam[] = [];
    const privateParams: CircuitParam[] = [];

    // Parse public params (first array pattern)
    const pubParam = params[0];
    if (pubParam.type === 'ArrayPattern') {
      pubParam.elements.forEach((elem: AcornNode, idx: number) => {
        if (elem && elem.type === 'Identifier') {
          publicParams.push({ name: elem.name, index: idx });
        }
      });
    }

    // Parse private params (second array pattern)
    const privParam = params[1];
    if (privParam.type === 'ArrayPattern') {
      privParam.elements.forEach((elem: AcornNode, idx: number) => {
        if (elem && elem.type === 'Identifier') {
          privateParams.push({ name: elem.name, index: idx });
        }
      });
    }

    return { publicParams, privateParams };
  }

  /**
   * Parses the function body into statements.
   */
  private parseBody(fnNode: AcornNode): Statement[] {
    const body = fnNode.body as AcornNode;
    const statements: Statement[] = [];

    if (body.type === 'BlockStatement') {
      for (const stmt of body.body) {
        const parsed = this.stmtParser.parse(stmt);
        if (parsed) {
          statements.push(parsed);
        }
      }
    } else {
      // Single expression body - wrap in assert if it's a condition
      const expr = this.exprParser.parse(body);
      if (expr) {
        statements.push({ kind: 'assert', condition: expr });
      }
    }

    return statements;
  }
}
