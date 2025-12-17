'use client';

import { useCallback, useMemo, useState, useEffect } from 'react';
import { usePrivy, useConnectWallet } from '@privy-io/react-auth';
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
  connectWallet: () => Promise<void>;
  
  // Solana operations
  getBalance: () => Promise<number>;
  ensureBalance: (requiredLamports: number) => Promise<{ success: boolean; message?: string; currentBalance?: number }>;
  signAndSendTransaction: (tx: Transaction) => Promise<string>;
}

export function useSolanaWallet(): SolanaWalletState {
  const { ready, authenticated, user, login: privyLogin, logout: privyLogout } = usePrivy();
  const { connectWallet: privyConnectWallet } = useConnectWallet();
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
    if (walletsReady && wallets && wallets.length > 0) {
      // Prioritize external wallets connected through Privy (Phantom, Solflare, etc.)
      // External wallets have walletClientType that is NOT 'privy'
      const externalPrivyWallet = wallets.find((w: any) => w.walletClientType && w.walletClientType !== 'privy');
      if (externalPrivyWallet) {
        return {
          address: externalPrivyWallet.address,
          type: 'external' as const,
          wallet: externalPrivyWallet, // Privy-managed external wallet, can use signTransaction
        };
      }
      
      // Fall back to Privy embedded wallet (has walletClientType: 'privy')
      const privyEmbeddedWallet = wallets.find((w: any) => w.walletClientType === 'privy');
      if (privyEmbeddedWallet) {
        return {
          address: privyEmbeddedWallet.address,
          type: 'embedded' as const,
          wallet: privyEmbeddedWallet,
        };
      }
      
      // Use first available Privy wallet as fallback
      return {
        address: wallets[0].address,
        type: wallets[0].walletClientType === 'privy' ? 'embedded' as const : 'external' as const,
        wallet: wallets[0],
      };
    }
    
    // Fall back to external Phantom wallet detected directly (not through Privy)
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
    
    // Use Privy wallet signing (works for both embedded and external wallets connected through Privy)
    if (activeWallet.wallet && (activeWallet.type === 'embedded' || activeWallet.type === 'external')) {
      try {
        // The backend sends a fully-formed Transaction with:
        // - Instructions (with all account keys, program ID, instruction data)
        // - Fee payer (already set to the wallet)
        // - Blockhash (already set)
        // 
        // We need to convert it to @solana/kit format for Privy's signTransaction
        const walletPubkey = new PublicKey(activeWallet.address);
        
        // Ensure feePayer matches (backend should already have set it correctly)
        if (!tx.feePayer) {
          tx.feePayer = walletPubkey;
        }
        
        // Get blockhash - use the one from transaction if present, otherwise fetch fresh
        // Using a fresh blockhash is safer (more time remaining before expiration)
        const rpc = createSolanaRpc(connection.rpcEndpoint);
        const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
        
        // Convert PublicKey to Address type for @solana/kit
        const feePayerAddress = address(tx.feePayer!.toBase58());
        
        // Convert legacy TransactionInstructions to @solana/kit format
        // fromLegacyTransactionInstruction preserves: instruction data, accounts, program ID, signer/writable flags
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
          chain: 'solana:devnet', // Explicitly specify devnet chain (works for both embedded and external Privy wallets)
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
    
    // Use external wallet detected directly (Phantom not connected through Privy)
    // Note: External wallets connected through Privy are handled above
    if (activeWallet.type === 'external' && (activeWallet as any).provider && !activeWallet.wallet) {
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
  
  // Connect external wallet (for users who signed up with email/Google and want to use existing wallet)
  const connectWallet = useCallback(async (): Promise<void> => {
    try {
      await privyConnectWallet({ walletChainType: 'solana-only' });
    } catch (error: any) {
      console.error('Failed to connect wallet:', error);
      throw new Error(error?.message || 'Failed to connect wallet');
    }
  }, [privyConnectWallet]);
  
  return {
    isAuthenticated: authenticated,
    isReady: ready && walletsReady,
    user: userInfo,
    walletAddress: activeWallet?.address || null,
    walletType: activeWallet?.type || null,
    login: privyLogin,
    logout: privyLogout,
    connectWallet,
    getBalance,
    ensureBalance,
    signAndSendTransaction,
  };
}
