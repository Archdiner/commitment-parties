# Multi-Wallet Support Plan

## Overview

Currently, the frontend only supports Phantom wallet directly. This plan outlines how to extend support to multiple Solana wallets (Phantom, Solflare, Backpack, Glow, etc.) using a wallet-agnostic approach.

## Current State

### Frontend Wallet Integration
- **Location**: `app/frontend/lib/solana.ts` and `app/frontend/app/pools/[id]/page.tsx`
- **Current Implementation**: Direct Phantom wallet integration via `window.solana`
- **Limitation**: Only works with Phantom wallet installed

### Backend/Action Endpoints
- **Status**: ✅ Already wallet-agnostic
- **Action endpoints** return unsigned transactions that any wallet can sign
- **No changes needed** for backend to support multiple wallets

## Solution: Wallet Adapter Pattern

### Recommended Library: `@solana/wallet-adapter-react`

This is the industry-standard solution for multi-wallet support in Solana dApps. It provides:
- Unified API for multiple wallets
- React hooks for wallet state management
- Support for 20+ wallet types
- Automatic wallet detection
- Consistent transaction signing interface

## Implementation Plan

### Phase 1: Install Dependencies

```bash
cd app/frontend
npm install @solana/wallet-adapter-react @solana/wallet-adapter-react-ui @solana/wallet-adapter-base @solana/wallet-adapter-wallets
```

**Packages to install:**
- `@solana/wallet-adapter-react` - Core React hooks
- `@solana/wallet-adapter-react-ui` - Pre-built UI components (wallet selector button)
- `@solana/wallet-adapter-base` - Base wallet adapter interface
- `@solana/wallet-adapter-wallets` - Individual wallet adapters (Phantom, Solflare, etc.)

### Phase 2: Create Wallet Context Provider

**File**: `app/frontend/lib/wallet-context.tsx`

```typescript
'use client';

import { FC, ReactNode, useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  BackpackWalletAdapter,
  GlowWalletAdapter,
  // Add more as needed
} from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';

// Import wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';

interface WalletContextProviderProps {
  children: ReactNode;
}

export const WalletContextProvider: FC<WalletContextProviderProps> = ({ children }) => {
  // Determine network (devnet/mainnet)
  const network = (process.env.NEXT_PUBLIC_CLUSTER || 'devnet') as WalletAdapterNetwork;
  const endpoint = useMemo(() => {
    return process.env.NEXT_PUBLIC_SOLANA_RPC || clusterApiUrl(network);
  }, [network]);

  // Initialize wallet adapters
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new BackpackWalletAdapter(),
      new GlowWalletAdapter(),
      // Add more wallet adapters here
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
```

### Phase 3: Update App Layout

**File**: `app/frontend/app/layout.tsx`

Wrap the app with the wallet provider:

```typescript
import { WalletContextProvider } from '@/lib/wallet-context';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <WalletContextProvider>
          {children}
        </WalletContextProvider>
      </body>
    </html>
  );
}
```

### Phase 4: Refactor Wallet Connection Logic

**File**: `app/frontend/lib/wallet-adapter.ts` (new)

Create a unified wallet adapter wrapper:

```typescript
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction } from '@solana/web3.js';

/**
 * Unified wallet adapter hook
 * Replaces direct Phantom wallet access
 */
export function useWalletAdapter() {
  const { publicKey, wallet, signTransaction, sendTransaction, connected, connecting, disconnect, connect } = useWallet();
  const { connection } = useConnection();

  return {
    publicKey,
    walletAddress: publicKey?.toBase58() || null,
    wallet,
    connected,
    connecting,
    connect,
    disconnect,
    signTransaction,
    sendTransaction,
    connection,
  };
}
```

### Phase 5: Update Pool Join Logic

**File**: `app/frontend/app/pools/[id]/page.tsx`

Replace Phantom-specific code:

**Before:**
```typescript
const { solana } = window as any;
if (!solana || !solana.isPhantom) {
  throw new Error('Phantom wallet not found');
}
const signature = await signAndSendTransaction(connection, instruction, solana);
```

**After:**
```typescript
import { useWalletAdapter } from '@/lib/wallet-adapter';

const { sendTransaction, connection: walletConnection } = useWalletAdapter();

// Build transaction
const transaction = new Transaction().add(instruction);
const { blockhash } = await walletConnection.getLatestBlockhash('confirmed');
transaction.recentBlockhash = blockhash;
transaction.feePayer = publicKey;

// Send via wallet adapter (works with any wallet)
const signature = await sendTransaction(transaction, walletConnection);
```

### Phase 6: Add Wallet Selector UI

**File**: `app/frontend/components/WalletButton.tsx` (new)

```typescript
'use client';

import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useWalletAdapter } from '@/lib/wallet-adapter';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export function WalletButton() {
  const { connected, walletAddress } = useWalletAdapter();
  const { setVisible } = useWalletModal();

  if (connected) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">
          {walletAddress?.slice(0, 4)}...{walletAddress?.slice(-4)}
        </span>
        <WalletMultiButton />
      </div>
    );
  }

  return <WalletMultiButton />;
}
```

### Phase 7: Update All Wallet-Dependent Pages

Pages that need updates:
1. **`app/frontend/app/pools/[id]/page.tsx`** - Pool join logic
2. **`app/frontend/app/create/page.tsx`** - Pool creation
3. **`app/frontend/app/dashboard/page.tsx`** - User dashboard
4. **Any other pages using `window.solana`**

**Pattern to follow:**
- Replace `window.solana` checks with `useWalletAdapter()` hook
- Use `sendTransaction` from wallet adapter instead of wallet-specific methods
- Remove Phantom-specific error messages

### Phase 8: Update Environment Variables

**File**: `.env.local` or deployment config

Ensure these are set:
```env
NEXT_PUBLIC_SOLANA_RPC=https://api.devnet.solana.com
NEXT_PUBLIC_CLUSTER=devnet
NEXT_PUBLIC_PROGRAM_ID=GSvoKxVHbtAY2mAAU4RM3PVQC3buLSjRm24N7QhAoieH
```

## Supported Wallets (Out of the Box)

The wallet adapter library supports:
- ✅ **Phantom** - Most popular
- ✅ **Solflare** - Second most popular
- ✅ **Backpack** - Growing in popularity
- ✅ **Glow** - Mobile-first
- ✅ **Sollet** - Browser extension
- ✅ **Ledger** - Hardware wallet
- ✅ **MathWallet** - Multi-chain wallet
- ✅ **Coin98** - Asian market
- ✅ **Slope** - Mobile wallet
- ✅ **Torus** - Social login wallet
- ✅ And 10+ more...

## Migration Checklist

- [ ] Install wallet adapter packages
- [ ] Create `WalletContextProvider` component
- [ ] Wrap app with provider in `layout.tsx`
- [ ] Create `useWalletAdapter` hook
- [ ] Update `lib/solana.ts` to use wallet adapter
- [ ] Replace all `window.solana` references
- [ ] Update pool join logic
- [ ] Update pool creation logic
- [ ] Add wallet selector button to navigation
- [ ] Test with Phantom wallet
- [ ] Test with Solflare wallet
- [ ] Test with Backpack wallet
- [ ] Update error messages to be wallet-agnostic
- [ ] Remove old Phantom-specific code
- [ ] Update documentation

## Backward Compatibility

- **Action endpoints**: No changes needed (already wallet-agnostic)
- **Backend API**: No changes needed
- **Database**: No changes needed
- **Agent**: No changes needed

## Testing Strategy

1. **Unit Tests**: Test wallet adapter hook in isolation
2. **Integration Tests**: Test transaction signing with mock wallets
3. **Manual Testing**: Test with real wallets (Phantom, Solflare, Backpack)
4. **E2E Tests**: Test full flow (connect → join pool → verify)

## Benefits

1. **User Choice**: Users can use their preferred wallet
2. **Better UX**: Unified wallet connection experience
3. **Future-Proof**: Easy to add new wallets
4. **Industry Standard**: Uses the same pattern as major Solana dApps
5. **Mobile Support**: Some adapters support mobile wallets
6. **Hardware Wallet Support**: Built-in Ledger support

## Potential Issues & Solutions

### Issue 1: Wallet Not Detected
**Solution**: Wallet adapter handles this gracefully, shows "Install Wallet" button

### Issue 2: Transaction Rejected
**Solution**: Wallet adapter provides error callbacks, handle gracefully

### Issue 3: Network Mismatch
**Solution**: Wallet adapter automatically handles network switching

### Issue 4: Legacy Code References
**Solution**: Use grep to find all `window.solana` references and replace

## Timeline Estimate

- **Phase 1-2**: 1-2 hours (setup and provider)
- **Phase 3-4**: 2-3 hours (refactor hooks)
- **Phase 5-6**: 3-4 hours (update pages and UI)
- **Phase 7**: 2-3 hours (update remaining pages)
- **Phase 8**: 1 hour (testing and cleanup)

**Total**: ~10-13 hours of development time

## Next Steps

1. Review this plan
2. Install dependencies
3. Start with Phase 1-2 (provider setup)
4. Gradually migrate pages (one at a time)
5. Test thoroughly with multiple wallets
6. Deploy and monitor

---

**Note**: The backend Action endpoints are already wallet-agnostic and will work with any wallet that can sign Solana transactions. This plan focuses on frontend changes only.


