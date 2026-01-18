/**
 * Test Sunspot backend for Groth16 proof generation
 * Generates proofs compatible with Solana on-chain verification
 */
import { createSunspotProof } from '../src/index.js';

// Path to sunspot binary (built from Go source)
const SUNSPOT_PATH = '/Users/francoperez/repos/proyectos-lokos/solana-privacy/sunspot/go/sunspot';

async function main() {
  console.log('Testing Sunspot backend (Groth16 for Solana)...\n');

  // Simple circuit: secret * secret == expected
  const publicInputs = [100];  // expected = 100
  const privateInputs = [10];  // secret = 10 (10 * 10 = 100)

  console.log('Test: secret * secret == expected');
  console.log('Public inputs:', publicInputs);
  console.log('Private inputs:', privateInputs);

  try {
    const result = await createSunspotProof(
      publicInputs,
      privateInputs,
      ([expected], [secret]) => {
        // @ts-ignore - assert is a circuit primitive
        assert(secret * secret == expected);
      },
      {
        sunspotBinaryPath: SUNSPOT_PATH,
        keepArtifacts: false,
      }
    );

    console.log('\n--- Generated Noir Code ---');
    console.log(result.noirCode);

    console.log('\n--- Results ---');
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
      console.log('\n✓ Sunspot test passed!');

      // Compare with expected Groth16 proof size (~388 bytes)
      if (result.proof.length < 500) {
        console.log('✓ Proof size is compact (Groth16):', result.proof.length, 'bytes');
      }
    } else {
      console.error('\n✗ Verification failed!');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n✗ Test failed:', error);
    process.exit(1);
  }
}

main();
