import type { ParsedCircuit, Expr, Statement } from '../../domain/entities/circuit.js';

export function generateNoir(circuit: ParsedCircuit): string {
  const params = generateParams(circuit);
  const body = generateBody(circuit.statements);

  return `fn main(${params}) {\n${body}}\n`;
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

function generateBody(statements: Statement[]): string {
  const lines: string[] = [];

  for (const stmt of statements) {
    lines.push(generateStatement(stmt));
  }

  return lines.map(line => `    ${line}`).join('\n');
}

function generateStatement(stmt: Statement): string {
  switch (stmt.kind) {
    case 'assert': {
      const condition = generateExpr(stmt.condition);
      if (stmt.message) {
        return `assert(${condition}, "${stmt.message}");`;
      }
      return `assert(${condition});`;
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
      return `${left} ${expr.operator} ${right}`;
    }

    case 'member':
      return `${expr.object}[${expr.index}]`;
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
