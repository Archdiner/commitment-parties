/**
 * Solana utilities for interacting with the Commitment Pool program
 * Handles PDA derivation, instruction building, and transaction signing
 */

import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
  Keypair,
} from '@solana/web3.js';
import { Program, AnchorProvider, Wallet } from '@coral-xyz/anchor';
import bs58 from 'bs58';

// Program ID from Anchor.toml (devnet deployment)
const PROGRAM_ID = process.env.NEXT_PUBLIC_PROGRAM_ID || 'GSvoKxVHbtAY2mAAU4RM3PVQC3buLSjRm24N7QhAoieH';
// Default to devnet - change to mainnet-beta RPC for production
const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.devnet.solana.com';

/**
 * Get Solana connection (devnet by default)
 */
export function getConnection(): Connection {
  // Ensure we're using devnet
  const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.devnet.solana.com';
  return new Connection(rpcUrl, 'confirmed');
}

/**
 * Get cluster (devnet/mainnet)
 */
export function getCluster(): 'devnet' | 'mainnet-beta' {
  const cluster = process.env.NEXT_PUBLIC_CLUSTER || 'devnet';
  return cluster === 'mainnet-beta' ? 'mainnet-beta' : 'devnet';
}

/**
 * Alternative RPC endpoints for devnet (fallback if primary fails)
 */
const DEVNET_RPC_ENDPOINTS = [
  'https://api.devnet.solana.com',
  'https://solana-devnet-rpc.allthatnode.com',
  'https://rpc.ankr.com/solana_devnet',
];

/**
 * Request devnet SOL airdrop with retry logic and fallback RPC endpoints
 * @param walletAddress - Wallet address to airdrop to
 * @param amount - Amount in SOL (will be converted to lamports)
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @returns Transaction signature
 */
export async function requestAirdrop(
  walletAddress: string, 
  amount: number = 2,
  maxRetries: number = 3
): Promise<string> {
  // Only allow airdrops on devnet
  const cluster = getCluster();
  if (cluster !== 'devnet') {
    throw new Error(
      'Airdrops are only available on devnet. ' +
      'Please switch to devnet or manually fund your wallet.'
    );
  }
  
  const publicKey = new PublicKey(walletAddress);
  
  // Validate amount (max 2 SOL per request on devnet, daily limit is 24 SOL)
  const solAmount = Math.min(Math.max(amount, 0.1), 2); // Min 0.1, max 2 SOL
  const lamports = Math.floor(solAmount * 1e9);
  
  if (lamports <= 0 || lamports > 2e9) {
    throw new Error(`Invalid airdrop amount: ${solAmount} SOL (must be between 0.1 and 2 SOL)`);
  }
  
  // Try each RPC endpoint with retries
  const errors: string[] = [];
  
  for (const rpcUrl of DEVNET_RPC_ENDPOINTS) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const connection = new Connection(rpcUrl, 'confirmed');
        
        // Exponential backoff: 1s, 2s, 4s
        if (attempt > 0) {
          const delay = Math.pow(2, attempt - 1) * 1000;
          console.log(`Airdrop retry ${attempt}/${maxRetries - 1} after ${delay}ms delay (RPC: ${rpcUrl})...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        // Request airdrop
        console.log(`Requesting ${solAmount} SOL airdrop via ${rpcUrl}...`);
        const signature = await connection.requestAirdrop(publicKey, lamports);
        
        // Wait for confirmation with timeout (30s)
        const confirmation = await Promise.race([
          connection.confirmTransaction(signature, 'confirmed'),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Airdrop confirmation timeout')), 30000)
          )
        ]) as any;
        
        if (confirmation?.value?.err) {
          const errorMsg = JSON.stringify(confirmation.value.err);
          throw new Error(`Airdrop transaction failed: ${errorMsg}`);
        }
        
        console.log(`Airdrop successful: ${signature}`);
  return signature;
      } catch (error: any) {
        const errorMessage = error?.message || error?.toString() || 'Unknown error';
        errors.push(`[${rpcUrl}] ${errorMessage}`);
        
        // Check if this is a rate limit error - don't retry immediately
        if (
          errorMessage.includes('429') ||
          errorMessage.includes('rate limit') ||
          errorMessage.includes('too many requests') ||
          errorMessage.includes('429 Too Many Requests') ||
          error?.code === 429
        ) {
          // Rate limited - try next RPC endpoint or throw with helpful message
          console.warn(`Rate limited on ${rpcUrl}, trying next endpoint...`);
          break; // Break retry loop, try next RPC
        }
        
        // Check for other retryable errors
        const isRetryable = 
          errorMessage.includes('Internal error') ||
          errorMessage.includes('internal error') ||
          errorMessage.includes('500') ||
          errorMessage.includes('timeout') ||
          errorMessage.includes('network') ||
          errorMessage.includes('ECONNREFUSED') ||
          error?.code === -32603 ||
          error?.code === -32002; // Transaction already in progress
        
        if (!isRetryable || attempt === maxRetries - 1) {
          // Non-retryable error or last attempt - try next RPC endpoint
          break;
        }
        
        // Continue to next retry
      }
    }
  }
  
  // All attempts failed - provide helpful error message
  const allErrors = errors.join('; ');
  
  // Check if all failures were rate limits
  if (allErrors.toLowerCase().includes('rate limit') || allErrors.includes('429')) {
    throw new Error(
      'Airdrop rate limited on all endpoints. ' +
      'Devnet has a daily limit of 24 SOL per wallet. ' +
      'Please wait 24 hours or use an alternative faucet: https://faucet.solana.com'
    );
  }
  
  // Check if all failures were internal errors
  if (allErrors.toLowerCase().includes('internal error')) {
    throw new Error(
      'Devnet airdrop temporarily unavailable on all endpoints. ' +
      'This can happen due to high demand. ' +
      'Please try again in a few minutes or use: https://faucet.solana.com'
    );
  }
  
  // Generic error with all details
  throw new Error(
    `Airdrop failed after ${maxRetries} attempts on ${DEVNET_RPC_ENDPOINTS.length} endpoints. ` +
    `Errors: ${allErrors}. ` +
    `Please try again later or use: https://faucet.solana.com`
  );
}

/**
 * Get program ID as PublicKey
 */
export function getProgramId(): PublicKey {
  return new PublicKey(PROGRAM_ID);
}

/**
 * Derive Anchor instruction discriminator
 * Anchor uses first 8 bytes of sha256("global:{instruction_name}")
 */
export async function getInstructionDiscriminator(instructionName: string): Promise<Buffer> {
  const prefix = `global:${instructionName}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(prefix);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return Buffer.from(hashArray.slice(0, 8));
}

/**
 * Browser-compatible buffer write helpers
 */
function writeBigUInt64LE(buffer: Buffer, value: bigint, offset: number): void {
  const view = new DataView(buffer.buffer, buffer.byteOffset + offset, 8);
  const low = Number(value & 0xffffffffn);
  const high = Number((value >> 32n) & 0xffffffffn);
  view.setUint32(0, low, true);
  view.setUint32(4, high, true);
}

function writeUInt32LE(buffer: Buffer, value: number, offset: number): void {
  const view = new DataView(buffer.buffer, buffer.byteOffset + offset, 4);
  view.setUint32(0, value, true);
}

function writeUInt16LE(buffer: Buffer, value: number, offset: number): void {
  const view = new DataView(buffer.buffer, buffer.byteOffset + offset, 2);
  view.setUint16(0, value, true);
}

function writeUInt8(buffer: Buffer, value: number, offset: number): void {
  buffer[offset] = value;
}

/**
 * Derive Pool PDA
 */
export async function derivePoolPDA(poolId: number): Promise<[PublicKey, number]> {
  const programId = getProgramId();
  const poolIdBuffer = Buffer.allocUnsafe(8);
  writeBigUInt64LE(poolIdBuffer, BigInt(poolId), 0);
  
  const [pubkey, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from('pool'), poolIdBuffer],
    programId
  );
  
  return [pubkey, bump];
}

/**
 * Derive Participant PDA
 */
export async function deriveParticipantPDA(
  poolPubkey: PublicKey,
  participantWallet: PublicKey
): Promise<[PublicKey, number]> {
  const programId = getProgramId();
  
  const [pubkey, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from('participant'), poolPubkey.toBuffer(), participantWallet.toBuffer()],
    programId
  );
  
  return [pubkey, bump];
}

/**
 * Derive Vault PDA
 */
export async function deriveVaultPDA(poolPubkey: PublicKey): Promise<[PublicKey, number]> {
  const programId = getProgramId();
  
  const [pubkey, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from('vault'), poolPubkey.toBuffer()],
    programId
  );
  
  return [pubkey, bump];
}

/**
 * Encode GoalType enum for Anchor
 */
export function encodeGoalType(goalType: string, params: any): Buffer {
  if (goalType === 'lifestyle_habit' || goalType === 'Lifestyle') {
    // LifestyleHabit { habit_name: String }
    const habitName = params.habit_name || params.name || 'Daily Habit';
    const habitBytes = Buffer.from(habitName, 'utf-8');
    const lengthBuffer = Buffer.allocUnsafe(4);
    writeUInt32LE(lengthBuffer, habitBytes.length, 0);
    return Buffer.concat([
      Buffer.from([2]), // Variant index for LifestyleHabit
      lengthBuffer,
      habitBytes,
    ]);
  } else if (goalType === 'hodl_token' || goalType === 'Crypto') {
    // HodlToken { token_mint: Pubkey, min_balance: u64 }
    const tokenMint = new PublicKey(params.token_mint || 'So11111111111111111111111111111111111111112'); // Default to SOL
    const minBalance = BigInt(params.min_balance || 0);
    const minBalanceBuffer = Buffer.allocUnsafe(8);
    writeBigUInt64LE(minBalanceBuffer, minBalance, 0);
    return Buffer.concat([
      Buffer.from([1]), // Variant index for HodlToken
      tokenMint.toBuffer(),
      minBalanceBuffer,
    ]);
  } else {
    // Default to LifestyleHabit
    const habitBytes = Buffer.from('Daily Habit', 'utf-8');
    const lengthBuffer = Buffer.allocUnsafe(4);
    writeUInt32LE(lengthBuffer, habitBytes.length, 0);
    return Buffer.concat([
      Buffer.from([2]),
      lengthBuffer,
      habitBytes,
    ]);
  }
}

/**
 * Encode DistributionMode enum for Anchor
 */
export function encodeDistributionMode(mode: string, winnerPercent: number = 100): Buffer {
  if (mode === 'competitive') {
    return Buffer.from([0]);
  } else if (mode === 'charity') {
    return Buffer.from([1]);
  } else if (mode === 'split') {
    return Buffer.concat([
      Buffer.from([2]),
      Buffer.from([winnerPercent]),
    ]);
  } else {
    return Buffer.from([0]); // Default to competitive
  }
}

/**
 * Build create_pool instruction
 */
export async function buildCreatePoolInstruction(
  poolId: number,
  creatorWallet: PublicKey,
  goalType: string,
  goalParams: any,
  stakeAmountLamports: number,
  durationDays: number,
  maxParticipants: number,
  minParticipants: number,
  charityAddress: string,
  distributionMode: string = 'competitive',
  winnerPercent: number = 100
): Promise<TransactionInstruction> {
  const programId = getProgramId();
  const [poolPDA] = await derivePoolPDA(poolId);
  const charityPubkey = new PublicKey(charityAddress);
  
  // Build instruction data
  const discriminator = await getInstructionDiscriminator('create_pool');
  const poolIdBuffer = Buffer.allocUnsafe(8);
  writeBigUInt64LE(poolIdBuffer, BigInt(poolId), 0);
  
  const goalTypeBytes = encodeGoalType(goalType, goalParams);
  const stakeAmountBuffer = Buffer.allocUnsafe(8);
  writeBigUInt64LE(stakeAmountBuffer, BigInt(stakeAmountLamports), 0);
  const durationDaysBuffer = Buffer.from([durationDays]);
  const maxParticipantsBuffer = Buffer.allocUnsafe(2);
  writeUInt16LE(maxParticipantsBuffer, maxParticipants, 0);
  const minParticipantsBuffer = Buffer.allocUnsafe(2);
  writeUInt16LE(minParticipantsBuffer, minParticipants, 0);
  const distModeBytes = encodeDistributionMode(distributionMode, winnerPercent);
  
  const instructionData = Buffer.concat([
    discriminator,
    poolIdBuffer,
    goalTypeBytes,
    stakeAmountBuffer,
    durationDaysBuffer,
    maxParticipantsBuffer,
    minParticipantsBuffer,
    charityPubkey.toBuffer(),
    distModeBytes,
  ]);
  
  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: poolPDA, isSigner: false, isWritable: true },
      { pubkey: creatorWallet, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: instructionData,
  });
}

/**
 * Build join_pool instruction
 */
export async function buildJoinPoolInstruction(
  poolId: number,
  participantWallet: PublicKey
): Promise<TransactionInstruction> {
  const programId = getProgramId();
  const [poolPDA] = await derivePoolPDA(poolId);
  const [vaultPDA] = await deriveVaultPDA(poolPDA);
  const [participantPDA] = await deriveParticipantPDA(poolPDA, participantWallet);
  
  // Build instruction data (just discriminator for join_pool)
  const discriminator = await getInstructionDiscriminator('join_pool');
  
  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: poolPDA, isSigner: false, isWritable: true },
      { pubkey: participantPDA, isSigner: false, isWritable: true },
      { pubkey: participantWallet, isSigner: true, isWritable: true },
      { pubkey: vaultPDA, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: discriminator,
  });
}

/**
 * Sign and send transaction using Phantom wallet
 */
export async function signAndSendTransaction(
  connection: Connection,
  instruction: TransactionInstruction,
  wallet: any // Phantom wallet object (window.solana) with publicKey
): Promise<string> {
  // Basic sanity check
  if (!wallet || !wallet.publicKey) {
    throw new Error('Wallet not connected. Please connect your Solana wallet.');
  }

  // Build transaction with single instruction
  const transaction = new Transaction().add(instruction);
  
  // Fetch recent blockhash (critical for wallet signing)
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = wallet.publicKey;
  
  let signature: string;

  try {
    // Preferred path: modern Phantom / wallet adapters expose sendTransaction
    if (typeof wallet.sendTransaction === 'function') {
      signature = await wallet.sendTransaction(transaction, connection, {
        skipPreflight: false,
        maxRetries: 3,
        preflightCommitment: 'confirmed',
      });
    }
    // Fallback: older or custom adapters that only expose signTransaction
    else if (typeof wallet.signTransaction === 'function') {
      const signed = await wallet.signTransaction(transaction);
      signature = await connection.sendRawTransaction(signed.serialize(), {
        skipPreflight: false,
        maxRetries: 3,
      });
    } else {
      throw new Error('Connected wallet does not support sending transactions.');
    }

    // Wait for confirmation
    const confirmation = await connection.confirmTransaction(
      { signature, blockhash, lastValidBlockHeight },
      'confirmed',
    );

    if (confirmation.value.err) {
      throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
    }

    return signature;
  } catch (error: any) {
    const msg = error?.message || error?.toString() || 'Unknown error';

    if (msg.toLowerCase().includes('user rejected') || msg.toLowerCase().includes('cancel')) {
      throw new Error('Transaction was cancelled by the user.');
    }

    console.error('Error sending Solana transaction:', { error: msg });
    throw new Error(`Transaction failed: ${msg}`);
  }
}

/**
 * Get SOL balance for a wallet
 */
export async function getBalance(walletAddress: string): Promise<number> {
  const connection = getConnection();
  const publicKey = new PublicKey(walletAddress);
  const balance = await connection.getBalance(publicKey);
  return balance / 1e9; // Convert lamports to SOL
}

/**
 * SOL mint address (native SOL, not an SPL token)
 */
const SOL_MINT = 'So11111111111111111111111111111111111111112';

/**
 * Get token balance for a wallet
 * Returns balance in the smallest unit (e.g., lamports for SOL, smallest unit for SPL tokens)
 */
export async function getTokenBalance(
  walletAddress: string,
  tokenMint: string
): Promise<number> {
  const connection = getConnection();
  const walletPublicKey = new PublicKey(walletAddress);
  
  // Handle native SOL specially
  if (tokenMint === SOL_MINT) {
    const balance = await connection.getBalance(walletPublicKey);
    return balance; // Already in lamports
  }

  // For SPL tokens, use getParsedTokenAccountsByOwner
  const mintPublicKey = new PublicKey(tokenMint);
  const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
    walletPublicKey,
    { mint: mintPublicKey }
  );

  // Sum balances across all token accounts for this mint
  let totalBalance = 0;
  for (const accountInfo of tokenAccounts.value) {
    const parsedInfo = accountInfo.account.data.parsed?.info;
    if (parsedInfo?.tokenAmount) {
      const amount = parsedInfo.tokenAmount.amount;
      if (amount) {
        totalBalance += parseInt(amount, 10);
      }
    }
  }

  return totalBalance;
}

/**
 * Convert SOL to lamports
 */
export function solToLamports(sol: number): number {
  return Math.floor(sol * 1e9);
}

/**
 * Convert lamports to SOL
 */
export function lamportsToSol(lamports: number): number {
  return lamports / 1e9;
}

