'use client';

import { useCallback, useMemo, useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets, useSignTransaction } from '@privy-io/react-auth/solana';
import { Transaction, PublicKey } from '@solana/web3.js';
import { getConnection, requestAirdrop } from '@/lib/solana';
import {
  pipe,
  createTransactionMessage,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstructions,
  compileTransaction,
  getTransactionEncoder,
  createSolanaRpc,
  address,
} from '@solana/kit';
import { fromLegacyTransactionInstruction } from '@solana/compat';

export interface SolanaWalletState {
  // Auth state
  isAuthenticated: boolean;
  isReady: boolean;
  
  // User info
  user: {
    email?: string;
    name?: string;
    username?: string;
  } | null;
  
  // Wallet info
  walletAddress: string | null;
  walletType: 'embedded' | 'external' | null;
  
  // Actions
  login: () => void;
  logout: () => Promise<void>;
  
  // Solana operations
  getBalance: () => Promise<number>;
  ensureBalance: (requiredLamports: number) => Promise<{ success: boolean; message?: string; currentBalance?: number }>;
  signAndSendTransaction: (tx: Transaction) => Promise<string>;
}

export function useSolanaWallet(): SolanaWalletState {
  const { ready, authenticated, user, login: privyLogin, logout: privyLogout } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();
  const { signTransaction } = useSignTransaction();
  
  // Also track external Phantom wallet
  const [externalWallet, setExternalWallet] = useState<{ address: string; provider: any } | null>(null);
  
  // Check for external Phantom wallet
  useEffect(() => {
    const checkExternalWallet = () => {
      if (typeof window !== 'undefined') {
        const phantom = (window as any).phantom?.solana || (window as any).solana;
        if (phantom?.isPhantom && phantom?.publicKey) {
          setExternalWallet({
            address: phantom.publicKey.toString(),
            provider: phantom,
          });
        } else {
          setExternalWallet(null);
        }
      }
    };
    
    checkExternalWallet();
    
    const phantom = (window as any).phantom?.solana || (window as any).solana;
    if (phantom) {
      phantom.on?.('connect', checkExternalWallet);
      phantom.on?.('disconnect', () => setExternalWallet(null));
    }
    
    return () => {
      if (phantom) {
        phantom.off?.('connect', checkExternalWallet);
        phantom.off?.('disconnect', () => setExternalWallet(null));
      }
    };
  }, []);
  
  // Get the best wallet to use
  const activeWallet = useMemo(() => {
    // First check for Privy embedded wallets
    if (walletsReady && wallets && wallets.length > 0) {
      // Find the Privy embedded wallet (has walletClientType: 'privy')
      const privyWallet = wallets.find((w: any) => w.walletClientType === 'privy');
      if (privyWallet) {
        return {
          address: privyWallet.address,
          type: 'embedded' as const,
          wallet: privyWallet,
        };
      }
      
      // Otherwise use first available Privy wallet
      return {
        address: wallets[0].address,
        type: 'embedded' as const,
        wallet: wallets[0],
      };
    }
    
    // Fall back to external Phantom wallet
    if (externalWallet) {
      return {
        address: externalWallet.address,
        type: 'external' as const,
        wallet: null,
        provider: externalWallet.provider,
      };
    }
    
    return null;
  }, [wallets, walletsReady, externalWallet]);
  
  // User info
  const userInfo = useMemo(() => {
    if (!user) return null;
    return {
      email: user.email?.address,
      name: user.google?.name || undefined,
      username: user.twitter?.username || undefined,
    };
  }, [user]);
  
  // Get SOL balance
  const getBalance = useCallback(async (): Promise<number> => {
    if (!activeWallet?.address) return 0;
    
    try {
      const connection = getConnection();
      return await connection.getBalance(new PublicKey(activeWallet.address));
    } catch (error) {
      console.error('Failed to get balance:', error);
      return 0;
    }
  }, [activeWallet?.address]);
  
  // Check balance (no automatic airdrop - users use faucet manually)
  const ensureBalance = useCallback(async (requiredLamports: number): Promise<{ success: boolean; message?: string; currentBalance?: number }> => {
    if (!activeWallet?.address) {
      return { success: false, message: 'No wallet available' };
    }
    
    try {
      const currentBalance = await getBalance();
      
      if (currentBalance >= requiredLamports) {
        return { success: true, currentBalance };
      }
      
      // Insufficient balance - return info for UI to show funding modal
      const neededSol = (requiredLamports - currentBalance) / 1e9;
      const cluster = process.env.NEXT_PUBLIC_CLUSTER || 'devnet';
      const fundingMethod = cluster === 'mainnet-beta' ? 'Add funds via on-ramp' : 'Get test SOL from faucet';
      return { 
        success: false, 
        currentBalance,
        message: `Insufficient balance. You need ${neededSol.toFixed(4)} more SOL. ${fundingMethod}.` 
      };
    } catch (error: any) {
      console.error('Balance check failed:', error);
      return { 
        success: false, 
        message: `Failed to check balance: ${error?.message || 'Unknown error'}` 
      };
    }
  }, [activeWallet?.address, getBalance]);
  
  // Sign and send transaction
  const signAndSendTransaction = useCallback(async (tx: Transaction): Promise<string> => {
    if (!activeWallet) {
      throw new Error('No wallet available');
    }
    
    const connection = getConnection();
    
    // Use Privy embedded wallet signing
    if (activeWallet.type === 'embedded' && activeWallet.wallet) {
      try {
        // Ensure feePayer and blockhash are set (should already be set by backend)
        const walletPubkey = new PublicKey(activeWallet.address);
        if (!tx.feePayer) {
          tx.feePayer = walletPubkey;
        }
        if (!tx.recentBlockhash) {
          const { blockhash } = await connection.getLatestBlockhash('confirmed');
          tx.recentBlockhash = blockhash;
        }
        
        // Privy works best with @solana/kit format
        // Convert the legacy Transaction to @solana/kit format
        const rpc = createSolanaRpc(connection.rpcEndpoint);
        const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
        
        // Convert PublicKey to Address type for @solana/kit
        const feePayerAddress = address(tx.feePayer!.toBase58());
        
        // Convert legacy TransactionInstructions to @solana/kit format
        const kitInstructions = tx.instructions.map(inst => fromLegacyTransactionInstruction(inst));
        
        // Build and encode transaction message using @solana/kit (following Privy docs pattern)
        // According to Privy docs: compileTransaction then encode with getTransactionEncoder
        const transaction = pipe(
          createTransactionMessage({ version: 0 }),
          (msg) => setTransactionMessageFeePayer(feePayerAddress, msg),
          (msg) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, msg),
          (msg) => appendTransactionMessageInstructions(kitInstructions, msg),
          (msg) => compileTransaction(msg),
          (msg) => new Uint8Array(getTransactionEncoder().encode(msg))
        );
        
        const { signedTransaction } = await signTransaction({
          transaction: transaction,
          wallet: activeWallet.wallet,
          chain: 'solana:devnet', // Explicitly specify devnet chain
        });
        
        // signedTransaction is a Uint8Array ready to send
        const signature = await connection.sendRawTransaction(signedTransaction, {
          skipPreflight: false,
          maxRetries: 3,
        });
        
        // Get confirmation commitment level
        const commitment = 'confirmed';
        await connection.confirmTransaction(signature, commitment);
        
        return signature;
      } catch (error: any) {
        console.error('Privy signing error:', error);
        throw new Error(error.message || 'Failed to sign transaction');
      }
    }
    
    // Use external wallet (Phantom)
    if (activeWallet.type === 'external' && (activeWallet as any).provider) {
      const provider = (activeWallet as any).provider;
      
      try {
        let signature: string;
        
        if (typeof provider.sendTransaction === 'function') {
          signature = await provider.sendTransaction(tx, connection, {
            skipPreflight: false,
            maxRetries: 3,
            preflightCommitment: 'confirmed',
          });
        } else if (typeof provider.signTransaction === 'function') {
          const signed = await provider.signTransaction(tx);
          signature = await connection.sendRawTransaction(signed.serialize(), {
            skipPreflight: false,
            maxRetries: 3,
          });
        } else {
          throw new Error('Wallet does not support transactions');
        }
        
        // Confirm transaction
        await connection.confirmTransaction(signature, 'confirmed');
        
        return signature;
      } catch (error: any) {
        if (error.message?.includes('rejected') || error.message?.includes('cancelled') || error.code === 4001) {
          throw new Error('Transaction cancelled');
        }
        throw error;
      }
    }
    
    throw new Error('No signing method available');
  }, [activeWallet, signTransaction]);
  
  return {
    isAuthenticated: authenticated,
    isReady: ready && walletsReady,
    user: userInfo,
    walletAddress: activeWallet?.address || null,
    walletType: activeWallet?.type || null,
    login: privyLogin,
    logout: privyLogout,
    getBalance,
    ensureBalance,
    signAndSendTransaction,
  };
}
