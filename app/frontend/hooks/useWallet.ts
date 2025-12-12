'use client';

// Re-export from the new Solana wallet hook that properly handles embedded wallets
export { useSolanaWallet as useWallet } from './useSolanaWallet';
export type { SolanaWalletState as WalletState } from './useSolanaWallet';
