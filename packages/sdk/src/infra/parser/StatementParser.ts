import type { Statement } from '../../domain/entities/circuit.js';
import type { AcornNode } from './types.js';
import { ExpressionParser } from './ExpressionParser.js';
import { ForLoopParser } from './ForLoopParser.js';
import { stripMutPrefix, isMutable } from './utils.js';

/**
 * Parses JavaScript AST statement nodes into circuit Statement types.
 *
 * Handles:
 * - Variable declarations (let, const)
 * - Expression statements (assert calls, assignments)
 * - If statements
 * - For statements
 */
export class StatementParser {
  constructor(
    private exprParser: ExpressionParser,
    private forLoopParser: ForLoopParser
  ) {}

  /**
   * Parses a statement AST node.
   * @returns The parsed statement, or null if the node type is not recognized.
   */
  parse(node: AcornNode): Statement | null {
    switch (node.type) {
      case 'VariableDeclaration':
        return this.parseVariableDeclaration(node);

      case 'ExpressionStatement':
        return this.parseExpressionStatement(node);

      case 'IfStatement':
        return this.parseIfStatement(node);

      case 'ForStatement':
        return this.forLoopParser.parse(node, (n) => this.parseBlock(n));

      default:
        return null;
    }
  }

  /**
   * Parses a block or single statement into an array of statements.
   */
  parseBlock(node: AcornNode): Statement[] {
    if (node.type === 'BlockStatement') {
      const statements: Statement[] = [];
      for (const stmt of node.body) {
        const parsed = this.parse(stmt);
        if (parsed) {
          statements.push(parsed);
        }
      }
      return statements;
    } else {
      // Single statement (no braces)
      const parsed = this.parse(node);
      return parsed ? [parsed] : [];
    }
  }

  /**
   * Parses variable declarations: let x = 5; const y = 10;
   * Uses mut_ prefix convention for mutable variables.
   */
  private parseVariableDeclaration(node: AcornNode): Statement {
    const declaration = node.declarations[0] as AcornNode;
    if (!declaration || declaration.type !== 'VariableDeclarator') {
      throw new Error('Invalid variable declaration');
    }

    const id = declaration.id as AcornNode;
    if (id.type !== 'Identifier') {
      throw new Error('Variable declaration must have a simple identifier');
    }

    const init = declaration.init as AcornNode | null;
    if (!init) {
      throw new Error('Variable declaration must have an initializer');
    }

    const initializer = this.exprParser.parse(init);
    if (!initializer) {
      throw new Error('Could not parse variable initializer');
    }

    const name = id.name as string;

    return {
      kind: 'variable_declaration',
      name: stripMutPrefix(name),
      mutable: isMutable(name),
      initializer,
    };
  }

  /**
   * Parses expression statements: assert(), assignments.
   */
  private parseExpressionStatement(node: AcornNode): Statement | null {
    const expr = node.expression as AcornNode;

    // Check for assert() call
    if (expr.type === 'CallExpression') {
      const callee = expr.callee as AcornNode;

      if (callee.type === 'Identifier' && callee.name === 'assert') {
        return this.parseAssertCall(expr);
      }
    }

    // Check for assignment: x = 5;
    if (expr.type === 'AssignmentExpression') {
      return this.parseAssignment(expr);
    }

    return null;
  }

  /**
   * Parses assert() function calls.
   */
  private parseAssertCall(expr: AcornNode): Statement {
    const args = expr.arguments as AcornNode[];

    if (args.length === 0) {
      throw new Error('assert() requires at least one argument');
    }

    const condition = this.exprParser.parse(args[0]);
    if (!condition) {
      throw new Error('Could not parse assert condition');
    }

    const message =
      args.length > 1 && args[1].type === 'Literal'
        ? String(args[1].value)
        : undefined;

    return { kind: 'assert', condition, message };
  }

  /**
   * Parses assignment expressions: x = 5;
   */
  private parseAssignment(expr: AcornNode): Statement {
    const left = expr.left as AcornNode;
    const right = expr.right as AcornNode;

    if (left.type !== 'Identifier') {
      throw new Error('Assignment target must be an identifier');
    }

    const value = this.exprParser.parse(right);
    if (!value) {
      throw new Error('Could not parse assignment value');
    }

    // Strip mut_ prefix if present (for consistency)
    const name = left.name as string;

    return {
      kind: 'assignment',
      target: stripMutPrefix(name),
      value,
    };
  }

  /**
   * Parses if statements: if (condition) { ... } else { ... }
   */
  private parseIfStatement(node: AcornNode): Statement {
    const condition = this.exprParser.parse(node.test as AcornNode);
    if (!condition) {
      throw new Error('Could not parse if condition');
    }

    const consequent = this.parseBlock(node.consequent as AcornNode);
    const alternate = node.alternate
      ? this.parseBlock(node.alternate as AcornNode)
      : undefined;

    return {
      kind: 'if_statement',
      condition,
      consequent,
      alternate,
    };
  }
}
