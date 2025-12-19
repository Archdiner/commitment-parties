'use client';

import { useState } from 'react';
import { X, Copy, ExternalLink, RefreshCw, Wallet } from 'lucide-react';
import { getCluster } from '@/lib/solana';

interface InsufficientBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string;
  currentBalance: number; // in lamports
  requiredBalance: number; // in lamports
  onCheckBalance: () => Promise<void>;
}

export function InsufficientBalanceModal({
  isOpen,
  onClose,
  walletAddress,
  currentBalance,
  requiredBalance,
  onCheckBalance,
}: InsufficientBalanceModalProps) {
  const [checking, setChecking] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const cluster = getCluster();
  const isDevnet = cluster === 'devnet';
  
  const currentSol = currentBalance / 1e9;
  const requiredSol = requiredBalance / 1e9;
  const neededSol = (requiredBalance - currentBalance) / 1e9;

  const faucetUrl = `https://faucet.solana.com?wallet=${walletAddress}`;
  // TODO: On mainnet, this would link to on-ramp providers (Moonpay, Stripe, etc.)
  // Example: const onRampUrl = `https://buy.moonpay.com/?apiKey=YOUR_KEY&walletAddress=${walletAddress}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCheckBalance = async () => {
    setChecking(true);
    try {
      await onCheckBalance();
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4 bg-[#0a0a0a] border border-white/20 rounded-2xl p-6">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-xl font-medium text-white">Insufficient Balance</h2>
            <p className="text-xs text-gray-400">
              {isDevnet ? 'Get test SOL from the faucet' : 'Add funds to your wallet'}
            </p>
          </div>
        </div>

        {/* Balance info */}
        <div className="space-y-3 mb-6">
          <div className="p-4 bg-white/5 rounded-lg border border-white/10">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs uppercase tracking-widest text-gray-500">Current Balance</span>
              <span className="font-mono text-sm text-white">{currentSol.toFixed(4)} SOL</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs uppercase tracking-widest text-gray-500">Required</span>
              <span className="font-mono text-sm text-emerald-400">{requiredSol.toFixed(4)} SOL</span>
            </div>
            <div className="border-t border-white/10 pt-2 mt-2">
              <div className="flex justify-between items-center">
                <span className="text-xs uppercase tracking-widest text-amber-400">You Need</span>
                <span className="font-mono text-sm font-medium text-amber-400">
                  {neededSol.toFixed(4)} SOL
                </span>
              </div>
            </div>
          </div>

          {/* Wallet address */}
          <div className="p-3 bg-white/5 rounded-lg border border-white/10">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">
                  Your Wallet Address
                </div>
                <div className="font-mono text-xs text-gray-300 truncate">{walletAddress}</div>
              </div>
              <button
                onClick={handleCopy}
                className="flex-shrink-0 px-3 py-2 border border-white/20 hover:border-white/40 rounded-lg transition-colors flex items-center gap-2"
                title="Copy address"
              >
                <Copy className="w-4 h-4" />
                <span className="text-xs">{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Instructions - Environment specific */}
        {isDevnet ? (
          <div className="mb-6 p-4 bg-teal-500/10 border border-teal-500/30 rounded-lg">
            <p className="text-xs text-teal-300 leading-relaxed">
              <strong>Step 1:</strong> Click the button below to open the Solana faucet (your address is already filled in)
              <br />
              <br />
              <strong>Step 2:</strong> Complete the CAPTCHA and request SOL
              <br />
              <br />
              <strong>Step 3:</strong> Come back here and click "Check Balance" to verify
            </p>
          </div>
        ) : (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
            <p className="text-xs text-emerald-300 leading-relaxed">
              <strong>On Mainnet:</strong> You'll need to add real SOL to your wallet.
              <br />
              <br />
              Click below to use an on-ramp service (credit card, bank transfer, etc.) to purchase SOL and send it directly to your wallet.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2">
          {isDevnet ? (
            <a
              href={faucetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/30 rounded-lg transition-colors font-medium"
            >
              <ExternalLink className="w-4 h-4" />
              Get Test SOL from Faucet
            </a>
          ) : (
            // TODO: Replace with actual on-ramp integration (Moonpay, Stripe, etc.)
            <div className="w-full px-4 py-3 bg-gray-500/20 border border-gray-500/50 text-gray-400 rounded-lg text-center text-sm">
              On-ramp integration coming soon
              {/* Example: <a href={onRampUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4" />
                Buy SOL with Moonpay
              </a> */}
            </div>
          )}

          <button
            onClick={handleCheckBalance}
            disabled={checking}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-white/20 hover:border-white/40 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
            {checking ? 'Checking Balance...' : 'Check Balance'}
          </button>
        </div>

        {/* Note - Environment specific */}
        {isDevnet && (
          <p className="mt-4 text-[10px] text-gray-500 text-center">
            Note: Devnet faucets have rate limits. If you've already requested today, wait 24 hours or use an alternative faucet.
          </p>
        )}
      </div>
    </div>
  );
}
