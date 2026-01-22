#!/usr/bin/env npx tsx
/**
 * Generate test vectors for Solana integration tests.
 *
 * This script uses the IZI-NOIR SDK to compile a circuit and generate
 * a proof, then saves the test vectors to a JSON file.
 *
 * Usage:
 *   npm run generate-vectors
 *   # or
 *   npx tsx scripts/generate-test-vectors.ts
 *
 * Output:
 *   tests/test-vectors.json
 */

import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Noir circuit for testing: assert(secret * secret == expected)
const TEST_CIRCUIT = `
fn main(expected: pub Field, secret: Field) {
    assert(secret * secret == expected);
}
`;

// Test inputs: secret=10, expected=100
const TEST_INPUTS = {
  expected: "100",
  secret: "10",
};

async function main() {
  console.log("🔄 Generating test vectors using IZI-NOIR SDK...\n");

  // Dynamic import of SDK
  const { IziNoir, Provider } = await import("@izi-noir/sdk");

  // Initialize with Arkworks provider
  console.log("   Initializing Arkworks provider...");
  const izi = await IziNoir.init({ provider: Provider.Arkworks });

  // Compile the test circuit
  console.log("   Compiling circuit...");
  await izi.compile(TEST_CIRCUIT);

  // Generate proof with Solana data
  console.log("   Generating proof...");
  const solanaProof = await izi.proveForSolana(TEST_INPUTS);

  // Verify locally first
  console.log("   Verifying locally...");
  const localVerified = await izi.verify(solanaProof.proof.bytes, solanaProof.publicInputs.hex);
  console.log(`   Local verification: ${localVerified ? "✅ PASSED" : "❌ FAILED"}`);

  if (!localVerified) {
    throw new Error("Local verification failed - proof is invalid");
  }

  // Convert Uint8Array to base64 for JSON serialization
  const testVectors = {
    generatedAt: new Date().toISOString(),
    circuit: TEST_CIRCUIT.trim(),
    inputs: TEST_INPUTS,
    nrPubinputs: solanaProof.verifyingKey.nrPublicInputs,
    vkBase64: solanaProof.verifyingKey.base64,
    proofBase64: solanaProof.proof.base64,
    publicInputsHex: solanaProof.publicInputs.hex,
    accountSize: solanaProof.accountSize,
    estimatedRent: solanaProof.estimatedRent,
  };

  // Write to file
  const outputPath = join(__dirname, "..", "tests", "test-vectors.json");
  writeFileSync(outputPath, JSON.stringify(testVectors, null, 2));

  console.log(`\n✅ Test vectors generated successfully!`);
  console.log(`   - VK size: ${solanaProof.verifyingKey.bytes.length} bytes`);
  console.log(`   - Proof size: ${solanaProof.proof.bytes.length} bytes`);
  console.log(`   - Public inputs: ${testVectors.nrPubinputs}`);
  console.log(`   - Account size: ${testVectors.accountSize} bytes`);
  console.log(`   - Estimated rent: ${(testVectors.estimatedRent / 1e9).toFixed(6)} SOL`);
  console.log(`\n   Output: ${outputPath}`);
}

main().catch((err) => {
  console.error("\n❌ Failed to generate test vectors:", err);
  process.exit(1);
});
