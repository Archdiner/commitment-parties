'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getGitHubUsername, initiateGitHubOAuth } from '@/lib/api';
import { getPersistedWalletAddress } from '@/lib/wallet';
import {
  Github,
  CheckCircle,
  Loader2,
  AlertCircle,
  ArrowLeft,
  ExternalLink,
} from 'lucide-react';

export default function VerifyGitHubPage() {
  const router = useRouter();
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [currentVerified, setCurrentVerified] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    const saved = getPersistedWalletAddress();
    if (saved) {
      setWalletAddress(saved);
      checkCurrentVerification(saved);
    } else {
      setLoading(false);
    }
  }, []);

  const checkCurrentVerification = async (wallet: string) => {
    try {
      const result = await getGitHubUsername(wallet);
      setCurrentVerified(result.verified_github_username);
    } catch (err) {
      console.error('Error checking verification:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectGitHub = async () => {
    if (!walletAddress) {
      alert('Please connect your wallet first');
      return;
    }

    setConnecting(true);
    try {
      const result = await initiateGitHubOAuth(walletAddress);
      // Redirect to GitHub OAuth
      window.location.href = result.auth_url;
    } catch (err: any) {
      console.error('Error initiating OAuth:', err);
      alert(`Failed to connect GitHub: ${err.message || 'Unknown error'}`);
      setConnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-slate-600 hover:text-emerald-600 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-lg">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-emerald-100 p-3 rounded-xl">
              <Github className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Verify GitHub Account</h1>
              <p className="text-sm text-slate-600">Link your GitHub account to participate in commit challenges</p>
            </div>
          </div>

          {currentVerified ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 mb-6">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <span className="font-semibold text-emerald-900">GitHub Account Connected</span>
              </div>
              <p className="text-sm text-emerald-700">
                Your GitHub account <strong>@{currentVerified}</strong> is verified and linked to your wallet.
              </p>
              <p className="text-xs text-emerald-600 mt-2">
                You can now join GitHub commit challenges!
              </p>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-6">
              <div className="flex items-center gap-3 mb-2">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <span className="font-semibold text-amber-900">GitHub Connection Required</span>
              </div>
              <p className="text-sm text-amber-700">
                Connect your GitHub account to participate in GitHub commit challenges.
              </p>
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Wallet Address
              </label>
              <input
                type="text"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="Your Solana wallet address"
                disabled={!!currentVerified}
              />
            </div>

            {!currentVerified && (
              <div>
                <button
                  onClick={handleConnectGitHub}
                  disabled={!walletAddress || connecting}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white py-4 px-6 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg hover:shadow-xl"
                >
                  {connecting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Github className="w-5 h-5" />
                      Connect GitHub Account
                    </>
                  )}
                </button>
                <p className="text-xs text-slate-500 mt-3 text-center">
                  You'll be redirected to GitHub to authorize the connection. 
                  We only request read access to verify your account.
                </p>
              </div>
            )}

            {currentVerified && (
              <div className="text-center">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-3 px-6 rounded-lg font-medium transition-colors"
                >
                  Go to Dashboard
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

