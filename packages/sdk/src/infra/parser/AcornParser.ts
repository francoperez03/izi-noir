import * as acorn from 'acorn';
import * as walk from 'acorn-walk';
import type { IParser } from '../../domain/interfaces/IParser.js';
import type {
  ParsedCircuit,
  CircuitParam,
  Statement,
  Expr,
  BinaryOperator,
} from '../../domain/entities/circuit.js';
import type { CircuitFunction, InputValue } from '../../domain/types.js';

type AcornNode = acorn.Node & Record<string, any>;

const OPERATOR_MAP: Record<string, BinaryOperator> = {
  '==': '==',
  '===': '==',
  '!=': '!=',
  '!==': '!=',
  '+': '+',
  '-': '-',
  '*': '*',
  '/': '/',
};

export class AcornParser implements IParser {
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

    const publicParams: CircuitParam[] = [];
    const privateParams: CircuitParam[] = [];
    const statements: Statement[] = [];

    // Find the arrow function
    let arrowFn: AcornNode | null = null;

    walk.simple(ast, {
      ArrowFunctionExpression(node: AcornNode) {
        arrowFn = node;
      },
      FunctionExpression(node: AcornNode) {
        arrowFn = node;
      },
    });

    if (!arrowFn) {
      throw new Error('Could not find function in source');
    }

    // Extract parameters - expecting ([pub], [priv]) pattern
    const parsedFn = arrowFn as AcornNode;
    const params = parsedFn.params as AcornNode[];

    if (params.length !== 2) {
      throw new Error('Circuit function must have exactly 2 parameters: (publicArgs, privateArgs)');
    }

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

    // Extract body statements
    const body = parsedFn.body as AcornNode;

    if (body.type === 'BlockStatement') {
      for (const stmt of body.body) {
        const parsed = this.parseStatement(stmt);
        if (parsed) {
          statements.push(parsed);
        }
      }
    } else {
      // Single expression body - wrap in assert if it's a condition
      const expr = this.parseExpression(body);
      if (expr) {
        statements.push({ kind: 'assert', condition: expr });
      }
    }

    return { publicParams, privateParams, statements };
  }

  private parseStatement(node: AcornNode): Statement | null {
    if (node.type === 'ExpressionStatement') {
      const expr = node.expression as AcornNode;

      // Check for assert() call
      if (expr.type === 'CallExpression') {
        const callee = expr.callee as AcornNode;

        if (callee.type === 'Identifier' && callee.name === 'assert') {
          const args = expr.arguments as AcornNode[];

          if (args.length === 0) {
            throw new Error('assert() requires at least one argument');
          }

          const condition = this.parseExpression(args[0]);
          if (!condition) {
            throw new Error('Could not parse assert condition');
          }

          const message = args.length > 1 && args[1].type === 'Literal'
            ? String(args[1].value)
            : undefined;

          return { kind: 'assert', condition, message };
        }
      }
    }

    return null;
  }

  private parseExpression(node: AcornNode): Expr | null {
    switch (node.type) {
      case 'Identifier':
        return { kind: 'identifier', name: node.name };

      case 'Literal':
        return { kind: 'literal', value: node.value as number | string | bigint };

      case 'BinaryExpression':
      case 'LogicalExpression': {
        const operator = OPERATOR_MAP[node.operator];
        if (!operator) {
          throw new Error(`Unsupported operator: ${node.operator}`);
        }

        const left = this.parseExpression(node.left as AcornNode);
        const right = this.parseExpression(node.right as AcornNode);

        if (!left || !right) {
          throw new Error('Could not parse binary expression operands');
        }

        return { kind: 'binary', left, operator, right };
      }

      case 'MemberExpression': {
        const obj = node.object as AcornNode;
        const prop = node.property as AcornNode;

        if (obj.type === 'Identifier' && prop.type === 'Literal') {
          return {
            kind: 'member',
            object: obj.name,
            index: Number(prop.value)
          };
        }
        break;
      }

      case 'UnaryExpression': {
        // Handle negative numbers
        if (node.operator === '-' && node.argument.type === 'Literal') {
          const val = node.argument.value;
          if (typeof val === 'number' || typeof val === 'bigint') {
            return { kind: 'literal', value: -val };
          }
        }
        break;
      }
    }

    return null;
  }
}
