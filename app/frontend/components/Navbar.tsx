'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Plus, Github } from 'lucide-react';
import { getPersistedWalletAddress, persistWalletAddress, clearPersistedWalletAddress, getPersistedGitHubUsername, persistGitHubUsername } from '@/lib/wallet';
import { getGitHubUsername, initiateGitHubOAuth } from '@/lib/api';

export const Navbar = () => {
  const pathname = usePathname();
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [isGitHubConnected, setIsGitHubConnected] = useState(false);
  const [githubUsername, setGithubUsername] = useState<string | null>(null);
  const [connectingGitHub, setConnectingGitHub] = useState(false);

  const checkGitHubConnection = async (wallet: string) => {
    try {
      const result = await getGitHubUsername(wallet);
      if (result.verified_github_username) {
        setIsGitHubConnected(true);
        setGithubUsername(result.verified_github_username);
        persistGitHubUsername(result.verified_github_username);
      }
    } catch (err) {
      console.error('Error checking GitHub connection:', err);
    }
  };

  useEffect(() => {
    const saved = getPersistedWalletAddress();
    if (saved) {
      setIsConnected(true);
      setWalletAddress(saved);
      // Check GitHub connection status
      checkGitHubConnection(saved);
    }
    
    // Also check if GitHub username is in localStorage
    const savedGithub = getPersistedGitHubUsername();
    if (savedGithub) {
      setIsGitHubConnected(true);
      setGithubUsername(savedGithub);
    }

    // Listen for storage changes (e.g., GitHub connection in another tab)
    const handleStorage = () => {
      const updatedWallet = getPersistedWalletAddress();
      if (updatedWallet && updatedWallet !== walletAddress) {
        setWalletAddress(updatedWallet);
        setIsConnected(true);
        checkGitHubConnection(updatedWallet);
      }
      
      const updatedGithub = getPersistedGitHubUsername();
      if (updatedGithub && updatedGithub !== githubUsername) {
        setIsGitHubConnected(true);
        setGithubUsername(updatedGithub);
      } else if (!updatedGithub && isGitHubConnected) {
        setIsGitHubConnected(false);
        setGithubUsername(null);
      }
    };
    
    window.addEventListener('storage', handleStorage);
    
    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, [walletAddress, githubUsername, isGitHubConnected]);

  const handleConnect = async () => {
    if (isConnected) {
      setIsConnected(false);
      setWalletAddress('');
      clearPersistedWalletAddress();
      return;
    }

    try {
      const { solana } = window as typeof window & {
        solana?: {
          connect: () => Promise<{ publicKey: { toString: () => string } }>;
        };
      };
      if (!solana) {
        alert("Please install Phantom Wallet.");
        return;
      }
      const response = await solana.connect();
      const pubKey = response.publicKey.toString();
      setWalletAddress(pubKey);
      setIsConnected(true);
      persistWalletAddress(pubKey);
      // Check GitHub connection after wallet connection
      checkGitHubConnection(pubKey);
    } catch (err) {
      console.error(err);
    }
  };

  const handleConnectGitHub = async () => {
    if (!walletAddress) {
      alert("Please connect your wallet first.");
      return;
    }

    if (isGitHubConnected) {
      // Disconnect GitHub (just clear local state, backend keeps the verification)
      setIsGitHubConnected(false);
      setGithubUsername(null);
      return;
    }

    setConnectingGitHub(true);
    try {
      const result = await initiateGitHubOAuth(walletAddress);
      // Redirect to GitHub OAuth
      window.location.href = result.auth_url;
    } catch (err: any) {
      console.error('Error initiating GitHub OAuth:', err);
      alert(`Failed to connect GitHub: ${err.message || 'Unknown error'}`);
      setConnectingGitHub(false);
    }
  };

  const navLinks = [
    { name: 'Home', href: '/' },
    { name: 'Challenges', href: '/pools' },
    { name: 'Dashboard', href: '/dashboard' },
  ];

  return (
    <nav className="fixed top-0 w-full z-50 bg-[#050505]/90 backdrop-blur-md border-b border-white/5">
      <div className="flex justify-between items-center px-6 h-16 max-w-[1400px] mx-auto">
        <Link href="/" className="cursor-pointer flex items-center gap-3 group">
          <div className="w-3 h-3 bg-emerald-500 transform rotate-45 group-hover:rotate-90 transition-transform duration-500" />
          <div className="flex flex-col">
            <span className="font-medium tracking-[0.1em] text-base text-white">COMMITMINT</span>
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
            onClick={handleConnectGitHub}
            disabled={connectingGitHub || !isConnected}
            className={`text-sm border px-4 py-2 uppercase tracking-wide transition-all flex items-center gap-2 ${
              isGitHubConnected 
                ? 'border-emerald-500/50 text-emerald-400 bg-emerald-500/5' 
                : 'border-white/20 text-white hover:bg-white hover:text-black disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            <Github className="w-4 h-4" />
            {connectingGitHub ? 'Connecting...' : isGitHubConnected ? `@${githubUsername}` : "Connect GitHub"}
          </button>
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
