'use client';

import { PrivyProvider as PrivyAuthProvider } from '@privy-io/react-auth';
import { createSolanaRpc, createSolanaRpcSubscriptions } from '@solana/kit';
import { ReactNode, useMemo, useState, useEffect } from 'react';

interface Props {
  children: ReactNode;
}

// Safely get Solana wallet connectors - only in browser, with fallback
function getSolanaConnectors() {
  if (typeof window === 'undefined') {
    // During SSR/build, return null to skip externalWallets entirely
    // This prevents build errors - external wallets will be available at runtime
    return null;
  }
  
  try {
    const { toSolanaWalletConnectors } = require('@privy-io/react-auth/solana');
    const connectors = toSolanaWalletConnectors();
    // Validate connectors before returning
    if (connectors && typeof connectors === 'object') {
      return connectors;
    }
    return null;
  } catch (error) {
    // Silently fail - external wallets won't be available but app will still work
    return null;
  }
}

export function PrivyProvider({ children }: Props) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  
  if (!appId) {
    console.error('❌ NEXT_PUBLIC_PRIVY_APP_ID is not set - auth will not work');
    console.error('💡 Solution: Add NEXT_PUBLIC_PRIVY_APP_ID to your .env.local file');
    console.error('   Get your App ID from: https://dashboard.privy.io/');
    return <>{children}</>;
  }

  // Log configuration for debugging (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('🔐 Privy Configuration:', {
      appId: appId ? `${appId.substring(0, 8)}...` : 'NOT SET',
      network: 'devnet',
      origin: typeof window !== 'undefined' ? window.location.origin : 'SSR',
    });
  }

  // Get connectors - safe for both build-time and runtime
  const solanaConnectors = useMemo(() => getSolanaConnectors(), []);

  // Build config - conditionally add externalWallets only when connectors are available
  // During build/SSR, create a minimal safe config
  const isBrowser = typeof window !== 'undefined';
  
  const config: any = {
    // Login methods - support both crypto and non-crypto users
    loginMethods: ['email', 'wallet', 'github'],
    
    // Appearance - matches your dark theme
    appearance: {
      theme: 'dark',
      accentColor: '#10b981', // emerald-500
      showWalletLoginFirst: false, // Show email/social first for non-crypto users
      walletChainType: 'solana-only', // Only show Solana wallets (works on devnet)
    },
    
    // Embedded wallet config for SOLANA - auto-create for all users
    embeddedWallets: {
      solana: {
        createOnLogin: 'all-users',
      },
    },
  };

  // Only configure RPC and externalWallets in browser (not during build/SSR)
  // This prevents build errors when RPC creation or connector access fails
  if (isBrowser) {
    try {
      config.solana = {
        rpcs: {
          'solana:devnet': {
            rpc: createSolanaRpc('https://api.devnet.solana.com'),
            rpcSubscriptions: createSolanaRpcSubscriptions('wss://api.devnet.solana.com'),
          },
          'solana:mainnet': {
            rpc: createSolanaRpc('https://api.devnet.solana.com'), // Point to devnet
            rpcSubscriptions: createSolanaRpcSubscriptions('wss://api.devnet.solana.com'), // Point to devnet
          },
        },
      };

      // Only add externalWallets when connectors are available (runtime/browser only)
      // This enables detection of Phantom, Solflare, Backpack, Jupiter, and other major Solana wallets
      if (solanaConnectors) {
        config.externalWallets = {
          solana: {
            connectors: solanaConnectors,
          },
        };
      }
    } catch (error) {
      // Silently fail during build - config will work without RPC/externalWallets
      console.warn('Failed to configure Solana RPC during build:', error);
    }
  }

  return (
    <PrivyAuthProvider appId={appId} config={config}>
      {children}
    </PrivyAuthProvider>
  );
}
