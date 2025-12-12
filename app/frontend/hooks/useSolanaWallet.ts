'use client';

import { useCallback, useMemo, useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets, useSignTransaction } from '@privy-io/react-auth/solana';
import { Transaction, PublicKey } from '@solana/web3.js';
import { getConnection, requestAirdrop } from '@/lib/solana';

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
  ensureBalance: (requiredLamports: number) => Promise<{ success: boolean; message?: string }>;
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
  
  // Ensure minimum balance (airdrop on devnet)
  const ensureBalance = useCallback(async (requiredLamports: number): Promise<{ success: boolean; message?: string }> => {
    if (!activeWallet?.address) {
      return { success: false, message: 'No wallet available' };
    }
    
    // Only attempt airdrop on devnet
    const cluster = process.env.NEXT_PUBLIC_CLUSTER || 'devnet';
    if (cluster !== 'devnet') {
      return { 
        success: false, 
        message: 'Airdrops are only available on devnet. Please ensure you have sufficient balance.' 
      };
    }
    
    try {
      const currentBalance = await getBalance();
      
      if (currentBalance >= requiredLamports) {
        return { success: true };
      }
      
      // Calculate needed amount (with buffer for tx fees)
      const neededLamports = requiredLamports - currentBalance + 10_000_000; // Add 0.01 SOL buffer
      const neededSol = neededLamports / 1e9;
      
      // Request in chunks (max 2 SOL per request, daily limit is 24 SOL)
      // Try requesting exactly what's needed, capped at 2 SOL
      const airdropAmountSol = Math.min(Math.max(neededSol, 0.1), 2);
      
      console.log(
        `Balance insufficient. Current: ${(currentBalance / 1e9).toFixed(4)} SOL, ` +
        `Required: ${(requiredLamports / 1e9).toFixed(4)} SOL. ` +
        `Requesting ${airdropAmountSol} SOL airdrop...`
      );
      
      try {
        const signature = await requestAirdrop(activeWallet.address, airdropAmountSol, 3);
        console.log(`Airdrop transaction confirmed: ${signature}`);
        
        // Wait for balance to update (give it a few seconds)
        let newBalance = await getBalance();
        let retries = 0;
        while (newBalance < requiredLamports && retries < 5) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          newBalance = await getBalance();
          retries++;
        }
        
        if (newBalance >= requiredLamports) {
          return { 
            success: true, 
            message: `Airdropped ${airdropAmountSol} SOL successfully. New balance: ${(newBalance / 1e9).toFixed(4)} SOL` 
          };
        }
        
        // Balance still insufficient - might need another airdrop (but respect daily limits)
        const stillNeeded = (requiredLamports - newBalance) / 1e9;
        return { 
          success: false, 
          message: `Airdrop completed but balance still insufficient. ` +
                   `Current: ${(newBalance / 1e9).toFixed(4)} SOL, ` +
                   `Need: ${(requiredLamports / 1e9).toFixed(4)} SOL. ` +
                   `Please use https://faucet.solana.com to get more test SOL.` 
        };
      } catch (airdropError: any) {
        // Re-throw to be caught by outer catch
        throw airdropError;
      }
    } catch (error: any) {
      console.error('Airdrop failed:', error);
      
      // Extract error message
      const errorMsg = error?.message || error?.toString() || 'Unknown error';
      
      // Return the detailed error message from requestAirdrop
      return { success: false, message: errorMsg };
    }
  }, [activeWallet?.address, getBalance]);
  
  // Sign and send transaction
  const signAndSendTransaction = useCallback(async (tx: Transaction): Promise<string> => {
    if (!activeWallet) {
      throw new Error('No wallet available');
    }
    
    const connection = getConnection();
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    tx.recentBlockhash = blockhash;
    tx.feePayer = new PublicKey(activeWallet.address);
    
    // Use Privy embedded wallet signing
    if (activeWallet.type === 'embedded' && activeWallet.wallet) {
      try {
        const serializedMessage = tx.serializeMessage();
        
        const { signedTransaction } = await signTransaction({
          transaction: serializedMessage,
          wallet: activeWallet.wallet,
        });
        
        const signature = await connection.sendRawTransaction(signedTransaction, {
          skipPreflight: false,
          maxRetries: 3,
        });
        
        await connection.confirmTransaction({
          signature,
          blockhash,
          lastValidBlockHeight,
        }, 'confirmed');
        
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
        
        await connection.confirmTransaction({
          signature,
          blockhash,
          lastValidBlockHeight,
        }, 'confirmed');
        
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
