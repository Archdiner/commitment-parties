'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Plus } from 'lucide-react';
import { getPersistedWalletAddress, persistWalletAddress, clearPersistedWalletAddress } from '@/lib/wallet';

export const Navbar = () => {
  const pathname = usePathname();
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');

  // Helper to get a Solana provider (Phantom or compatible)
  const getProvider = (): any | null => {
    if (typeof window === 'undefined') return null;
    const anyWindow = window as any;

    if (anyWindow?.phantom?.solana) {
      return anyWindow.phantom.solana;
    }
    if (anyWindow?.solana) {
      return anyWindow.solana;
    }
    return null;
  };

  useEffect(() => {
    // 1) Hydrate from localStorage (our own persisted value)
    const saved = getPersistedWalletAddress();
    if (saved) {
      setIsConnected(true);
      setWalletAddress(saved);
    }

    // 2) Try to auto-connect with provider if it's already trusted
    const provider = getProvider();
    if (provider) {
      try {
        // Phantom convention: onlyIfTrusted=true will not trigger a popup
        provider
          .connect({ onlyIfTrusted: true })
          .then((resp: any) => {
            const pk =
              resp?.publicKey?.toString?.() ??
              provider.publicKey?.toString?.();
            if (pk) {
              setIsConnected(true);
              setWalletAddress(pk);
              persistWalletAddress(pk);
            }
          })
          .catch(() => {
            // ignore if not yet trusted
          });

        // Listen for future connects (e.g. user approves later)
        provider.on?.('connect', (pubkey: any) => {
          const pk =
            pubkey?.toString?.() ??
            provider.publicKey?.toString?.();
          if (pk) {
            setIsConnected(true);
            setWalletAddress(pk);
            persistWalletAddress(pk);
          }
        });

        // Listen for disconnects
        provider.on?.('disconnect', () => {
          setIsConnected(false);
          setWalletAddress('');
          clearPersistedWalletAddress();
        });
      } catch (e) {
        console.warn('Auto-connect to wallet failed:', e);
      }
    }
  }, []);

  const handleConnect = async () => {
    if (isConnected) {
      setIsConnected(false);
      setWalletAddress('');
      clearPersistedWalletAddress();
      return;
    }

    try {
      const provider = getProvider();

      if (!provider) {
        alert("Please install Phantom Wallet to connect.\n\nPhantom is a free wallet app (like a digital bank account).\nYou can install it from phantom.app - it takes just 2 minutes!");
        return;
      }

      const response = await provider.connect();
      const pubKey =
        response?.publicKey?.toString?.() ??
        provider.publicKey?.toString?.();
      if (!pubKey) {
        throw new Error("Failed to read wallet public key from Phantom.");
      }

      setWalletAddress(pubKey);
      setIsConnected(true);
      persistWalletAddress(pubKey);
    } catch (err) {
      console.error("Failed to connect wallet:", err);
      alert("Failed to connect wallet. Please check Phantom and try again.");
    }
  };

  const navLinks = [
    { name: 'Home', href: '/' },
    { name: 'Challenges', href: '/pools' },
    { name: 'Leaderboard', href: '/leaderboard' },
    { name: 'Dashboard', href: '/dashboard' },
  ];

  return (
    <nav className="fixed top-0 w-full z-50 bg-[#050505]/90 backdrop-blur-md border-b border-white/5">
      <div className="flex justify-between items-center px-6 h-16 max-w-[1400px] mx-auto">
        <Link href="/" className="cursor-pointer flex items-center gap-3 group">
          <div className="w-3 h-3 bg-emerald-500 transform rotate-45 group-hover:rotate-90 transition-transform duration-500" />
          <div className="flex flex-col">
            <span className="font-medium tracking-[0.1em] text-base text-white">COMMITMENT_AGENT</span>
            <span className="text-xs text-gray-500 tracking-wider">AI ACCOUNTABILITY</span>
          </div>
        </Link>

        <div className="hidden md:flex items-center gap-8">
           {navLinks.map((link) => (
               <Link 
                  key={link.name}
                  href={link.href}
                  className={`text-sm uppercase tracking-widest transition-all hover:text-emerald-400 ${
                    pathname === link.href ? 'text-white' : 'text-gray-500'
                  }`}
               >
                  {link.name}
               </Link>
           ))}
        </div>

        <div className="flex items-center gap-4">
          <Link href="/create" className="hidden md:flex items-center gap-2 text-sm uppercase tracking-widest text-emerald-500 hover:text-white transition-colors">
            <Plus className="w-4 h-4" /> Create Challenge
          </Link>
          <button 
            onClick={handleConnect}
            className={`font-mono text-sm border px-4 py-2 uppercase tracking-wide transition-all ${
              isConnected 
                ? 'border-emerald-500/50 text-emerald-400 bg-emerald-500/5' 
                : 'border-white/20 text-white hover:bg-white hover:text-black'
            }`}
          >
            {isConnected ? `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}` : "Connect Wallet"}
          </button>
        </div>
      </div>
    </nav>
  );
};

