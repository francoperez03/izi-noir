import { IziNoir, Provider, generateNoir, AcornParser } from '../src/index.js';

// Declare assert for TypeScript (it's parsed, not executed)
declare function assert(condition: boolean, message?: string): void;

async function main() {
  console.log('Testing IziNoir SDK...\n');

  try {
    // Test: Prove knowledge of a secret whose square equals public value
    console.log('Test: secret * secret == expected');
    console.log('Public inputs: [100]');
    console.log('Private inputs: [10]');

    // Parse and generate Noir code
    const parser = new AcornParser();
    const parsed = parser.parse(
      function ([expected], [secret]) {
        assert(secret * secret == expected);
      },
      [100],
      [10]
    );
    const noirCode = generateNoir(parsed);

    console.log('\n--- Generated Noir Code ---');
    console.log(noirCode);

    // Initialize IziNoir with Barretenberg (UltraHonk)
    const izi = await IziNoir.init({ provider: Provider.Barretenberg });

    // Compile the circuit
    const startCompile = performance.now();
    await izi.compile(noirCode);
    const compileMs = performance.now() - startCompile;

    // Build inputs map from parsed circuit
    const publicInputs = [100];
    const privateInputs = [10];
    const inputs: Record<string, string> = {};
    for (let i = 0; i < parsed.publicParams.length; i++) {
      inputs[parsed.publicParams[i].name] = String(publicInputs[i]);
    }
    for (let i = 0; i < parsed.privateParams.length; i++) {
      inputs[parsed.privateParams[i].name] = String(privateInputs[i]);
    }

    // Generate proof
    const startProve = performance.now();
    const proofData = await izi.prove(inputs);
    const proveMs = performance.now() - startProve;

    // Verify proof
    const startVerify = performance.now();
    const verified = await izi.verify(proofData.proof, proofData.publicInputs);
    const verifyMs = performance.now() - startVerify;

    console.log('\n--- Results ---');
    console.log('Proof size:', proofData.proof.length, 'bytes');
    console.log('Public inputs:', proofData.publicInputs);
    console.log('Verified:', verified);

    console.log('\n--- Timings ---');
    console.log('Compile:', compileMs.toFixed(2), 'ms');
    console.log('Prove:', proveMs.toFixed(2), 'ms');
    console.log('Verify:', verifyMs.toFixed(2), 'ms');

    if (verified) {
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
