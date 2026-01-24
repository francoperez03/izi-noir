import type { ProjectOptions } from '../prompts/project.js';

export function generateTestScript(options: ProjectOptions): string {
  const imports = getImports(options.template);
  const tests = getTests(options.template);

  return `/**
 * Test script for ZK proofs
 *
 * Run with: npm test
 */
import { IziNoir, Provider } from '@izi-noir/sdk';
${imports}

async function main() {
  console.log('Initializing IZI-NOIR...');
  const izi = await IziNoir.init({
    provider: Provider.${capitalizeFirst(options.provider)},
  });

${tests}

  console.log('\\n✓ All proofs verified successfully!');
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
`;
}

function getImports(template: string): string {
  switch (template) {
    case 'minimal':
      return `import { myCircuit } from '../circuits/index.js';`;
    case 'balance-proof':
      return `import { balanceProof } from '../circuits/index.js';`;
    default:
      return `import { balanceProof, ageProof } from '../circuits/index.js';`;
  }
}

function getTests(template: string): string {
  switch (template) {
    case 'minimal':
      return `  // Test: myCircuit
  console.log('\\nTesting myCircuit...');
  const result1 = await izi.createProof(
    myCircuit,
    [42],     // public: expected value
    [42]      // private: actual value
  );
  console.log('  Proof verified:', result1.verified);`;

    case 'balance-proof':
      return `  // Test: Balance Proof
  console.log('\\nTesting balanceProof...');
  const result1 = await izi.createProof(
    balanceProof,
    [100],    // public: threshold
    [1500]    // private: actual balance
  );
  console.log('  Proof verified:', result1.verified);
  console.log('  The prover has >= 100 balance (actual: hidden)');`;

    default:
      return `  // Test 1: Balance Proof
  console.log('\\nTesting balanceProof...');
  const result1 = await izi.createProof(
    balanceProof,
    [100],    // public: threshold
    [1500]    // private: actual balance
  );
  console.log('  Proof verified:', result1.verified);
  console.log('  The prover has >= 100 balance (actual: hidden)');

  // Test 2: Age Proof
  console.log('\\nTesting ageProof...');
  const result2 = await izi.createProof(
    ageProof,
    [2024, 18],   // public: current year, minimum age
    [1990]        // private: birth year
  );
  console.log('  Proof verified:', result2.verified);
  console.log('  The prover is >= 18 years old (birth year: hidden)');`;
  }
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
