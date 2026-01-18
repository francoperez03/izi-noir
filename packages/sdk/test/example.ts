import { createProof } from '../src/index.js';

// Declare assert for TypeScript (it's parsed, not executed)
declare function assert(condition: boolean, message?: string): void;

async function main() {
  console.log('Testing noir-from-js...\n');

  try {
    // Test: Prove knowledge of a secret whose square equals public value
    console.log('Test: secret * secret == expected');
    console.log('Public inputs: [100]');
    console.log('Private inputs: [10]');

    const result = await createProof(
      [100],
      [10],
      ([expected], [secret]) => {
        assert(secret * secret == expected);
      }
    );

    console.log('\n--- Generated Noir Code ---');
    console.log(result.noirCode);

    console.log('--- Results ---');
    console.log('Proof size:', result.proof.length, 'bytes');
    console.log('Public inputs:', result.publicInputs);
    console.log('Verified:', result.verified);

    console.log('\n--- Timings ---');
    console.log('Parse:', result.timings.parseMs.toFixed(2), 'ms');
    console.log('Generate:', result.timings.generateMs.toFixed(2), 'ms');
    console.log('Compile:', result.timings.compileMs.toFixed(2), 'ms');
    console.log('Witness:', result.timings.witnessMs.toFixed(2), 'ms');
    console.log('Proof:', result.timings.proofMs.toFixed(2), 'ms');
    console.log('Verify:', result.timings.verifyMs.toFixed(2), 'ms');
    console.log('Total:', result.timings.totalMs.toFixed(2), 'ms');

    if (result.verified) {
      console.log('\n✓ Test passed!');
    } else {
      console.log('\n✗ Test failed: proof not verified');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
