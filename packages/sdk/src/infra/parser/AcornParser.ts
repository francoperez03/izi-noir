import * as acorn from 'acorn';
import * as walk from 'acorn-walk';
import type { IParser } from '../../domain/interfaces/parsing/IParser.js';
import type {
  ParsedCircuit,
  CircuitParam,
  Statement,
  Expr,
  BinaryOperator,
  UnaryOperator,
} from '../../domain/entities/circuit.js';
import type { CircuitFunction, InputValue } from '../../domain/types.js';

type AcornNode = acorn.Node & Record<string, any>;

// Map JS operators to Noir operators
const BINARY_OPERATOR_MAP: Record<string, BinaryOperator> = {
  // Equality
  '==': '==',
  '===': '==',
  '!=': '!=',
  '!==': '!=',
  // Arithmetic
  '+': '+',
  '-': '-',
  '*': '*',
  '/': '/',
  '%': '%',
  // Comparison
  '<': '<',
  '>': '>',
  '<=': '<=',
  '>=': '>=',
  // Logical (JS && and || map to Noir & and |)
  '&&': '&',
  '||': '|',
};

// Map JS unary operators to Noir
const UNARY_OPERATOR_MAP: Record<string, UnaryOperator> = {
  '!': '!',
  '-': '-',
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
    // Handle variable declarations: let x = 5; const y = 10;
    if (node.type === 'VariableDeclaration') {
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

      const initializer = this.parseExpression(init);
      if (!initializer) {
        throw new Error('Could not parse variable initializer');
      }

      // Convention: mut_ prefix indicates mutable variable
      const name = id.name as string;
      const isMutable = name.startsWith('mut_');
      const cleanName = isMutable ? name.slice(4) : name;

      return {
        kind: 'variable_declaration',
        name: cleanName,
        mutable: isMutable,
        initializer,
      };
    }

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

      // Check for assignment: x = 5;
      if (expr.type === 'AssignmentExpression') {
        const left = expr.left as AcornNode;
        const right = expr.right as AcornNode;

        if (left.type !== 'Identifier') {
          throw new Error('Assignment target must be an identifier');
        }

        const value = this.parseExpression(right);
        if (!value) {
          throw new Error('Could not parse assignment value');
        }

        // Strip mut_ prefix if present (for consistency)
        const name = left.name as string;
        const cleanName = name.startsWith('mut_') ? name.slice(4) : name;

        return {
          kind: 'assignment',
          target: cleanName,
          value,
        };
      }
    }

    // Handle if statement: if (condition) { ... } else { ... }
    if (node.type === 'IfStatement') {
      const condition = this.parseExpression(node.test as AcornNode);
      if (!condition) {
        throw new Error('Could not parse if condition');
      }

      const consequent = this.parseBlockOrStatement(node.consequent as AcornNode);
      const alternate = node.alternate
        ? this.parseBlockOrStatement(node.alternate as AcornNode)
        : undefined;

      return {
        kind: 'if_statement',
        condition,
        consequent,
        alternate,
      };
    }

    // Handle for loop: for (let i = start; i < end; i++) { ... }
    if (node.type === 'ForStatement') {
      const forNode = this.parseForStatement(node);
      if (forNode) {
        return forNode;
      }
    }

    return null;
  }

  private parseForStatement(node: AcornNode): Statement | null {
    // Validate init: must be `let i = start`
    const init = node.init as AcornNode | null;
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

    const start = this.parseExpression(startInit);
    if (!start) {
      throw new Error('Could not parse for loop start value');
    }

    // Validate test: must be `i < end` or `i <= end`
    const test = node.test as AcornNode | null;
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

    const end = this.parseExpression(test.right as AcornNode);
    if (!end) {
      throw new Error('Could not parse for loop end value');
    }

    // Validate update: must be `i++` or `i = i + 1` or `++i`
    const update = node.update as AcornNode | null;
    if (!update) {
      throw new Error('For loop must have an update expression');
    }

    if (!this.isSimpleIncrement(update, variable)) {
      throw new Error('For loop update must be i++ or i = i + 1 or ++i');
    }

    // Parse body
    const body = this.parseBlockOrStatement(node.body as AcornNode);

    return {
      kind: 'for_statement',
      variable,
      start,
      end,
      inclusive: operator === '<=',
      body,
    };
  }

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

  private parseBlockOrStatement(node: AcornNode): Statement[] {
    if (node.type === 'BlockStatement') {
      const statements: Statement[] = [];
      for (const stmt of node.body) {
        const parsed = this.parseStatement(stmt);
        if (parsed) {
          statements.push(parsed);
        }
      }
      return statements;
    } else {
      // Single statement (no braces)
      const parsed = this.parseStatement(node);
      return parsed ? [parsed] : [];
    }
  }

  private parseExpression(node: AcornNode): Expr | null {
    switch (node.type) {
      case 'Identifier': {
        // Strip mut_ prefix for consistency with variable declarations
        const name = node.name as string;
        const cleanName = name.startsWith('mut_') ? name.slice(4) : name;
        return { kind: 'identifier', name: cleanName };
      }

      case 'Literal':
        return { kind: 'literal', value: node.value as number | string | bigint };

      case 'BinaryExpression':
      case 'LogicalExpression': {
        const operator = BINARY_OPERATOR_MAP[node.operator];
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

        // Handle computed property access: arr[i] or arr[0]
        if (node.computed) {
          const object = this.parseExpression(obj);
          const index = this.parseExpression(prop);

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
          const object = this.parseExpression(obj);
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

        break;
      }

      // Array literal: [a, b, c]
      case 'ArrayExpression': {
        const elements: Expr[] = [];
        for (const elem of node.elements) {
          if (elem) {
            const parsed = this.parseExpression(elem as AcornNode);
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

      // Call expression: func() or obj.method()
      case 'CallExpression': {
        const callee = node.callee as AcornNode;
        const args: Expr[] = [];

        for (const arg of node.arguments) {
          const parsed = this.parseExpression(arg as AcornNode);
          if (parsed) {
            args.push(parsed);
          }
        }

        // Check for method call: obj.method()
        if (callee.type === 'MemberExpression' && !callee.computed) {
          const obj = this.parseExpression(callee.object as AcornNode);
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
        const calleeExpr = this.parseExpression(callee);
        if (calleeExpr) {
          return {
            kind: 'call',
            callee: calleeExpr,
            args,
          };
        }

        break;
      }

      case 'UnaryExpression': {
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

        const operand = this.parseExpression(node.argument as AcornNode);
        if (!operand) {
          throw new Error('Could not parse unary expression operand');
        }

        return { kind: 'unary', operator: unaryOp, operand };
      }

      // Ternary: condition ? consequent : alternate → if expression in Noir
      case 'ConditionalExpression': {
        const condition = this.parseExpression(node.test as AcornNode);
        const consequent = this.parseExpression(node.consequent as AcornNode);
        const alternate = this.parseExpression(node.alternate as AcornNode);

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

    return null;
  }
}
