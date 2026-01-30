import type { ParsedCircuit, Expr, Statement } from '../../domain/entities/circuit.js';

export function generateNoir(circuit: ParsedCircuit): string {
  const params = generateParams(circuit);
  const body = generateBody(circuit.statements);

  return `fn main(${params}) {\n${body}\n}\n`;
}

function generateParams(circuit: ParsedCircuit): string {
  const allParams: string[] = [];

  // Private params first (no pub modifier)
  for (const param of circuit.privateParams) {
    allParams.push(`${param.name}: Field`);
  }

  // Public params with pub modifier
  for (const param of circuit.publicParams) {
    allParams.push(`${param.name}: pub Field`);
  }

  return allParams.join(', ');
}

function generateBody(statements: Statement[], indent: number = 1): string {
  const lines: string[] = [];
  const indentStr = '    '.repeat(indent);

  for (const stmt of statements) {
    const generated = generateStatement(stmt, indent);
    // Handle multi-line statements (like if blocks)
    if (generated.includes('\n')) {
      lines.push(generated);
    } else {
      lines.push(`${indentStr}${generated}`);
    }
  }

  return lines.join('\n');
}

function generateStatement(stmt: Statement, indent: number = 1): string {
  const indentStr = '    '.repeat(indent);

  switch (stmt.kind) {
    case 'assert': {
      const condition = generateExpr(stmt.condition);
      if (stmt.message) {
        return `assert(${condition}, "${stmt.message}");`;
      }
      return `assert(${condition});`;
    }

    case 'variable_declaration': {
      const init = generateExpr(stmt.initializer);
      const mutKeyword = stmt.mutable ? 'let mut' : 'let';

      // Infer type from initializer
      const typeStr = inferType(stmt.initializer);
      return `${mutKeyword} ${stmt.name}: ${typeStr} = ${init};`;
    }

    case 'assignment': {
      const value = generateExpr(stmt.value);
      return `${stmt.target} = ${value};`;
    }

    case 'if_statement': {
      const condition = generateExpr(stmt.condition);
      const consequentBody = generateBody(stmt.consequent, indent + 1);

      let result = `${indentStr}if ${condition} {\n${consequentBody}\n${indentStr}}`;

      if (stmt.alternate && stmt.alternate.length > 0) {
        const alternateBody = generateBody(stmt.alternate, indent + 1);
        result += ` else {\n${alternateBody}\n${indentStr}}`;
      }

      return result;
    }

    case 'for_statement': {
      const start = generateExpr(stmt.start);
      const end = generateExpr(stmt.end);
      const rangeOp = stmt.inclusive ? '..=' : '..';
      const bodyContent = generateBody(stmt.body, indent + 1);

      return `${indentStr}for ${stmt.variable} in ${start}${rangeOp}${end} {\n${bodyContent}\n${indentStr}}`;
    }
  }
}

function generateExpr(expr: Expr): string {
  switch (expr.kind) {
    case 'identifier':
      return expr.name;

    case 'literal':
      return formatLiteral(expr.value);

    case 'binary': {
      const left = generateExpr(expr.left);
      const right = generateExpr(expr.right);
      // Comparison operators need casting to u64 in Noir (Fields can't be compared directly)
      if (['>=', '<=', '>', '<'].includes(expr.operator)) {
        return `(${left} as u64) ${expr.operator} (${right} as u64)`;
      }
      return `${left} ${expr.operator} ${right}`;
    }

    case 'unary': {
      const operand = generateExpr(expr.operand);
      // For unary operators, we may need parens if operand is complex
      if (expr.operand.kind === 'binary') {
        return `${expr.operator}(${operand})`;
      }
      return `${expr.operator}${operand}`;
    }

    case 'member': {
      const object = generateExpr(expr.object);
      const index = generateExpr(expr.index);
      return `${object}[${index}]`;
    }

    case 'array_literal': {
      const elements = expr.elements.map(e => generateExpr(e)).join(', ');
      return `[${elements}]`;
    }

    case 'call': {
      const args = expr.args.map(a => generateExpr(a)).join(', ');
      if (expr.method) {
        // Method call: arr.len()
        const callee = generateExpr(expr.callee);
        return `${callee}.${expr.method}(${args})`;
      }
      // Regular function call
      const callee = generateExpr(expr.callee);
      return `${callee}(${args})`;
    }

    case 'if_expr': {
      const condition = generateExpr(expr.condition);
      const consequent = generateExpr(expr.consequent);
      const alternate = generateExpr(expr.alternate);
      return `if ${condition} { ${consequent} } else { ${alternate} }`;
    }
  }
}

function formatLiteral(value: number | string | bigint): string {
  if (typeof value === 'bigint') {
    return value.toString();
  }
  if (typeof value === 'number') {
    return value.toString();
  }
  // String values - could be hex
  if (typeof value === 'string' && value.startsWith('0x')) {
    return value;
  }
  return `"${value}"`;
}

function inferType(expr: Expr): string {
  switch (expr.kind) {
    case 'array_literal':
      // For arrays, infer element type from first element or default to Field
      const elementType = expr.elements.length > 0
        ? inferType(expr.elements[0])
        : 'Field';
      return `[${elementType}; ${expr.elements.length}]`;

    case 'literal':
      // Check for boolean literals
      if (typeof expr.value === 'boolean') {
        return 'bool';
      }
      return 'Field';

    case 'if_expr':
      // If expression returns the type of its branches
      return inferType(expr.consequent);

    default:
      // Default to Field for most expressions
      return 'Field';
  }
}
