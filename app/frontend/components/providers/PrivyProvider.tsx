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
        
        // Configure Solana RPC endpoints
        // Privy internally defaults to mainnet during initialization, so we need to configure it
        // Your app's actual network is controlled by getConnection() and NEXT_PUBLIC_SOLANA_RPC (devnet)
        solana: {
          rpcs: {
            'solana:devnet': {
              rpc: createSolanaRpc('https://api.devnet.solana.com'),
              rpcSubscriptions: createSolanaRpcSubscriptions('wss://api.devnet.solana.com'),
            },
            // Privy needs mainnet configured to prevent errors, but your app still uses devnet
            // because getConnection() uses NEXT_PUBLIC_SOLANA_RPC which is devnet
            'solana:mainnet': {
              rpc: createSolanaRpc('https://api.mainnet-beta.solana.com'),
              rpcSubscriptions: createSolanaRpcSubscriptions('wss://api.mainnet-beta.solana.com'),
            },
          },
        },
      }}
    >
      {children}
    </PrivyAuthProvider>
  );
}
