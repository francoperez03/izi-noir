import { describe, it, expect } from 'vitest';
import { AcornParser } from '../src/infra/parser/AcornParser.js';
import { generateNoir } from '../src/application/services/NoirGenerator.js';
import type { CircuitFunction } from '../src/domain/types.js';

// Declare assert for TypeScript
declare function assert(condition: boolean, message?: string): void;

const parser = new AcornParser();

function parseAndGenerate(fn: CircuitFunction): string {
  const circuit = parser.parse(fn, [], []);
  return generateNoir(circuit);
}

describe('Phase 1: Extended Operators', () => {
  it('should parse comparison operators (<, >, <=, >=)', () => {
    const noir = parseAndGenerate(([a], [b]) => {
      assert(a > b);
      assert(a < b);
      assert(a >= b);
      assert(a <= b);
    });

    expect(noir).toContain('assert(a > b)');
    expect(noir).toContain('assert(a < b)');
    expect(noir).toContain('assert(a >= b)');
    expect(noir).toContain('assert(a <= b)');
  });

  it('should parse modulo operator (%)', () => {
    const noir = parseAndGenerate(([expected], [n]) => {
      assert(n % 2 == expected);
    });

    expect(noir).toContain('n % 2');
  });

  it('should parse logical operators (&&, ||) and map to Noir (& |)', () => {
    const noir = parseAndGenerate(([a, b], []) => {
      assert(a > 0 && b > 0);
      assert(a > 0 || b > 0);
    });

    expect(noir).toContain('a > 0 & b > 0');
    expect(noir).toContain('a > 0 | b > 0');
  });

  it('should parse unary NOT operator (!)', () => {
    const noir = parseAndGenerate(([a], []) => {
      assert(!a);
    });

    expect(noir).toContain('assert(!a)');
  });

  it('should parse unary negation (-)', () => {
    const noir = parseAndGenerate(([a], []) => {
      assert(a == -5);
    });

    expect(noir).toContain('a == -5');
  });
});

describe('Phase 2: Variables and Assignments', () => {
  it('should parse immutable variable declaration', () => {
    const noir = parseAndGenerate(([expected], [a, b]) => {
      let sum = a + b;
      assert(sum == expected);
    });

    expect(noir).toContain('let sum: Field = a + b;');
    expect(noir).toContain('assert(sum == expected)');
  });

  it('should parse mutable variable declaration with mut_ prefix', () => {
    const noir = parseAndGenerate(([expected], [a]) => {
      let mut_x = a;
      mut_x = mut_x + 1;
      assert(mut_x == expected);
    });

    expect(noir).toContain('let mut x: Field = a;');
    expect(noir).toContain('x = x + 1;');
    expect(noir).toContain('assert(x == expected)');
  });

  it('should parse assignment statements', () => {
    const noir = parseAndGenerate(([expected], [a]) => {
      let mut_x = 0;
      mut_x = a * 2;
      assert(mut_x == expected);
    });

    expect(noir).toContain('let mut x: Field = 0;');
    expect(noir).toContain('x = a * 2;');
  });
});

describe('Phase 3: If/Else Statements', () => {
  it('should parse simple if statement', () => {
    const noir = parseAndGenerate(([flag], [a]) => {
      let mut_result = 0;
      if (flag > 0) {
        mut_result = a;
      }
      assert(mut_result == a);
    });

    expect(noir).toContain('if flag > 0 {');
    expect(noir).toContain('result = a;');
  });

  it('should parse if/else statement', () => {
    const noir = parseAndGenerate(([condition], [a, b]) => {
      let mut_result = 0;
      if (condition > 0) {
        mut_result = a;
      } else {
        mut_result = b;
      }
      assert(mut_result > 0);
    });

    expect(noir).toContain('if condition > 0 {');
    expect(noir).toContain('} else {');
  });

  it('should parse ternary expression as if expression', () => {
    const noir = parseAndGenerate(([condition], [a, b]) => {
      let result = condition > 0 ? a : b;
      assert(result > 0);
    });

    expect(noir).toContain('let result: Field = if condition > 0 { a } else { b };');
  });
});

describe('Phase 4: For Loops', () => {
  it('should parse simple for loop with i < n', () => {
    const noir = parseAndGenerate(([expected], [n]) => {
      let mut_sum = 0;
      for (let i = 0; i < 10; i++) {
        mut_sum = mut_sum + 1;
      }
      assert(mut_sum == expected);
    });

    expect(noir).toContain('for i in 0..10 {');
    expect(noir).toContain('sum = sum + 1;');
  });

  it('should parse for loop with i <= n (inclusive)', () => {
    const noir = parseAndGenerate(([expected], []) => {
      let mut_sum = 0;
      for (let i = 1; i <= 5; i++) {
        mut_sum = mut_sum + i;
      }
      assert(mut_sum == expected);
    });

    expect(noir).toContain('for i in 1..=5 {');
  });

  it('should parse for loop with variable start', () => {
    const noir = parseAndGenerate(([start, end], []) => {
      let mut_count = 0;
      for (let i = start; i < end; i++) {
        mut_count = mut_count + 1;
      }
      assert(mut_count > 0);
    });

    expect(noir).toContain('for i in start..end {');
  });

  it('should parse for loop with i = i + 1 update', () => {
    const noir = parseAndGenerate(([n], []) => {
      let mut_sum = 0;
      for (let i = 0; i < n; i = i + 1) {
        mut_sum = mut_sum + i;
      }
      assert(mut_sum > 0);
    });

    expect(noir).toContain('for i in 0..n {');
  });
});

describe('Phase 5: Arrays', () => {
  it('should parse array literal', () => {
    const noir = parseAndGenerate(([expected], [a, b, c]) => {
      let arr = [a, b, c];
      assert(arr[0] == expected);
    });

    expect(noir).toContain('let arr: [Field; 3] = [a, b, c];');
  });

  it('should parse dynamic array indexing', () => {
    const noir = parseAndGenerate(([expected, idx], [a, b, c]) => {
      let arr = [a, b, c];
      assert(arr[idx] == expected);
    });

    expect(noir).toContain('arr[idx]');
  });

  it('should parse array.length as .len()', () => {
    const circuit = parser.parse(
      (([expected], [a, b, c]) => {
        let arr = [a, b, c];
        assert(arr.length == expected);
      }) as CircuitFunction,
      [],
      []
    );

    const noir = generateNoir(circuit);
    expect(noir).toContain('arr.len()');
  });

  it('should parse nested array access', () => {
    const noir = parseAndGenerate(([expected], [a, b]) => {
      let arr = [a, b];
      let x = arr[0] + arr[1];
      assert(x == expected);
    });

    expect(noir).toContain('arr[0] + arr[1]');
  });
});

describe('End-to-End Examples', () => {
  it('should generate valid Noir for sum of array elements', () => {
    const noir = parseAndGenerate(([expected], [a, b, c, d]) => {
      let arr = [a, b, c, d];
      let mut_sum = 0;
      for (let i = 0; i < 4; i++) {
        mut_sum = mut_sum + arr[i];
      }
      assert(mut_sum == expected);
    });

    expect(noir).toContain('fn main(a: Field, b: Field, c: Field, d: Field, expected: pub Field)');
    expect(noir).toContain('let arr: [Field; 4] = [a, b, c, d];');
    expect(noir).toContain('let mut sum: Field = 0;');
    expect(noir).toContain('for i in 0..4 {');
    expect(noir).toContain('sum = sum + arr[i];');
    expect(noir).toContain('assert(sum == expected);');
  });

  it('should generate valid Noir for conditional logic', () => {
    const noir = parseAndGenerate(([threshold], [value]) => {
      let result = value > threshold ? 1 : 0;
      assert(result == 1);
    });

    expect(noir).toContain('let result: Field = if value > threshold { 1 } else { 0 };');
  });

  it('should generate valid Noir for nested control flow', () => {
    const noir = parseAndGenerate(([max], []) => {
      let mut_sum = 0;
      for (let i = 1; i <= max; i++) {
        if (i % 2 == 0) {
          mut_sum = mut_sum + i;
        }
      }
      assert(mut_sum > 0);
    });

    expect(noir).toContain('for i in 1..=max {');
    expect(noir).toContain('if i % 2 == 0 {');
    expect(noir).toContain('sum = sum + i;');
  });
});
