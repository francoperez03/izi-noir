import { useCallback, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import {
  Keypair,
  Transaction,
  TransactionInstruction,
  SystemProgram,
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
      throw new Error('Wallet not connected');
    }

    const builder = new SolanaTransactionBuilder({
      programId: PROGRAM_ID,
      computeUnits: 400_000,
    });

    // Generate a new keypair for the VK account
    const vkKeypair = Keypair.generate();

    // Build instructions
    const { initVk, computeBudget, rentLamports } = builder.buildInitAndVerifyInstructions(
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

    // Create transaction with rent for the VK account
    const transaction = new Transaction();

    // Add instruction to create the VK account with rent
    transaction.add(
      SystemProgram.createAccount({
        fromPubkey: publicKey,
        newAccountPubkey: vkKeypair.publicKey,
        lamports: rentLamports,
        space: solanaProofData.accountSize,
        programId: new PublicKey(PROGRAM_ID),
      })
    );

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

    // Send transaction (wallet will sign)
    const signature = await sendTransaction(transaction, connection);

    // Wait for confirmation
    await connection.confirmTransaction(signature, 'confirmed');

    return {
      vkAccount: vkKeypair.publicKey.toBase58(),
      txSignature: signature,
    };
  }, [publicKey, connection, sendTransaction]);

  // Verify proof on-chain
  const verify = useCallback(async (
    solanaProofData: SolanaProofData,
    vkAccount: string
  ): Promise<VerifyResult> => {
    if (!publicKey) {
      throw new Error('Wallet not connected');
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

    // Send transaction
    const signature = await sendTransaction(transaction, connection);

    // Wait for confirmation
    const confirmation = await connection.confirmTransaction(signature, 'confirmed');

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
