/**
 * Script to generate test vectors for Solana program tests.
 *
 * Uses the IZI-NOIR SDK to:
 * 1. Compile a simple circuit (secret * secret == expected)
 * 2. Generate Groth16 proving/verifying keys
 * 3. Generate a proof
 * 4. Output VK and proof in gnark format (base64)
 *
 * Run: npx ts-node scripts/generate-test-vectors.ts
 */

// @ts-ignore - Direct import path needed for tsx
import { ArkworksWasm, isArkworksCircuit } from '../../sdk/dist/providers/arkworks.js';

// Simple Noir circuit: proves knowledge of a secret whose square equals expected
const NOIR_CODE = `
fn main(expected: pub Field, secret: Field) {
    assert(secret * secret == expected);
}
`;

async function main() {
  console.log('Generating test vectors for Solana verifier...\n');

  // Initialize the proving system
  const prover = new ArkworksWasm({ cacheKeys: true });

  // Compile the circuit
  console.log('1. Compiling circuit...');
  const circuit = await prover.compile(NOIR_CODE);
  console.log('   Circuit compiled successfully');

  if (!isArkworksCircuit(circuit)) {
    throw new Error('Expected ArkworksCompiledCircuit');
  }

  // Get the verifying key in gnark format
  console.log('2. Getting verifying key in gnark format...');
  const vkGnark = await prover.getVerifyingKeyGnark(circuit);
  const vkGnarkBase64 = uint8ArrayToBase64(vkGnark);
  console.log(`   VK size: ${vkGnark.length} bytes`);

  // Generate a proof for: secret=10, expected=100 (10*10=100)
  console.log('3. Generating proof...');
  const inputs = {
    expected: '100',
    secret: '10',
  };
  const proofData = await prover.generateProof(circuit, inputs);
  const proofGnarkBase64 = uint8ArrayToBase64(proofData.proof);
  console.log(`   Proof size: ${proofData.proof.length} bytes`);
  console.log(`   Public inputs: ${JSON.stringify(proofData.publicInputs)}`);

  // Verify the proof locally
  console.log('4. Verifying proof locally...');
  const verified = await prover.verifyProof(circuit, proofData.proof, proofData.publicInputs);
  console.log(`   Verification result: ${verified}`);

  if (!verified) {
    throw new Error('Proof verification failed locally!');
  }

  // Output test vectors
  console.log('\n=== TEST VECTORS ===\n');
  console.log('// Number of public inputs');
  console.log(`const NR_PUBINPUTS = 1;\n`);

  console.log('// Verifying key in gnark format (base64)');
  console.log(`const TEST_VK_BASE64 = "${vkGnarkBase64}";\n`);

  console.log('// Proof in gnark format (base64)');
  console.log(`const TEST_PROOF_BASE64 = "${proofGnarkBase64}";\n`);

  console.log('// Public input: expected = 100');
  console.log('// Hex representation (32 bytes, big-endian)');
  const publicInputHex = publicInputToHex(proofData.publicInputs[0]);
  console.log(`const TEST_PUBLIC_INPUT = "${publicInputHex}";\n`);

  // Also output as JSON for easier integration
  console.log('\n=== JSON FORMAT ===\n');
  const testVectors = {
    nrPubinputs: 1,
    vkGnarkBase64: vkGnarkBase64,
    proofGnarkBase64: proofGnarkBase64,
    publicInputs: proofData.publicInputs,
    publicInputHex: publicInputHex,
    inputs: {
      expected: 100,
      secret: 10,
    },
  };
  console.log(JSON.stringify(testVectors, null, 2));

  console.log('\n\nDone!');
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function publicInputToHex(input: string): string {
  // Input is a hex string or decimal string
  const hex = input.startsWith('0x') ? input.slice(2) : BigInt(input).toString(16);
  // Pad to 64 hex chars (32 bytes)
  return '0x' + hex.padStart(64, '0');
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
