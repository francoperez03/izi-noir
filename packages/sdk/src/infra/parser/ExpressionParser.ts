import type { Expr } from '../../domain/entities/circuit.js';
import type { AcornNode } from './types.js';
import { BINARY_OPERATOR_MAP, UNARY_OPERATOR_MAP } from './operatorMaps.js';
import { stripMutPrefix } from './utils.js';

/**
 * Parses JavaScript AST expression nodes into circuit Expr types.
 *
 * Handles:
 * - Identifiers
 * - Literals (number, string, bigint)
 * - Binary expressions (arithmetic, comparison, logical)
 * - Unary expressions (!, -)
 * - Member expressions (array indexing, .length)
 * - Array literals
 * - Call expressions
 * - Conditional (ternary) expressions
 */
export class ExpressionParser {
  /**
   * Parses an AST node into a circuit expression.
   * @returns The parsed expression, or null if the node type is not recognized.
   */
  parse(node: AcornNode): Expr | null {
    switch (node.type) {
      case 'Identifier':
        return this.parseIdentifier(node);

      case 'Literal':
        return this.parseLiteral(node);

      case 'BinaryExpression':
      case 'LogicalExpression':
        return this.parseBinaryExpression(node);

      case 'MemberExpression':
        return this.parseMemberExpression(node);

      case 'ArrayExpression':
        return this.parseArrayExpression(node);

      case 'CallExpression':
        return this.parseCallExpression(node);

      case 'UnaryExpression':
        return this.parseUnaryExpression(node);

      case 'ConditionalExpression':
        return this.parseConditionalExpression(node);

      default:
        return null;
    }
  }

  private parseIdentifier(node: AcornNode): Expr {
    // Strip mut_ prefix for consistency with variable declarations
    const name = node.name as string;
    return { kind: 'identifier', name: stripMutPrefix(name) };
  }

  private parseLiteral(node: AcornNode): Expr {
    return { kind: 'literal', value: node.value as number | string | bigint };
  }

  private parseBinaryExpression(node: AcornNode): Expr {
    const operator = BINARY_OPERATOR_MAP[node.operator];
    if (!operator) {
      throw new Error(`Unsupported operator: ${node.operator}`);
    }

    const left = this.parse(node.left as AcornNode);
    const right = this.parse(node.right as AcornNode);

    if (!left || !right) {
      throw new Error('Could not parse binary expression operands');
    }

    return { kind: 'binary', left, operator, right };
  }

  private parseMemberExpression(node: AcornNode): Expr | null {
    const obj = node.object as AcornNode;
    const prop = node.property as AcornNode;

    // Handle computed property access: arr[i] or arr[0]
    if (node.computed) {
      const object = this.parse(obj);
      const index = this.parse(prop);

      if (!object || !index) {
        throw new Error('Could not parse member expression');
      }

      return {
        kind: 'member',
        object,
        index,
      };
    }

    // Handle property access: arr.length → special case for .length
    if (prop.type === 'Identifier' && prop.name === 'length') {
      const object = this.parse(obj);
      if (!object) {
        throw new Error('Could not parse object for .length');
      }

      // Transform arr.length → arr.len() call
      return {
        kind: 'call',
        callee: object,
        method: 'len',
        args: [],
      };
    }

    return null;
  }

  private parseArrayExpression(node: AcornNode): Expr {
    const elements: Expr[] = [];
    for (const elem of node.elements) {
      if (elem) {
        const parsed = this.parse(elem as AcornNode);
        if (parsed) {
          elements.push(parsed);
        }
      }
    }
    return {
      kind: 'array_literal',
      elements,
    };
  }

  private parseCallExpression(node: AcornNode): Expr | null {
    const callee = node.callee as AcornNode;
    const args: Expr[] = [];

    for (const arg of node.arguments) {
      const parsed = this.parse(arg as AcornNode);
      if (parsed) {
        args.push(parsed);
      }
    }

    // Check for method call: obj.method()
    if (callee.type === 'MemberExpression' && !callee.computed) {
      const obj = this.parse(callee.object as AcornNode);
      const method = (callee.property as AcornNode).name as string;

      if (obj) {
        return {
          kind: 'call',
          callee: obj,
          method,
          args,
        };
      }
    }

    // Regular function call
    const calleeExpr = this.parse(callee);
    if (calleeExpr) {
      return {
        kind: 'call',
        callee: calleeExpr,
        args,
      };
    }

    return null;
  }

  private parseUnaryExpression(node: AcornNode): Expr {
    const unaryOp = UNARY_OPERATOR_MAP[node.operator];
    if (!unaryOp) {
      throw new Error(`Unsupported unary operator: ${node.operator}`);
    }

    // Optimize: fold negative literals into a single literal node
    if (node.operator === '-' && node.argument.type === 'Literal') {
      const val = node.argument.value;
      if (typeof val === 'number' || typeof val === 'bigint') {
        return { kind: 'literal', value: -val };
      }
    }

    const operand = this.parse(node.argument as AcornNode);
    if (!operand) {
      throw new Error('Could not parse unary expression operand');
    }

    return { kind: 'unary', operator: unaryOp, operand };
  }

  private parseConditionalExpression(node: AcornNode): Expr {
    // Ternary: condition ? consequent : alternate → if expression in Noir
    const condition = this.parse(node.test as AcornNode);
    const consequent = this.parse(node.consequent as AcornNode);
    const alternate = this.parse(node.alternate as AcornNode);

    if (!condition || !consequent || !alternate) {
      throw new Error('Could not parse ternary expression');
    }

    return {
      kind: 'if_expr',
      condition,
      consequent,
      alternate,
    };
  }
}
