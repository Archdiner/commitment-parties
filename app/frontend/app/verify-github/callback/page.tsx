'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getGitHubUsername } from '@/lib/api';
import { getPersistedWalletAddress, persistGitHubUsername } from '@/lib/wallet';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

// Force dynamic rendering - this page depends on search params
export const dynamic = 'force-dynamic';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [githubUsername, setGithubUsername] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');

      if (error) {
        setStatus('error');
        setMessage('GitHub authorization was cancelled or failed.');
        return;
      }

      if (!code || !state) {
        setStatus('error');
        setMessage('Missing OAuth parameters.');
        return;
      }

      try {
        // Call backend callback endpoint
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const response = await fetch(
          `${apiUrl}/api/users/github/oauth/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ detail: response.statusText }));
          throw new Error(errorData.detail || 'Verification failed');
        }

        const data = await response.json();

        if (data.verified) {
          setStatus('success');
          setMessage(data.message);
          setGithubUsername(data.github_username || null);

          // Refresh verification status and persist GitHub username
          const wallet = getPersistedWalletAddress();
          if (wallet) {
            const check = await getGitHubUsername(wallet);
            const username = check.verified_github_username;
            setGithubUsername(username);
            if (username) {
              persistGitHubUsername(username);
              // Trigger storage event so Navbar can update
              window.dispatchEvent(new Event('storage'));
            }
          }

          // Redirect to dashboard after 2 seconds
          setTimeout(() => {
            router.push('/verify-github');
          }, 2000);
        } else {
          setStatus('error');
          setMessage(data.message || 'Verification failed');
        }
      } catch (err: any) {
        setStatus('error');
        setMessage(err.message || 'Failed to verify GitHub account');
      }
    };

    handleCallback();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-lg max-w-md w-full">
        {status === 'loading' && (
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-emerald-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Verifying GitHub Account...</h2>
            <p className="text-sm text-slate-600">Please wait while we verify your GitHub account.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center">
            <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-emerald-900 mb-2">GitHub Account Connected!</h2>
            {githubUsername && (
              <p className="text-sm text-emerald-700 mb-4">
                Your account <strong>@{githubUsername}</strong> has been verified.
              </p>
            )}
            <p className="text-sm text-slate-600 mb-6">{message}</p>
            <p className="text-xs text-slate-500">Redirecting...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center">
            <XCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-red-900 mb-2">Verification Failed</h2>
            <p className="text-sm text-red-700 mb-6">{message}</p>
            <Link
              href="/verify-github"
              className="inline-block bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
            >
              Try Again
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function GitHubOAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-lg max-w-md w-full">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin text-emerald-600 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-slate-900 mb-2">Loading...</h2>
              <p className="text-sm text-slate-600">Please wait...</p>
            </div>
          </div>
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}

