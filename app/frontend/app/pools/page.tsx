'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Search, Filter, Info, GitCommit } from 'lucide-react';
import { getPools, PoolResponse } from '@/lib/api';
import { Badge } from '@/components/ui/Badge';
import { ButtonPrimary } from '@/components/ui/ButtonPrimary';
import { getTokenByMint } from '@/lib/tokens';

export default function PoolsPage() {
  const [pools, setPools] = useState<PoolResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [showAllChallenges, setShowAllChallenges] = useState(false); // Default: only show recruiting

  useEffect(() => {
    async function loadPools() {
      try {
        const data = await getPools();
        setPools(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadPools();
  }, []);

  const filteredPools = pools.filter(p => {
    // First filter by status: default to only show recruiting (pending) challenges
    if (!showAllChallenges && p.status !== 'pending') {
      return false;
    }
    
    // Then filter by type if specified
    if (filter === 'ALL') return true;
    const poolType = p.goal_type.includes('Lifestyle') || p.goal_type === 'lifestyle_habit' ? 'LIFESTYLE' : 'CRYPTO';
    return poolType === filter;
  });

  return (
    <div className="min-h-screen bg-[#050505] text-white pt-24 px-6 pb-20">
      <div className="max-w-[1200px] mx-auto">
        <div className="flex flex-col gap-8 mb-12">
          <div className="flex justify-between items-end border-b border-white/10 pb-6">
             <div>
               <h2 className="text-3xl font-light tracking-tight mb-2">Active Challenges</h2>
               <p className="text-gray-500 text-xs mb-3">Browse commitment challenges you can join</p>
               <div className="flex items-start gap-2 text-[10px] text-gray-600">
                 <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                 <span>
                   Click on any challenge to see details and join. You'll need to connect a wallet first (top-right corner).
                 </span>
               </div>
             </div>
             <Link href="/create">
                <ButtonPrimary className="hidden md:flex">Create Challenge</ButtonPrimary>
             </Link>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-gray-500">
             <div className="flex items-center gap-2 border border-white/10 px-3 py-2 bg-white/[0.02]">
               <Search className="w-3 h-3" />
               <input type="text" placeholder="Search..." className="bg-transparent outline-none w-24 md:w-48 placeholder-gray-700 text-white" />
             </div>
             <button 
               onClick={() => setShowAllChallenges(!showAllChallenges)} 
               className={`flex items-center gap-2 px-3 py-2 border transition-colors ${
                 showAllChallenges 
                   ? 'border-emerald-500/50 text-emerald-500 bg-emerald-500/10' 
                   : 'border-white/10 bg-white/[0.02] text-white hover:border-white/30'
               }`}
             >
               <Filter className="w-3 h-3" /> 
               {showAllChallenges ? 'Show All' : 'Recruiting Only'}
             </button>
             <button onClick={() => setFilter('ALL')} className={`flex items-center gap-2 px-3 py-2 border transition-colors ${filter === 'ALL' ? 'border-emerald-500/50 text-emerald-500 bg-emerald-500/10' : 'border-white/10 bg-white/[0.02] text-white hover:border-white/30'}`}>
               <Filter className="w-3 h-3" /> Filter: All
             </button>
             <div className="h-4 w-px bg-white/10 mx-2" />
             <button onClick={() => setFilter('CRYPTO')} className={`transition-colors ${filter === 'CRYPTO' ? 'text-white' : 'hover:text-white'}`}>CRYPTO</button>
             <button onClick={() => setFilter('LIFESTYLE')} className={`transition-colors ${filter === 'LIFESTYLE' ? 'text-white' : 'hover:text-white'}`}>LIFESTYLE</button>
          </div>
        </div>

        {loading ? (
            <div className="space-y-4">
                {[1,2,3].map(i => <div key={i} className="h-32 bg-white/[0.02] border border-white/5 animate-pulse" />)}
            </div>
        ) : filteredPools.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-500 mb-4">No challenges found</p>
              <p className="text-sm text-gray-600 mb-8">Try adjusting your filters or create a new challenge</p>
              <Link href="/create">
                <ButtonPrimary>Create Your First Challenge</ButtonPrimary>
              </Link>
            </div>
        ) : (
            <div className="grid grid-cols-1 gap-4">
            {filteredPools.map((pool) => {
              const poolType = pool.goal_type.includes('Lifestyle') || pool.goal_type === 'lifestyle_habit' ? 'LIFESTYLE' : 'CRYPTO';
              const status = pool.status === 'active' ? 'ACTIVE' : (pool.status === 'pending' ? 'RECRUITING' : pool.status.toUpperCase());
              const goalMetadata = (pool.goal_metadata || {}) as any;
              
              // Determine challenge type
              const isHodl = pool.goal_type === 'hodl_token';
              const isDCA = pool.goal_type === 'DailyDCA' || pool.goal_type === 'dca';
              const habitType = goalMetadata.habit_type;
              const isGitHubCommits = habitType === 'github_commits';
              
              // Extract challenge-specific data
              const tokenMint: string | undefined = goalMetadata.token_mint;
              const tokenInfo = tokenMint ? getTokenByMint(tokenMint) : undefined;
              const hodlMinBalanceRaw: number | undefined = goalMetadata.min_balance;
              // Use token decimals for proper conversion (USDC has 6, SOL has 9, etc.)
              const tokenDecimals = tokenInfo?.decimals ?? 9;
              const hodlMinBalanceTokens = typeof hodlMinBalanceRaw === 'number' ? hodlMinBalanceRaw / (10 ** tokenDecimals) : undefined;
              const dcaTradesPerDay: number | undefined = goalMetadata.min_trades_per_day;
              const minCommitsPerDay: number | undefined = goalMetadata.min_commits_per_day;
              const minLinesPerCommit: number | undefined = goalMetadata.min_lines_per_commit;

              return (
                <Link 
                  href={`/pools/${pool.pool_id}`}
                  key={pool.pool_id} 
                  className="group relative p-6 border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] hover:border-emerald-500/20 transition-all cursor-pointer flex flex-col md:flex-row gap-6 md:items-center"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge color={poolType === 'CRYPTO' ? 'blue' : 'orange'}>{poolType}</Badge>
                      <Badge color={status === 'RECRUITING' || status === 'pending' ? 'emerald' : status === 'ACTIVE' || status === 'active' ? 'blue' : 'gray'}>
                        {status}
                      </Badge>
                      {status === 'ACTIVE' || status === 'active' ? (
                        <span className="text-[10px] text-gray-500 italic">(Can't join - view only)</span>
                      ) : null}
                    </div>
                    <h3 className="text-xl font-light mb-1 group-hover:text-emerald-400 transition-colors">{pool.name}</h3>
                    {pool.description && (
                      <p className="text-sm text-gray-500 font-light mb-3">{pool.description}</p>
                    )}
                    
                    {/* Challenge-specific information */}
                    <div className="flex flex-wrap items-center gap-4 mt-3">
                      {isHodl && hodlMinBalanceTokens !== undefined && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                          {tokenInfo ? (
                            <>
                              {tokenInfo.iconUrl ? (
                                <img 
                                  src={tokenInfo.iconUrl} 
                                  alt={tokenInfo.symbol}
                                  className="w-5 h-5 rounded-full"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs font-mono">
                                  {tokenInfo.symbol[0]}
                                </div>
                              )}
                              <span className="text-xs font-mono text-emerald-300">
                                {hodlMinBalanceTokens.toLocaleString(undefined, { maximumFractionDigits: 4 })} {tokenInfo.symbol}
                              </span>
                            </>
                          ) : (
                            <span className="text-xs font-mono text-emerald-300">
                              {hodlMinBalanceTokens.toLocaleString(undefined, { maximumFractionDigits: 4 })} tokens
                            </span>
                          )}
                        </div>
                      )}
                      
                      {isDCA && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                          {tokenInfo && tokenInfo.iconUrl ? (
                            <img 
                              src={tokenInfo.iconUrl} 
                              alt={tokenInfo.symbol}
                              className="w-5 h-5 rounded-full"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : tokenInfo ? (
                            <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-xs font-mono">
                              {tokenInfo.symbol[0]}
                            </div>
                          ) : null}
                          <span className="text-xs font-mono text-blue-300">
                            {dcaTradesPerDay || 1} trade{dcaTradesPerDay !== 1 ? 's' : ''}/day
                            {tokenInfo && ` • ${tokenInfo.symbol}`}
                          </span>
                        </div>
                      )}
                      
                      {isGitHubCommits && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                          <GitCommit className="w-4 h-4 text-purple-300" />
                          <span className="text-xs font-mono text-purple-300">
                            {minCommitsPerDay || 1} commit{minCommitsPerDay !== 1 ? 's' : ''}/day
                            {minLinesPerCommit && minLinesPerCommit > 0 && ` • ${minLinesPerCommit}+ lines`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-8 border-l border-white/5 pl-8 md:w-1/3">
                    <div>
                      <div className="text-[9px] uppercase tracking-wider text-gray-500 mb-1">Stake</div>
                      <div className="font-mono text-sm mb-1">{pool.stake_amount} SOL</div>
                      <div className="text-[9px] text-gray-600">To join</div>
                    </div>
                    <div>
                      <div className="text-[9px] uppercase tracking-wider text-gray-500 mb-1">Duration</div>
                      <div className="font-mono text-sm mb-1">{pool.duration_days} Days</div>
                      <div className="text-[9px] text-gray-600">Challenge length</div>
                    </div>
                    <div>
                      <div className="text-[9px] uppercase tracking-wider text-gray-500 mb-1">Capacity</div>
                      <div className="font-mono text-sm mb-1">{pool.participant_count}/{pool.max_participants}</div>
                      <div className="text-[9px] text-gray-600">Joined / Max</div>
                    </div>
                  </div>

                  <div className="md:pl-4">
                    <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all">
                      <ArrowRight strokeWidth={1} className="w-4 h-4" />
                    </div>
                  </div>
                </Link>
              );
            })}
            </div>
        )}
      </div>
    </div>
  );
}