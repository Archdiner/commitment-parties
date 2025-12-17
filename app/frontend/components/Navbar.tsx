'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Plus, Github, Wallet, LogOut, Loader2, User, Link2 } from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets } from '@privy-io/react-auth/solana';

export const Navbar = () => {
  const pathname = usePathname();
  const { 
    isAuthenticated, 
    isReady, 
    walletAddress, 
    walletType,
    user,
    login, 
    logout,
    connectWallet
  } = useWallet();
  
  const isLoading = !isReady;

  const { linkGithub, user: privyUser } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();
  
  // Check if user has external wallets connected (not embedded)
  // Only check when wallets are ready to avoid false positives during loading
  const hasExternalWallet = walletsReady && wallets?.some((w: any) => w.walletClientType && w.walletClientType !== 'privy') || false;
  const hasEmbeddedWallet = walletsReady && wallets?.some((w: any) => w.walletClientType === 'privy') || false;
  
  // Show connect wallet button if user has embedded wallet but no external wallet
  // Also check walletType as a fallback to ensure we're showing the button at the right time
  const showConnectWalletButton = isAuthenticated && isReady && hasEmbeddedWallet && !hasExternalWallet && (walletType === 'embedded' || (!walletType && hasEmbeddedWallet));
  
  // Check if GitHub is linked via Privy
  const githubAccount = privyUser?.linkedAccounts?.find(
    (account: any) => account.type === 'github_oauth'
  );
  const isGitHubConnected = !!githubAccount;
  const githubUsername = (githubAccount as any)?.username;

  const handleConnectGitHub = async () => {
    if (!isAuthenticated) {
      login();
      return;
    }

    if (isGitHubConnected) {
      // Already connected, could add unlink option here
      return;
    }

    try {
      await linkGithub();
    } catch (error: any) {
      console.error('Failed to link GitHub:', error);
      
      // Check for specific error messages
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      
      if (errorMessage.includes('not allowed') || errorMessage.includes('not enabled')) {
        alert(
          'GitHub login is not enabled in your Privy dashboard.\n\n' +
          'To enable it:\n' +
          '1. Go to https://dashboard.privy.io/\n' +
          '2. Select your app\n' +
          '3. Go to "Auth" → "Login Methods"\n' +
          '4. Enable "GitHub"\n' +
          '5. Configure your GitHub OAuth app credentials\n\n' +
          'You\'ll need to create a GitHub OAuth app at https://github.com/settings/developers'
        );
      } else {
        alert(`Failed to connect GitHub: ${errorMessage}`);
      }
    }
  };

  const handleConnectWallet = async () => {
    if (!isAuthenticated) {
      login();
      return;
    }

    try {
      await connectWallet();
    } catch (error: any) {
      console.error('Failed to connect wallet:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      alert(`Failed to connect wallet: ${errorMessage}`);
    }
  };

  const navLinks = [
    { name: 'Home', href: '/' },
    { name: 'Challenges', href: '/pools' },
    { name: 'Dashboard', href: '/dashboard' },
  ];

  const formatAddress = (addr: string) => 
    `${addr.slice(0, 4)}...${addr.slice(-4)}`;

  // Get display name for user
  const getDisplayName = () => {
    if (user?.username) return `@${user.username}`;
    if (user?.name) return user.name.split(' ')[0]; // First name only
    if (user?.email) return user.email.split('@')[0]; // Part before @
    if (walletAddress) return formatAddress(walletAddress);
    return 'Account';
  };

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

        <div className="flex items-center gap-3">
          {/* Create Challenge - only show when authenticated */}
          {isAuthenticated && (
          <Link href="/create" className="hidden md:flex items-center gap-2 text-sm uppercase tracking-widest text-emerald-500 hover:text-white transition-colors">
              <Plus className="w-4 h-4" /> Create
          </Link>
          )}
          
          {/* Connect External Wallet - show when user has embedded wallet but no external wallet */}
          {showConnectWalletButton && (
            <button 
              onClick={handleConnectWallet}
              className="text-sm border border-emerald-500/50 bg-emerald-500/10 px-3 py-2 uppercase tracking-wide text-emerald-400 hover:bg-emerald-500 hover:text-black transition-all flex items-center gap-2"
              title="Connect your existing Solana wallet (Phantom, Solflare, etc.)"
            >
              <Link2 className="w-4 h-4" />
              <span className="hidden sm:inline">Connect Wallet</span>
            </button>
          )}
          
          {/* GitHub Connection - only show when authenticated */}
          {isAuthenticated && (
          <button 
            onClick={handleConnectGitHub}
              className={`text-sm border px-3 py-2 uppercase tracking-wide transition-all flex items-center gap-2 ${
              isGitHubConnected 
                ? 'border-emerald-500/50 text-emerald-400 bg-emerald-500/5' 
                  : 'border-white/20 text-white hover:bg-white hover:text-black'
            }`}
          >
            <Github className="w-4 h-4" />
              <span className="hidden sm:inline">
                {isGitHubConnected ? `@${githubUsername}` : "GitHub"}
              </span>
            </button>
          )}
          
          {/* Auth Button */}
          {isLoading ? (
            <button 
              disabled
              className="font-mono text-sm border border-white/20 px-4 py-2 uppercase tracking-wide flex items-center gap-2"
            >
              <Loader2 className="w-4 h-4 animate-spin" />
            </button>
          ) : isAuthenticated ? (
            <div className="flex items-center gap-2">
              {/* User/Wallet Info */}
              <div className={`text-sm border px-3 py-2 flex items-center gap-2 ${
                walletAddress
                  ? walletType === 'embedded' 
                    ? 'border-purple-500/50 text-purple-400 bg-purple-500/5' 
                    : 'border-emerald-500/50 text-emerald-400 bg-emerald-500/5'
                  : 'border-blue-500/50 text-blue-400 bg-blue-500/5'
              }`}>
                {walletAddress ? (
                  walletType === 'embedded' ? <User className="w-4 h-4" /> : <Wallet className="w-4 h-4" />
                ) : (
                  <User className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">
                  {walletAddress ? (
                    <span className="font-mono">{formatAddress(walletAddress)}</span>
                  ) : (
                    <span>{getDisplayName()}</span>
                  )}
                </span>
                {walletAddress && walletType === 'embedded' && (
                  <span className="hidden lg:inline text-[10px] text-purple-300/70">(auto)</span>
                )}
              </div>
              
              {/* Logout Button */}
              <button
                onClick={logout}
                className="text-sm border border-white/20 px-2.5 py-2 hover:bg-white hover:text-black transition-all"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
          </button>
            </div>
          ) : (
          <button 
              onClick={login}
              className="font-mono text-sm border border-emerald-500/50 bg-emerald-500/10 px-4 py-2 uppercase tracking-wide text-emerald-400 hover:bg-emerald-500 hover:text-black transition-all flex items-center gap-2"
            >
              Sign In
          </button>
          )}
        </div>
      </div>
    </nav>
  );
};
