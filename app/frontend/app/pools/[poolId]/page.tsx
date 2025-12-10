'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Users, Clock, ShieldCheck } from 'lucide-react';
import { InfoIcon } from '@/components/ui/Tooltip';
import {
  getPool,
  PoolResponse,
  confirmPoolJoin,
} from '@/lib/api';
import { getPersistedWalletAddress } from '@/lib/wallet';
import { getConnection, getTokenBalance } from '@/lib/solana';
import { Transaction } from '@solana/web3.js';
import { getTokenByMint } from '@/lib/tokens';

// Force dynamic rendering - this page depends on route params
export const dynamic = 'force-dynamic';

// Helper for calling Solana Actions join-pool endpoint
async function buildJoinPoolTransaction(
  poolId: number,
  wallet: string
): Promise<{ transaction: string; message: string }> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  // Backend expects pool_id as query parameter, not in body
  const response = await fetch(`${apiUrl}/solana/actions/join-pool?pool_id=${poolId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      account: wallet,
    }),
  });

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      errorData = { detail: response.statusText || 'Failed to build join transaction' };
    }
    const errorMessage = errorData.detail || errorData.error || errorData.message || 'Failed to build join transaction';
    throw new Error(errorMessage);
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
      // Pre-check: For HODL challenges, verify wallet has required token balance BEFORE building transaction
      if (pool.goal_type === 'hodl_token') {
        const goalMetadata = (pool.goal_metadata || {}) as any;
        const tokenMint = goalMetadata.token_mint;
        const minBalance = goalMetadata.min_balance;

        if (tokenMint && minBalance !== undefined) {
          try {
            const currentBalance = await getTokenBalance(currentWallet, tokenMint);
            const minBalanceNum = typeof minBalance === 'number' ? minBalance : parseInt(minBalance, 10);

            if (currentBalance < minBalanceNum) {
              const tokenInfo = getTokenByMint(tokenMint);
              const tokenDecimals = tokenInfo?.decimals ?? 9;
              const minBalanceTokens = minBalanceNum / (10 ** tokenDecimals);
              const tokenSymbol = tokenInfo?.symbol || 'tokens';
              
              alert(
                `You must already hold at least ${minBalanceTokens.toLocaleString(undefined, { maximumFractionDigits: 9 })} ${tokenSymbol} in your wallet to join this HODL challenge. ` +
                `Your current balance is insufficient.`
              );
              setJoining(false);
              return;
            }
          } catch (error: any) {
            console.error('Error checking token balance:', error);
            // Don't block the join if balance check fails - let backend handle it
            // But warn the user
            console.warn('Could not verify token balance. Proceeding, but join may be rejected if balance is insufficient.');
          }
        }
      }

      // Build transaction via Solana Actions backend
      const { transaction: txB64 } = await buildJoinPoolTransaction(poolId, currentWallet);

      const connection = getConnection();

      // Phantom provider
      if (typeof window === 'undefined') {
        throw new Error('Window is not available.');
      }
      const anyWindow = window as typeof window & {
        phantom?: { solana?: any };
        solana?: any;
      };
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
      
      // Extract error message properly
      let errorMessage = 'Failed to join pool. Please try again.';
      
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      } else if (err?.message) {
        errorMessage = err.message;
      } else if (err?.detail) {
        errorMessage = err.detail;
      } else if (err?.error) {
        errorMessage = err.error;
      } else if (typeof err === 'object' && err !== null) {
        // Try to stringify the error object for debugging
        errorMessage = JSON.stringify(err);
      }
      
      // Check for wallet-specific error codes
      if (err?.code === 4001) {
        errorMessage = 'Transaction was rejected by user.';
      } else if (err?.code === -32002) {
        errorMessage = 'Transaction already pending. Please check your wallet.';
      }
      
      alert(errorMessage);
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

  const isHodl = pool.goal_type === 'hodl_token';
  const isDCA = pool.goal_type === 'DailyDCA' || pool.goal_type === 'dca';
  const goalMetadata = (pool.goal_metadata || {}) as any;
  const habitType = goalMetadata.habit_type;
  const isGitHubCommits = habitType === 'github_commits';
  const tokenMint: string | undefined = goalMetadata.token_mint;
  const tokenInfo = tokenMint ? getTokenByMint(tokenMint) : undefined;
  const hodlMinBalanceRaw: number | undefined = goalMetadata.min_balance;
  // Use token decimals for proper conversion (USDC has 6, SOL has 9, etc.)
  const tokenDecimals = tokenInfo?.decimals ?? 9;
  const hodlMinBalanceTokens =
    typeof hodlMinBalanceRaw === 'number' ? hodlMinBalanceRaw / (10 ** tokenDecimals) : undefined;
  const dcaTradesPerDay: number | undefined = goalMetadata.min_trades_per_day;
  const minCommitsPerDay: number | undefined = goalMetadata.min_commits_per_day;
  const minTotalLinesPerDay: number | undefined = goalMetadata.min_total_lines_per_day;

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
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-gray-500 mb-2">
                <p>Commitment Pool #{pool.pool_id}</p>
                <InfoIcon content="Each challenge has a unique ID on the Solana blockchain. This helps track and verify the challenge." />
              </div>
              <h1 className="text-3xl md:text-4xl font-light mb-3">{pool.name}</h1>
              {pool.description && (
                <p className="text-sm text-gray-400 leading-relaxed mb-4">
                  {pool.description}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 pt-4 border-t border-white/10">
              <div>
                <div className="flex items-center gap-1 text-[9px] uppercase tracking-widest text-gray-500 mb-1">
                  Stake
                  <InfoIcon content="The amount of money you need to put down to join this challenge. This money is locked until the challenge ends." />
                </div>
                <div className="font-mono text-sm">{pool.stake_amount} SOL</div>
              </div>
              <div>
                <div className="flex items-center gap-1 text-[9px] uppercase tracking-widest text-gray-500 mb-1">
                  Duration
                  <InfoIcon content="How long this challenge lasts. You must verify your progress every day during this period." />
                </div>
                <div className="font-mono text-sm">{pool.duration_days} days</div>
              </div>
              <div>
                <div className="flex items-center gap-1 text-[9px] uppercase tracking-widest text-gray-500 mb-1">
                  Participants
                  <InfoIcon content="Number of people who have joined this challenge. More participants means a bigger prize pool for winners." />
                </div>
                <div className="font-mono text-sm">
                  {pool.participant_count}/{pool.max_participants}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1 text-[9px] uppercase tracking-widest text-gray-500 mb-1">
                  Status
                  <InfoIcon content={pool.status === 'pending' ? 'Challenge is recruiting. You can still join.' : pool.status === 'active' ? 'Challenge is in progress. You can\'t join anymore, but you can view progress.' : 'Challenge status'} />
                </div>
                <div className="font-mono text-sm uppercase">
                  {pool.status === 'pending' ? 'RECRUITING' : pool.status === 'active' ? 'ACTIVE' : pool.status}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1 text-[9px] uppercase tracking-widest text-gray-500 mb-1">
                  Visibility
                  <InfoIcon content={pool.is_public ? 'Anyone can see and join this challenge' : 'This is a private challenge - you need an invite to join'} />
                </div>
                <div className="font-mono text-sm uppercase">
                  {pool.is_public ? 'Public' : 'Private'}
                </div>
              </div>
            </div>

            {isHodl && (() => {
              const tokenInfo = tokenMint ? getTokenByMint(tokenMint) : undefined;
              return (
                <div className="mt-6 p-4 border border-emerald-500/40 bg-emerald-500/5 rounded-xl space-y-3">
                  <div className="text-[10px] uppercase tracking-widest text-emerald-400">
                    HODL Requirement
                  </div>
                  
                  {/* Token Display with Icon */}
                  {tokenInfo && (
                    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10">
                      {tokenInfo.iconUrl ? (
                        <img 
                          src={tokenInfo.iconUrl} 
                          alt={tokenInfo.symbol}
                          className="w-10 h-10 rounded-full"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-lg font-mono">
                          {tokenInfo.symbol[0]}
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="text-sm font-medium text-white">{tokenInfo.name}</div>
                        <div className="text-xs text-gray-400 font-mono">{tokenInfo.symbol}</div>
                      </div>
                    </div>
                  )}
                  
                  <p className="text-xs text-gray-300">
                    This is a HODL challenge. To stay in the challenge, you must keep at least{' '}
                    {hodlMinBalanceTokens !== undefined ? (
                      <span className="font-mono text-emerald-300">
                        {hodlMinBalanceTokens.toLocaleString(undefined, {
                          maximumFractionDigits: 9,
                        })}{' '}
                      </span>
                    ) : (
                      <span className="font-mono text-emerald-300">the required</span>
                    )}
                    {tokenInfo ? ` ${tokenInfo.symbol}` : ' tokens'} of the asset{' '}
                    {tokenInfo ? `(${tokenInfo.name})` : ''} in your connected Solana wallet for the entire duration.
                  </p>
                  
                  {tokenMint && !tokenInfo && (
                    <div className="text-[11px] text-gray-400">
                      <span className="uppercase tracking-widest text-gray-500 mr-2">
                        Token Mint
                      </span>
                      <span className="font-mono break-all text-gray-200">{tokenMint}</span>
                    </div>
                  )}
                  
                  <p className="text-[11px] text-amber-400">
                    You must already hold at least this amount when you join; otherwise, your join
                    will be rejected.
                  </p>
                </div>
              );
            })()}

            {isGitHubCommits && (() => {
              return (
                <div className="mt-6 p-4 border border-purple-500/40 bg-purple-500/5 rounded-xl space-y-3">
                  <div className="text-[10px] uppercase tracking-widest text-purple-400">
                    GitHub Commits Requirement
                  </div>
                  
                  <p className="text-xs text-gray-300">
                    This is a GitHub commits challenge. You must make at least{' '}
                    <span className="font-mono text-purple-300">
                      {minCommitsPerDay || 1}
                    </span>{' '}
                    commit{minCommitsPerDay !== 1 ? 's' : ''} per day across any of your repositories.
                    {minTotalLinesPerDay && minTotalLinesPerDay > 0 && (
                      <>
                        {' '}Your total code changes (across all commits and repos) must be at least{' '}
                        <span className="font-mono text-purple-300">
                          {minTotalLinesPerDay}
                        </span>{' '}
                        line{minTotalLinesPerDay !== 1 ? 's' : ''} per day.
                      </>
                    )}
                  </p>
                  
                  <p className="text-[11px] text-amber-400">
                    All your commits from all repositories are automatically verified together. 
                    AI evaluates your combined code to ensure it's genuine work - nonsensical or useless commits will be rejected.
                  </p>
                </div>
              );
            })()}

            {isDCA && (() => {
              const tokenInfo = tokenMint ? getTokenByMint(tokenMint) : undefined;
              return (
                <div className="mt-6 p-4 border border-blue-500/40 bg-blue-500/5 rounded-xl space-y-3">
                  <div className="text-[10px] uppercase tracking-widest text-blue-400">
                    Daily DCA Requirement
                  </div>
                  
                  {/* Token Display with Icon */}
                  {tokenInfo && (
                    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10">
                      {tokenInfo.iconUrl ? (
                        <img 
                          src={tokenInfo.iconUrl} 
                          alt={tokenInfo.symbol}
                          className="w-10 h-10 rounded-full"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-lg font-mono">
                          {tokenInfo.symbol[0]}
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="text-sm font-medium text-white">{tokenInfo.name}</div>
                        <div className="text-xs text-gray-400 font-mono">{tokenInfo.symbol}</div>
                      </div>
                    </div>
                  )}
                  
                  <p className="text-xs text-gray-300">
                    This is a Daily DCA challenge. You must make at least{' '}
                    <span className="font-mono text-blue-300">
                      {dcaTradesPerDay || 1}
                    </span>{' '}
                    transaction{dcaTradesPerDay !== 1 ? 's' : ''} per day from your connected Solana wallet.{' '}
                    {tokenInfo && (
                      <>
                        This challenge is for <span className="font-mono text-blue-300">{tokenInfo.symbol}</span> ({tokenInfo.name}).
                      </>
                    )}
                  </p>
                  
                  {tokenMint && !tokenInfo && (
                    <div className="text-[11px] text-gray-400">
                      <span className="uppercase tracking-widest text-gray-500 mr-2">
                        Token Mint
                      </span>
                      <span className="font-mono break-all text-gray-200">{tokenMint}</span>
                    </div>
                  )}
                  
                  <p className="text-[11px] text-amber-400">
                    Note: Verification counts wallet transactions as a proxy for trading activity. 
                    Currently does not verify specific token swaps.
                  </p>
                </div>
              );
            })()}

            <div className="mt-8 p-4 border border-white/10 bg-white/[0.02] rounded-xl flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-xs font-medium text-gray-300">How This Works</p>
                  <InfoIcon content="When you join, your money is locked until the challenge ends. Our system automatically checks if you're meeting your goal each day. Complete the challenge and you split the prize pool with other winners. Fail and you lose your stake. Your money is safe and locked - you can't withdraw it early, which ensures everyone stays committed." />
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Join by putting down your stake. Verify daily. Complete and win money, or fail and lose your stake.
                </p>
              </div>
            </div>
          </div>

          {/* Join card */}
          <div className="space-y-4">
            <div className="border border-white/10 rounded-2xl p-6 bg-white/[0.01]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-widest text-gray-500">
                    Join Challenge
                  </span>
                  <InfoIcon content="This is where you commit to the challenge. Your SOL will be locked in the smart contract until the challenge ends." />
                </div>
                <Clock className="w-4 h-4 text-gray-500" />
              </div>

              <div className="mb-4">
                <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                  Your Stake
                  <InfoIcon content="This is the amount you'll put down to join. It's locked until the challenge ends. Complete the challenge to win more, or fail and lose this amount." />
                </div>
                <div className="text-xl font-light">{pool.stake_amount} SOL</div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-gray-500 mb-4">
                <div className="flex items-center gap-2">
                  <Users className="w-3 h-3" />
                  <div className="flex items-center gap-1">
                    <span>
                      {spotsRemaining > 0 ? `${spotsRemaining} spots left` : 'Pool is full'}
                    </span>
                    <InfoIcon content="The number of available slots for new participants. Once full, no one else can join." />
                  </div>
                </div>
              </div>

              {pool.status === 'active' ? (
                <div className="space-y-3">
                  <div className="p-4 border border-blue-500/30 bg-blue-500/5 rounded-lg">
                    <div className="flex items-start gap-2 text-[10px] text-blue-400">
                      <InfoIcon content="This challenge has already started. You can't join now, but you can view the progress and see how participants are doing." />
                      <div>
                        <p className="font-medium mb-1">Challenge Has Started</p>
                        <p className="text-blue-300/80 leading-relaxed">
                          This challenge is already in progress. You can't join now, but you can view the progress and see how participants are doing.
                        </p>
                      </div>
                    </div>
                  </div>
                  <button
                    disabled
                    className="w-full h-11 border border-white/10 text-xs uppercase tracking-widest font-medium rounded-full flex items-center justify-center gap-2 bg-white/[0.02] text-gray-500 cursor-not-allowed opacity-50"
                  >
                    Join Challenge (Not Available)
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleJoin}
                      disabled={joining || spotsRemaining <= 0 || pool.status !== 'pending'}
                      className="flex-1 h-11 border border-emerald-500 text-xs uppercase tracking-widest font-medium rounded-full flex items-center justify-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {joining ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Joining...
                        </>
                      ) : (
                        <>Join Challenge</>
                      )}
                    </button>
                    <InfoIcon content="Click to join this challenge. You'll be asked to approve a transaction in your wallet. This locks your stake until the challenge ends. Make sure you're ready to commit!" />
                  </div>
                  <p className="text-[10px] text-gray-600 mt-3 text-center leading-relaxed">
                    You'll be asked to approve a transaction in your wallet. This locks your stake until the challenge ends.
                  </p>
                </>
              )}

              {!walletAddress && (
                <div className="mt-4 p-3 border border-amber-500/30 bg-amber-500/5 rounded-lg">
                  <div className="flex items-start gap-2 text-[10px] text-amber-400">
                    <InfoIcon content="Click 'Connect Wallet' in the top-right corner. If you don't have a wallet, install the free Phantom app (like a digital wallet for your commitment money)." />
                    <div>
                      <p className="font-medium mb-1">Need a Wallet?</p>
                      <p className="text-amber-300/80 leading-relaxed">
                        Connect your wallet in the top-right corner to join challenges.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


