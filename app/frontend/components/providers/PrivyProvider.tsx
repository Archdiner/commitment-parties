'use client';

import { PrivyProvider as PrivyAuthProvider } from '@privy-io/react-auth';
import { createSolanaRpc, createSolanaRpcSubscriptions } from '@solana/kit';
import { ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

export function PrivyProvider({ children }: Props) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  
  if (!appId) {
    console.warn('NEXT_PUBLIC_PRIVY_APP_ID is not set - auth will not work');
    return <>{children}</>;
  }

  // Get Solana RPC URL from environment or default to devnet
  const solanaRpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.devnet.solana.com';
  // For WebSocket, use the official devnet WSS endpoint
  const solanaWssUrl = 'wss://api.devnet.solana.com';

  return (
    <PrivyAuthProvider
      appId={appId}
      config={{
        // Login methods - support both crypto and non-crypto users
        loginMethods: ['email', 'wallet', 'github'],
        
        // Appearance - matches your dark theme
        appearance: {
          theme: 'dark',
          accentColor: '#10b981', // emerald-500
          showWalletLoginFirst: false, // Show email/social first for non-crypto users
        },
        
        // Embedded wallet config for SOLANA - auto-create for all users
        embeddedWallets: {
          solana: {
            createOnLogin: 'all-users',
          },
        },
        
        // Configure Solana RPC endpoints - ONLY devnet (required for embedded wallets)
        // By only configuring devnet in rpcs, Privy will only use devnet
        // If mainnet is not configured here, Privy cannot access it
        solana: {
          rpcs: {
            'solana:devnet': {
              rpc: createSolanaRpc(solanaRpcUrl),
              rpcSubscriptions: createSolanaRpcSubscriptions(solanaWssUrl),
            },
            // Explicitly DO NOT configure 'solana:mainnet' - this prevents the error
          },
        },
        
        // Set default chain to devnet (works for both EVM and Solana)
        defaultChain: 'solana:devnet',
        
        // Restrict supported chains to only devnet (works for both EVM and Solana)
        supportedChains: ['solana:devnet'],
      }}
    >
      {children}
    </PrivyAuthProvider>
  );
}
