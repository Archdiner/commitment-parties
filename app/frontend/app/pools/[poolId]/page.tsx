'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Users, Clock, ShieldCheck } from 'lucide-react';
import {
  getPool,
  PoolResponse,
  confirmPoolJoin,
} from '@/lib/api';
import { getPersistedWalletAddress } from '@/lib/wallet';
import { getConnection } from '@/lib/solana';
import { Transaction } from '@solana/web3.js';

// Helper for calling Solana Actions join-pool endpoint
async function buildJoinPoolTransaction(
  poolId: number,
  wallet: string
): Promise<{ transaction: string; message: string }> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const response = await fetch(`${apiUrl}/solana/actions/join-pool`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      account: wallet,
      pool_id: poolId,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(errorData.detail || 'Failed to build join transaction');
  }

  return response.json();
}

export default function PoolDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [pool, setPool] = useState<PoolResponse | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  const poolIdParam = params?.poolId;
  const poolId = typeof poolIdParam === 'string' ? parseInt(poolIdParam, 10) : NaN;

  useEffect(() => {
    const address = getPersistedWalletAddress();
    setWalletAddress(address);

    if (!isNaN(poolId)) {
      (async () => {
        try {
          const p = await getPool(poolId);
          setPool(p);
        } catch (err) {
          console.error('Failed to load pool:', err);
        } finally {
          setLoading(false);
        }
      })();
    } else {
      setLoading(false);
    }
  }, [poolId]);

  const handleJoin = async () => {
    if (!pool || isNaN(poolId)) return;

    const currentWallet = getPersistedWalletAddress();
    if (!currentWallet) {
      alert('Please connect your wallet first (top right).');
      return;
    }

    setJoining(true);
    try {
      // Build transaction via Solana Actions backend
      const { transaction: txB64 } = await buildJoinPoolTransaction(poolId, currentWallet);

      const connection = getConnection();

      // Phantom provider
      if (typeof window === 'undefined') {
        throw new Error('Window is not available.');
      }
      const anyWindow = window as any;
      const provider =
        (anyWindow.phantom && anyWindow.phantom.solana) ||
        anyWindow.solana ||
        null;

      if (!provider) {
        alert('Please install Phantom Wallet to join this pool.');
        setJoining(false);
        return;
      }

      if (!provider.publicKey) {
        await provider.connect();
      }

      const providerWallet = provider.publicKey?.toBase58?.();
      if (providerWallet && providerWallet !== currentWallet) {
        alert('Connected Phantom wallet does not match the selected wallet. Please reconnect.');
        setJoining(false);
        return;
      }

      const tx = Transaction.from(Buffer.from(txB64, 'base64'));

      // Use provider's sendTransaction if available, otherwise sign+send manually
      let signature: string;
      if (typeof provider.sendTransaction === 'function') {
        signature = await provider.sendTransaction(tx, connection, {
          skipPreflight: false,
          maxRetries: 3,
          preflightCommitment: 'confirmed',
        });
      } else if (typeof provider.signTransaction === 'function') {
        const signed = await provider.signTransaction(tx);
        signature = await connection.sendRawTransaction(signed.serialize(), {
          skipPreflight: false,
          maxRetries: 3,
        });
      } else {
        throw new Error('Connected wallet does not support sending transactions.');
      }

      await connection.confirmTransaction(signature, 'confirmed');

      // Confirm join with backend (updates participant count, DB)
      await confirmPoolJoin(poolId, {
        transaction_signature: signature,
        participant_wallet: currentWallet,
      });

      router.push('/dashboard');
    } catch (err: any) {
      console.error('Failed to join pool:', err);
      alert(err.message || 'Failed to join pool. Please try again.');
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] text-white pt-32 px-6 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!pool || isNaN(poolId)) {
    return (
      <div className="min-h-screen bg-[#050505] text-white pt-32 px-6 flex flex-col items-center justify-center text-center">
        <p className="text-sm text-gray-500 mb-4">Pool not found.</p>
        <Link href="/pools" className="text-emerald-500 text-xs uppercase tracking-widest">
          Back to Pools
        </Link>
      </div>
    );
  }

  const spotsRemaining = pool.max_participants - pool.participant_count;

  return (
    <div className="min-h-screen bg-[#050505] text-white pt-24 px-6 pb-20">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Link
            href="/pools"
            className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-gray-500 hover:text-white"
          >
            <ArrowLeft className="w-3 h-3" />
            All Pools
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Main info */}
          <div className="md:col-span-2 space-y-6">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">
                Commitment Pool #{pool.pool_id}
              </p>
              <h1 className="text-3xl md:text-4xl font-light mb-3">{pool.name}</h1>
              <p className="text-sm text-gray-400 leading-relaxed">
                {pool.description || 'No description provided.'}
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 pt-4 border-t border-white/10">
              <div>
                <div className="text-[9px] uppercase tracking-widest text-gray-500 mb-1">Stake</div>
                <div className="font-mono text-sm">{pool.stake_amount} SOL</div>
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-widest text-gray-500 mb-1">Duration</div>
                <div className="font-mono text-sm">{pool.duration_days} days</div>
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-widest text-gray-500 mb-1">Participants</div>
                <div className="font-mono text-sm">
                  {pool.participant_count}/{pool.max_participants}
                </div>
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-widest text-gray-500 mb-1">Status</div>
                <div className="font-mono text-sm uppercase">{pool.status}</div>
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-widest text-gray-500 mb-1">Visibility</div>
                <div className="font-mono text-sm uppercase">
                  {pool.is_public ? 'Public' : 'Private'}
                </div>
              </div>
            </div>

            <div className="mt-8 p-4 border border-white/10 bg-white/[0.02] rounded-xl flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-500 mt-0.5" />
              <div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  When you join, your SOL is locked in the on-chain commitment pool. AI agents
                  monitor verification proofs, and winners split the pool when the challenge ends.
                </p>
              </div>
            </div>
          </div>

          {/* Join card */}
          <div className="space-y-4">
            <div className="border border-white/10 rounded-2xl p-6 bg-white/[0.01]">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] uppercase tracking-widest text-gray-500">
                  Join Challenge
                </span>
                <Clock className="w-4 h-4 text-gray-500" />
              </div>

              <div className="mb-4">
                <div className="text-xs text-gray-400 mb-1">Your Stake</div>
                <div className="text-xl font-light">{pool.stake_amount} SOL</div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-gray-500 mb-4">
                <div className="flex items-center gap-2">
                  <Users className="w-3 h-3" />
                  <span>
                    {spotsRemaining > 0 ? `${spotsRemaining} spots left` : 'Pool is full'}
                  </span>
                </div>
              </div>

              <button
                onClick={handleJoin}
                disabled={joining || spotsRemaining <= 0 || pool.status !== 'pending' && pool.status !== 'active'}
                className="w-full h-11 border border-emerald-500 text-xs uppercase tracking-widest font-medium rounded-full flex items-center justify-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {joining ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Joining...
                  </>
                ) : (
                  <>Join Pool</>
                )}
              </button>

              {!walletAddress && (
                <p className="mt-3 text-[10px] text-amber-500">
                  Connect your wallet first using the button in the top-right.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


