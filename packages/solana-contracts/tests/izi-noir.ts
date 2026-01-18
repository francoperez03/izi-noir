import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, SystemProgram } from "@solana/web3.js";
import { expect } from "chai";

// Test data: A simple circuit that verifies x * x == y
// where x = 3 (private) and y = 9 (public)
// These are pre-generated test vectors from arkworks-groth16-wasm
const TEST_VK_BASE64 = ""; // Will be populated after running arkworks setup
const TEST_PROOF_BASE64 = ""; // Will be populated after running arkworks prove
const TEST_PUBLIC_INPUT = "0x0000000000000000000000000000000000000000000000000000000000000009";

// Constants matching the program
const G1_SIZE = 64;
const G2_SIZE = 128;
const FIELD_SIZE = 32;

describe("izi-noir", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // Note: Import generated types after first `anchor build`
  // const program = anchor.workspace.IziNoir as Program<IziNoir>;

  describe("VK Account Management", () => {
    it("calculates correct account sizes", () => {
      // Test account size calculation
      // Fixed size: discriminator (8) + authority (32) + nr_pubinputs (1) +
      //             alpha_g1 (64) + beta_g2 (128) + gamma_g2 (128) + delta_g2 (128) + vec_len (4)
      const FIXED_SIZE = 8 + 32 + 1 + G1_SIZE + G2_SIZE * 3 + 4;

      // For 1 public input: k has 2 elements (k[0] + k[1])
      const sizeFor1Input = FIXED_SIZE + 2 * G1_SIZE;
      expect(sizeFor1Input).to.equal(621);

      // For 5 public inputs: k has 6 elements
      const sizeFor5Inputs = FIXED_SIZE + 6 * G1_SIZE;
      expect(sizeFor5Inputs).to.equal(877);
    });

    it("validates VK format from arkworks", () => {
      // Skip if no test VK is provided
      if (!TEST_VK_BASE64) {
        console.log("Skipping: No test VK provided");
        return;
      }

      const vkBytes = Buffer.from(TEST_VK_BASE64, "base64");
      const nrPubinputs = 1;
      const expectedLen = G1_SIZE + G2_SIZE * 3 + G1_SIZE * (nrPubinputs + 1);

      expect(vkBytes.length).to.equal(expectedLen);

      // Parse VK components
      let offset = 0;
      const alphaG1 = vkBytes.slice(offset, offset + G1_SIZE);
      offset += G1_SIZE;

      const betaG2 = vkBytes.slice(offset, offset + G2_SIZE);
      offset += G2_SIZE;

      const gammaG2 = vkBytes.slice(offset, offset + G2_SIZE);
      offset += G2_SIZE;

      const deltaG2 = vkBytes.slice(offset, offset + G2_SIZE);
      offset += G2_SIZE;

      // Verify G1/G2 points are not all zeros (valid points)
      expect(alphaG1.some((b: number) => b !== 0)).to.be.true;
      expect(betaG2.some((b: number) => b !== 0)).to.be.true;
      expect(gammaG2.some((b: number) => b !== 0)).to.be.true;
      expect(deltaG2.some((b: number) => b !== 0)).to.be.true;
    });
  });

  describe("Proof Verification (requires program deployment)", () => {
    // These tests require the program to be deployed
    // Run with: anchor test

    it.skip("initializes VK account", async () => {
      // Skip if no test VK is provided
      if (!TEST_VK_BASE64) {
        console.log("Skipping: No test VK provided");
        return;
      }

      // TODO: Uncomment after first anchor build generates types
      // const program = anchor.workspace.IziNoir as Program<IziNoir>;
      // const vkAccount = Keypair.generate();
      // const vkBytes = Buffer.from(TEST_VK_BASE64, "base64");
      //
      // await program.methods
      //   .initVkFromBytes(1, vkBytes)
      //   .accounts({
      //     vkAccount: vkAccount.publicKey,
      //     authority: provider.wallet.publicKey,
      //     payer: provider.wallet.publicKey,
      //     systemProgram: SystemProgram.programId,
      //   })
      //   .signers([vkAccount])
      //   .rpc();
      //
      // const account = await program.account.verifyingKeyAccount.fetch(vkAccount.publicKey);
      // expect(account.nrPubinputs).to.equal(1);
    });

    it.skip("verifies a valid proof", async () => {
      // Skip if no test data is provided
      if (!TEST_VK_BASE64 || !TEST_PROOF_BASE64) {
        console.log("Skipping: No test data provided");
        return;
      }

      // TODO: Uncomment after first anchor build generates types
      // const program = anchor.workspace.IziNoir as Program<IziNoir>;
      //
      // // First initialize VK
      // const vkAccount = Keypair.generate();
      // const vkBytes = Buffer.from(TEST_VK_BASE64, "base64");
      //
      // await program.methods
      //   .initVkFromBytes(1, vkBytes)
      //   .accounts({
      //     vkAccount: vkAccount.publicKey,
      //     authority: provider.wallet.publicKey,
      //     payer: provider.wallet.publicKey,
      //     systemProgram: SystemProgram.programId,
      //   })
      //   .signers([vkAccount])
      //   .rpc();
      //
      // // Then verify proof
      // const proofBytes = Buffer.from(TEST_PROOF_BASE64, "base64");
      // const publicInput = hexToBytes(TEST_PUBLIC_INPUT);
      //
      // await program.methods
      //   .verifyProof(proofBytes, [publicInput])
      //   .accounts({
      //     vkAccount: vkAccount.publicKey,
      //   })
      //   .rpc();
      //
      // // If we get here without error, proof was verified
      // expect(true).to.be.true;
    });

    it.skip("rejects an invalid proof", async () => {
      // Skip if no test data is provided
      if (!TEST_VK_BASE64) {
        console.log("Skipping: No test data provided");
        return;
      }

      // TODO: Uncomment after first anchor build generates types
      // const program = anchor.workspace.IziNoir as Program<IziNoir>;
      //
      // // First initialize VK
      // const vkAccount = Keypair.generate();
      // const vkBytes = Buffer.from(TEST_VK_BASE64, "base64");
      //
      // await program.methods
      //   .initVkFromBytes(1, vkBytes)
      //   .accounts({
      //     vkAccount: vkAccount.publicKey,
      //     authority: provider.wallet.publicKey,
      //     payer: provider.wallet.publicKey,
      //     systemProgram: SystemProgram.programId,
      //   })
      //   .signers([vkAccount])
      //   .rpc();
      //
      // // Create an invalid proof (all zeros)
      // const invalidProof = Buffer.alloc(256);
      // const publicInput = hexToBytes(TEST_PUBLIC_INPUT);
      //
      // try {
      //   await program.methods
      //     .verifyProof(invalidProof, [publicInput])
      //     .accounts({
      //       vkAccount: vkAccount.publicKey,
      //     })
      //     .rpc();
      //   expect.fail("Should have thrown an error");
      // } catch (err) {
      //   expect(err.message).to.include("ProofVerificationFailed");
      // }
    });

    it.skip("closes VK account", async () => {
      // TODO: Implement after first anchor build generates types
    });
  });
});

// Helper function to convert hex string to bytes
function hexToBytes(hex: string): number[] {
  const cleanHex = hex.startsWith("0x") ? hex.slice(2) : hex;
  const bytes: number[] = [];
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes.push(parseInt(cleanHex.substring(i, i + 2), 16));
  }
  return bytes;
}
