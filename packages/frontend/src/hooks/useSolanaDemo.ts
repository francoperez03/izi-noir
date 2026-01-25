import { useCallback, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import {
  Keypair,
  Transaction,
  TransactionInstruction,
  LAMPORTS_PER_SOL,
  PublicKey,
} from '@solana/web3.js';
import type { SolanaProofData } from '@izi-noir/sdk';
import { SolanaTransactionBuilder } from '@izi-noir/sdk';

// IZI-NOIR program ID on devnet
const PROGRAM_ID = 'EYhRED7EuMyyVjx57aDXUD9h6ArnEKng64qtz8999KrS';

interface DeployResult {
  vkAccount: string;
  txSignature: string;
}

interface VerifyResult {
  txSignature: string;
  verified: boolean;
}

export function useSolanaDemo() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction, connected } = useWallet();
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  // Fetch balance
  const fetchBalance = useCallback(async () => {
    if (!publicKey) return;
    setIsLoadingBalance(true);
    try {
      const bal = await connection.getBalance(publicKey);
      setBalance(bal / LAMPORTS_PER_SOL);
    } catch (error) {
      console.error('Failed to fetch balance:', error);
      setBalance(null);
    } finally {
      setIsLoadingBalance(false);
    }
  }, [publicKey, connection]);

  // Deploy VK account
  const deploy = useCallback(async (solanaProofData: SolanaProofData): Promise<DeployResult> => {
    if (!publicKey) {
      throw new Error('Wallet not connected. Please connect Phantom wallet first.');
    }

    if (!sendTransaction) {
      throw new Error('Wallet does not support signing transactions.');
    }

    // Check balance before deployment
    try {
      const currentBalance = await connection.getBalance(publicKey);
      const minimumRequired = 0.01 * LAMPORTS_PER_SOL; // ~0.01 SOL minimum for rent + fees
      if (currentBalance < minimumRequired) {
        throw new Error(
          `Insufficient SOL balance. You have ${(currentBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL but need at least 0.01 SOL. Get devnet SOL from a faucet.`
        );
      }
    } catch (error) {
      if ((error as Error).message.includes('Insufficient SOL')) {
        throw error;
      }
      console.error('Failed to check balance:', error);
      // Continue if we can't check balance - will fail on actual transaction
    }

    const builder = new SolanaTransactionBuilder({
      programId: PROGRAM_ID,
      computeUnits: 400_000,
    });

    // Generate a new keypair for the VK account
    const vkKeypair = Keypair.generate();

    // Get actual rent from network (instead of hardcoded SDK value)
    const actualRent = await connection.getMinimumBalanceForRentExemption(
      solanaProofData.accountSize
    );

    // Fetch current balance from connection
    const walletBalance = await connection.getBalance(publicKey);

    // DEBUG: Log network and balance info
    console.log('=== DEPLOY DEBUG ===');
    console.log('RPC Endpoint:', connection.rpcEndpoint);
    console.log('Wallet PublicKey:', publicKey.toBase58());
    console.log('Wallet Balance (from connection):', walletBalance / LAMPORTS_PER_SOL, 'SOL');
    console.log('Account Size:', solanaProofData.accountSize, 'bytes');
    console.log('SDK Estimated Rent:', solanaProofData.estimatedRent / LAMPORTS_PER_SOL, 'SOL');
    console.log('Actual Rent from Network:', actualRent / LAMPORTS_PER_SOL, 'SOL');
    console.log('VK Account:', vkKeypair.publicKey.toBase58());
    console.log('Program ID:', PROGRAM_ID);
    console.log('====================');

    // Build instructions
    const { initVk, computeBudget } = builder.buildInitAndVerifyInstructions(
      solanaProofData,
      vkKeypair.publicKey.toBase58(),
      publicKey.toBase58(),
      publicKey.toBase58()
    );

    // Convert to TransactionInstructions
    let computeBudgetIx: TransactionInstruction | null = null;
    if (computeBudget) {
      computeBudgetIx = new TransactionInstruction({
        programId: new PublicKey(computeBudget.programId),
        keys: computeBudget.keys.map(k => ({
          pubkey: new PublicKey(k.pubkey),
          isSigner: k.isSigner,
          isWritable: k.isWritable,
        })),
        data: Buffer.from(computeBudget.data),
      });
    }

    const initVkIx = new TransactionInstruction({
      programId: new PublicKey(initVk.programId),
      keys: initVk.keys.map(k => ({
        pubkey: new PublicKey(k.pubkey),
        isSigner: k.isSigner,
        isWritable: k.isWritable,
      })),
      data: Buffer.from(initVk.data),
    });

    // Create transaction
    // NOTE: Anchor's #[account(init)] handles account creation internally,
    // so we do NOT call SystemProgram.createAccount here
    const transaction = new Transaction();

    if (computeBudgetIx) {
      transaction.add(computeBudgetIx);
    }
    transaction.add(initVkIx);

    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = publicKey;

    // Partial sign with VK keypair
    transaction.partialSign(vkKeypair);

    // DEBUG: Log transaction details
    console.log('=== TRANSACTION DEBUG ===');
    console.log('Instructions count:', transaction.instructions.length);
    transaction.instructions.forEach((ix, i) => {
      console.log(`Instruction ${i}:`, {
        programId: ix.programId.toBase58(),
        keys: ix.keys.map(k => ({
          pubkey: k.pubkey.toBase58(),
          isSigner: k.isSigner,
          isWritable: k.isWritable,
        })),
        dataLength: ix.data.length,
      });
    });

    // Simulate transaction to get detailed error
    try {
      const simulation = await connection.simulateTransaction(transaction);
      console.log('Simulation result:', simulation.value);
      if (simulation.value.err) {
        console.error('Simulation error:', simulation.value.err);
        console.error('Logs:', simulation.value.logs);
        throw new Error(`Transaction simulation failed: ${JSON.stringify(simulation.value.err)}\nLogs: ${simulation.value.logs?.join('\n')}`);
      }
    } catch (simError) {
      console.error('Simulation failed:', simError);
      // Continue anyway - might work even if simulation fails
    }
    console.log('=========================');

    // Send transaction (wallet will sign)
    let signature: string;
    try {
      signature = await sendTransaction(transaction, connection);
    } catch (error) {
      const errorMessage = (error as Error).message || 'Unknown error';
      console.error('Send transaction error:', error);
      if (errorMessage.includes('User rejected')) {
        throw new Error('Transaction rejected by user.');
      }
      if (errorMessage.includes('insufficient')) {
        throw new Error('Insufficient SOL balance for transaction fees.');
      }
      throw new Error(`Failed to send transaction: ${errorMessage}`);
    }

    // Wait for confirmation
    try {
      await connection.confirmTransaction(signature, 'confirmed');
    } catch (error) {
      throw new Error(`Transaction sent but confirmation failed. Check explorer: ${signature}`);
    }

    return {
      vkAccount: vkKeypair.publicKey.toBase58(),
      txSignature: signature,
    };
  }, [publicKey, connection, sendTransaction]);

  // Verify proof on-chain
  const verify = useCallback(async (
    solanaProofData: SolanaProofData,
    vkAccount: string,
    onStep?: (step: 'submitting' | 'confirming') => void
  ): Promise<VerifyResult> => {
    if (!publicKey) {
      throw new Error('Wallet not connected');
    }

    if (!sendTransaction) {
      throw new Error('Wallet does not support signing transactions.');
    }

    // DEBUG: Log verify context
    console.log('=== VERIFY DEBUG ===');
    console.log('RPC Endpoint:', connection.rpcEndpoint);
    console.log('Wallet PublicKey:', publicKey.toBase58());
    console.log('VK Account:', vkAccount);
    console.log('Program ID:', PROGRAM_ID);
    console.log('Proof bytes length:', solanaProofData.proof.bytes.length);
    console.log('Proof bytes (first 32):', Array.from(solanaProofData.proof.bytes.slice(0, 32)));
    console.log('Public inputs count:', solanaProofData.publicInputs.bytes.length);
    solanaProofData.publicInputs.bytes.forEach((input: Uint8Array, i: number) => {
      console.log(`Public input ${i} (${input.length} bytes):`, Array.from(input));
    });
    console.log('====================');

    // Check if VK account exists and compare VK data
    try {
      const vkAccountInfo = await connection.getAccountInfo(new PublicKey(vkAccount));
      console.log('=== VK ACCOUNT CHECK ===');
      if (vkAccountInfo) {
        console.log('VK Account exists');
        console.log('VK Account owner:', vkAccountInfo.owner.toBase58());
        console.log('VK Account data length:', vkAccountInfo.data.length, 'bytes');
        console.log('VK Account lamports:', vkAccountInfo.lamports / LAMPORTS_PER_SOL, 'SOL');

        // Parse the VK account data structure:
        // discriminator (8) + authority (32) + nr_pubinputs (1) + alpha_g1 (64) + ...
        const discriminator = Array.from(vkAccountInfo.data.slice(0, 8));
        const authority = new PublicKey(vkAccountInfo.data.slice(8, 40)).toBase58();
        const nrPubInputs = vkAccountInfo.data[40];
        const alphaG1OnChain = Array.from(vkAccountInfo.data.slice(41, 41 + 64));

        console.log('VK on-chain discriminator:', discriminator);
        console.log('VK on-chain authority:', authority);
        console.log('VK on-chain nr_pubinputs:', nrPubInputs);
        console.log('VK on-chain alpha_g1 (first 32):', alphaG1OnChain.slice(0, 32));

        // Compare with VK from proof data
        const vkFromProof = solanaProofData.verifyingKey.bytes;
        const alphaG1FromProof = Array.from(vkFromProof.slice(0, 32));

        console.log('VK from proof bytes length:', vkFromProof.length);
        console.log('VK from proof alpha_g1 (first 32):', alphaG1FromProof);
        console.log('VK from proof nr_pubinputs:', solanaProofData.verifyingKey.nrPublicInputs);

        // Check if they match
        const alphaMatch = alphaG1OnChain.slice(0, 32).every((b, i) => b === alphaG1FromProof[i]);
        console.log('*** VK ALPHA MATCH:', alphaMatch ? '✓ YES' : '✗ NO - VK MISMATCH! ***');

        if (!alphaMatch) {
          console.error('VK MISMATCH DETECTED! The proof was generated with a different VK than deployed on-chain.');
          console.error('This happens when you generate a new proof after deploying.');
          console.error('Solution: Re-deploy the VK, then verify.');
        }
      } else {
        console.error('VK Account does NOT exist!');
        throw new Error(`VK Account ${vkAccount} does not exist. Deploy it first.`);
      }
      console.log('========================');
    } catch (error) {
      if ((error as Error).message.includes('does not exist')) {
        throw error;
      }
      console.error('Failed to check VK account:', error);
    }

    const builder = new SolanaTransactionBuilder({
      programId: PROGRAM_ID,
      computeUnits: 400_000,
    });

    // Build verify instruction
    const verifyIx = builder.buildVerifyProofInstruction(
      solanaProofData.proof.bytes,
      solanaProofData.publicInputs.bytes,
      { vkAccount }
    );

    console.log('=== VERIFY INSTRUCTION DEBUG ===');
    console.log('Verify instruction programId:', verifyIx.programId);
    console.log('Verify instruction keys:', verifyIx.keys);
    console.log('Verify instruction data length:', verifyIx.data.length);
    console.log('Verify instruction data (first 32 bytes):', Array.from(verifyIx.data.slice(0, 32)));
    console.log('================================');

    const computeBudgetIx = builder.buildSetComputeUnitLimitInstruction(400_000);

    // Convert to TransactionInstructions
    const budgetInstruction = new TransactionInstruction({
      programId: new PublicKey(computeBudgetIx.programId),
      keys: computeBudgetIx.keys.map(k => ({
        pubkey: new PublicKey(k.pubkey),
        isSigner: k.isSigner,
        isWritable: k.isWritable,
      })),
      data: Buffer.from(computeBudgetIx.data),
    });

    const verifyInstruction = new TransactionInstruction({
      programId: new PublicKey(verifyIx.programId),
      keys: verifyIx.keys.map(k => ({
        pubkey: new PublicKey(k.pubkey),
        isSigner: k.isSigner,
        isWritable: k.isWritable,
      })),
      data: Buffer.from(verifyIx.data),
    });

    // Create transaction
    const transaction = new Transaction();
    transaction.add(budgetInstruction);
    transaction.add(verifyInstruction);

    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = publicKey;

    // DEBUG: Log transaction details
    console.log('=== VERIFY TRANSACTION DEBUG ===');
    console.log('Instructions count:', transaction.instructions.length);
    transaction.instructions.forEach((ix, i) => {
      console.log(`Instruction ${i}:`, {
        programId: ix.programId.toBase58(),
        keys: ix.keys.map(k => ({
          pubkey: k.pubkey.toBase58(),
          isSigner: k.isSigner,
          isWritable: k.isWritable,
        })),
        dataLength: ix.data.length,
        dataHex: Buffer.from(ix.data).toString('hex').slice(0, 64) + '...',
      });
    });

    // Simulate transaction to get detailed error
    try {
      const simulation = await connection.simulateTransaction(transaction);
      console.log('Simulation result:', simulation.value);
      console.log('Simulation logs:', simulation.value.logs);
      if (simulation.value.err) {
        console.error('Simulation error:', simulation.value.err);
        console.error('Simulation logs:', simulation.value.logs);
        throw new Error(`Transaction simulation failed: ${JSON.stringify(simulation.value.err)}\nLogs: ${simulation.value.logs?.join('\n')}`);
      }
    } catch (simError) {
      console.error('Simulation failed:', simError);
      // Re-throw if it's our custom error
      if ((simError as Error).message.includes('simulation failed')) {
        throw simError;
      }
      // Continue anyway for other errors - might work even if simulation fails
    }
    console.log('================================');

    // Step: Submitting to Solana
    onStep?.('submitting');
    let signature: string;
    try {
      signature = await sendTransaction(transaction, connection);
      console.log('Transaction sent, signature:', signature);
    } catch (error) {
      const errorMessage = (error as Error).message || 'Unknown error';
      console.error('Send transaction error:', error);
      if (errorMessage.includes('User rejected')) {
        throw new Error('Transaction rejected by user.');
      }
      if (errorMessage.includes('insufficient')) {
        throw new Error('Insufficient SOL balance for transaction fees.');
      }
      throw new Error(`Failed to send transaction: ${errorMessage}`);
    }

    // Step: Waiting for confirmation
    onStep?.('confirming');
    let confirmation;
    try {
      confirmation = await connection.confirmTransaction(signature, 'confirmed');
      console.log('Transaction confirmed:', confirmation);
      if (confirmation.value.err) {
        console.error('Transaction error:', confirmation.value.err);
      }
    } catch (error) {
      console.error('Confirmation failed:', error);
      throw new Error(`Transaction sent but confirmation failed. Check explorer: ${signature}`);
    }

    return {
      txSignature: signature,
      verified: !confirmation.value.err,
    };
  }, [publicKey, connection, sendTransaction]);

  // Get Solana Explorer URL
  const getExplorerUrl = useCallback((signature: string) => {
    return `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
  }, []);

  // Get account explorer URL
  const getAccountExplorerUrl = useCallback((account: string) => {
    return `https://explorer.solana.com/address/${account}?cluster=devnet`;
  }, []);

  return {
    connected,
    publicKey,
    balance,
    isLoadingBalance,
    fetchBalance,
    deploy,
    verify,
    getExplorerUrl,
    getAccountExplorerUrl,
  };
}
