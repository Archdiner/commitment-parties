'use client';

import { PrivyProvider as PrivyAuthProvider } from '@privy-io/react-auth';
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
          // This creates Solana embedded wallets
          solana: {
            createOnLogin: 'all-users',
          },
        },
      }}
    >
      {children}
    </PrivyAuthProvider>
  );
}
