'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChevronRight, Shield, Github, Image as ImageIcon, Trophy, TrendingUp, Users } from 'lucide-react';
import { getPool, getUserParticipations } from '@/lib/api';
import { getPersistedWalletAddress } from '@/lib/wallet';
import { Badge } from '@/components/ui/Badge';
import { ButtonPrimary } from '@/components/ui/ButtonPrimary';
import { SectionLabel } from '@/components/ui/SectionLabel';

export default function PoolDetail() {
  const { id } = useParams();
  const [pool, setPool] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isParticipant, setIsParticipant] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [participantProgress, setParticipantProgress] = useState<any[]>([]);

  useEffect(() => {
    const address = getPersistedWalletAddress();
    setWalletAddress(address);

    async function loadData() {
      if (!id) return;
      try {
        const poolData = await getPool(Number(id));
        setPool({
            id: poolData.pool_id,
            title: poolData.name,
            type: poolData.goal_type.includes('Lifestyle') ? 'LIFESTYLE' : 'CRYPTO',
            poolValue: poolData.total_staked || 0,
            roi: "15%", // Placeholder
            participants: poolData.participant_count,
            stake: poolData.stake_amount,
            duration: `${poolData.duration_days} Days`,
            verification: poolData.goal_type.includes('GitHub') ? 'GITHUB' : 'PHOTO',
            status: poolData.status
        });

        if (address) {
            const participations = await getUserParticipations(address);
            const found = participations.find(p => p.pool_id === Number(id));
            if (found) setIsParticipant(true);
        }

        // Load participant progress (mock data for now)
        // TODO: Replace with actual API call to get pool participants
        const mockProgress = [
          { wallet: '8x...92kL', daysCompleted: 15, totalDays: 30, streak: 15, progress: 50, rank: 1 },
          { wallet: '5m...7pQ', daysCompleted: 14, totalDays: 30, streak: 14, progress: 47, rank: 2 },
          { wallet: '3k...9nR', daysCompleted: 13, totalDays: 30, streak: 13, progress: 43, rank: 3 },
          { wallet: '2j...4tS', daysCompleted: 12, totalDays: 30, streak: 12, progress: 40, rank: 4 },
          { wallet: '9v...1wX', daysCompleted: 11, totalDays: 30, streak: 11, progress: 37, rank: 5 },
          { wallet: '6b...8cY', daysCompleted: 10, totalDays: 30, streak: 10, progress: 33, rank: 6 },
        ];
        setParticipantProgress(mockProgress);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  const handleJoin = () => {
      if (!walletAddress) {
          alert("Please connect wallet first");
          return;
      }
      // Logic to join pool would go here (smart contract interaction)
      alert("Join functionality requires Smart Contract interaction.");
  };

  if (loading) return <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center">Loading...</div>;
  if (!pool) return <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center">Pool not found</div>;

  return (
    <div className="min-h-screen bg-[#050505] text-white pt-24 px-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="max-w-5xl mx-auto">
        <Link href="/pools" className="flex items-center gap-2 text-gray-500 hover:text-white mb-8 text-xs uppercase tracking-widest transition-colors">
          <ChevronRight className="w-3 h-3 rotate-180" /> Back to Pools
        </Link>

        {/* Header */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          <div className="lg:col-span-2">
             <div className="flex items-center gap-3 mb-4">
               <Badge color={pool.type === 'CRYPTO' ? 'blue' : 'orange'}>{pool.type}</Badge>
               <div className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-emerald-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Contract
               </div>
             </div>
             <h1 className="text-4xl md:text-5xl font-light mb-6">{pool.title}</h1>
             <div className="flex gap-12 border-y border-white/10 py-6">
                <div>
                  <div className="text-[9px] uppercase tracking-wider text-gray-500 mb-1">Total Pool Value</div>
                  <div className="text-2xl font-light">{pool.poolValue} SOL</div>
                </div>
                <div>
                  <div className="text-[9px] uppercase tracking-wider text-gray-500 mb-1">Est. Yield</div>
                  <div className="text-2xl font-light text-emerald-500">{pool.roi}</div>
                </div>
                <div>
                  <div className="text-[9px] uppercase tracking-wider text-gray-500 mb-1">Participants</div>
                  <div className="text-2xl font-light">{pool.participants}</div>
                </div>
             </div>
          </div>
          
          {/* Action Card */}
          <div className="border border-white/10 bg-[#0A0A0A] p-6 flex flex-col justify-between">
             <div>
               <div className="flex items-center justify-between mb-6">
                 <span className="text-xs uppercase tracking-wider text-gray-400">Entry Stake</span>
                 <span className="text-xl font-mono">{pool.stake} SOL</span>
               </div>
               <div className="space-y-3 mb-8">
                 <div className="flex justify-between text-sm text-gray-500">
                   <span>Duration</span>
                   <span className="text-white">{pool.duration}</span>
                 </div>
                 <div className="flex justify-between text-sm text-gray-500">
                   <span>Verification</span>
                   <span className="text-white">{pool.verification}</span>
                 </div>
                 <div className="flex justify-between text-sm text-gray-500">
                   <span>Start Date</span>
                   <span className="text-white">Oct 12, 00:00 UTC</span>
                 </div>
               </div>
             </div>
             {isParticipant ? (
               <div className="w-full py-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-center text-xs uppercase tracking-widest font-medium">
                 Active Participant
               </div>
             ) : (
               <ButtonPrimary onClick={handleJoin} className="w-full">Stake {pool.stake} SOL & Join</ButtonPrimary>
             )}
             <div className="mt-4 flex items-center justify-center gap-2 text-[9px] text-gray-600 uppercase tracking-widest">
               <Shield className="w-3 h-3" /> Audited Contract
             </div>
          </div>
        </div>

        {/* Content Tabs area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
           {/* Left: Verification/Progress */}
           <div className="lg:col-span-2 space-y-8">
              {isParticipant ? (
                <div className="border border-white/10 bg-emerald-900/[0.05] p-8">
                  <SectionLabel>My Progress</SectionLabel>
                  <div className="flex items-end justify-between mb-6">
                     <div>
                       <div className="text-4xl font-light mb-1">Day 11 <span className="text-gray-600 text-xl">/ 30</span></div>
                       <div className="text-xs text-emerald-500 uppercase tracking-widest">Streak Active</div>
                     </div>
                     <div className="text-right">
                       <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Verifications</div>
                       <div className="font-mono text-xl">11 / 11</div>
                     </div>
                  </div>
                  <div className="w-full bg-white/5 h-1 mb-8">
                    <div className="bg-emerald-500 h-full w-[36%]"></div>
                  </div>

                  {/* Verification Block */}
                  <div className="border-t border-white/10 pt-8">
                    <h3 className="text-lg font-light mb-4">Daily Verification</h3>
                    {pool.verification === 'GITHUB' ? (
                       <div className="flex items-center gap-4 p-4 border border-white/10 bg-black">
                         <Github className="w-5 h-5 text-white" />
                         <div className="flex-1">
                           <div className="text-sm text-white">Github Connected</div>
                           <div className="text-xs text-gray-500">Auto-verifying commits to <code>user/repo</code></div>
                         </div>
                         <div className="px-3 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] uppercase tracking-widest">Active</div>
                       </div>
                    ) : (
                       <div className="border border-dashed border-white/20 p-8 text-center hover:bg-white/5 transition-colors cursor-pointer group">
                          <div className="w-10 h-10 mx-auto mb-3 text-gray-500 group-hover:text-white transition-colors"><ImageIcon strokeWidth={1} /></div>
                          <div className="text-sm text-gray-300 mb-1">Upload Daily Screenshot</div>
                          <div className="text-xs text-gray-600">Drag & drop or click to browse</div>
                       </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="border border-white/10 p-8">
                  <SectionLabel>About this Challenge</SectionLabel>
                  <p className="text-gray-400 font-light leading-relaxed mb-6">
                    This pool enforces strict accountability. Missing a verification window (24h) results in immediate slashing of your staked SOL. 
                    Proceeds from slashed stakes are distributed to successful finishers at the end of the 30 day period.
                  </p>
                  <h4 className="text-sm font-medium text-white mb-2">Requirements</h4>
                  <ul className="list-disc list-inside text-sm text-gray-500 space-y-2 font-light">
                     <li>Must verify every 24 hours between 00:00 - 23:59 UTC</li>
                     <li>Wallet must maintain minimum balance for gas</li>
                     <li>For Photo verification: Metadata is checked for timestamps</li>
                  </ul>
                </div>
              )}
           </div>

           {/* Right: Participants & Progress */}
           <div className="space-y-8">
              {/* Participant Progress Leaderboard */}
              <div>
                 <div className="flex items-center justify-between mb-6">
                    <SectionLabel>Leaderboard</SectionLabel>
                    <div className="flex items-center gap-2 text-[10px] text-gray-500 uppercase tracking-widest">
                       <Users className="w-3 h-3" />
                       {participantProgress.length} Active
                    </div>
                 </div>
                 <div className="space-y-3">
                    {participantProgress.map((participant, idx) => (
                       <div key={idx} className="border border-white/5 bg-white/[0.01] p-4 hover:bg-white/[0.02] transition-colors">
                          <div className="flex items-center justify-between mb-3">
                             <div className="flex items-center gap-3">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                   participant.rank === 1 ? 'bg-yellow-500/20 text-yellow-400' :
                                   participant.rank === 2 ? 'bg-gray-400/20 text-gray-300' :
                                   participant.rank === 3 ? 'bg-orange-600/20 text-orange-400' :
                                   'bg-white/5 text-gray-500'
                                }`}>
                                   {participant.rank}
                                </div>
                                <div>
                                   <div className="text-xs font-mono text-white">{participant.wallet}</div>
                                   <div className="text-[10px] text-gray-500">Day {participant.daysCompleted} / {participant.totalDays}</div>
                                </div>
                             </div>
                             {participant.rank <= 3 && (
                                <Trophy className={`w-4 h-4 ${
                                   participant.rank === 1 ? 'text-yellow-400' :
                                   participant.rank === 2 ? 'text-gray-300' :
                                   'text-orange-400'
                                }`} />
                             )}
                          </div>
                          <div className="space-y-2">
                             <div className="flex items-center justify-between text-[10px] text-gray-500">
                                <span>Progress</span>
                                <span className="text-emerald-400">{participant.progress}%</span>
                             </div>
                             <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                                <div 
                                   className="bg-emerald-500 h-full transition-all"
                                   style={{ width: `${participant.progress}%` }}
                                />
                             </div>
                             <div className="flex items-center justify-between text-[10px]">
                                <div className="flex items-center gap-1 text-gray-500">
                                   <TrendingUp className="w-3 h-3" />
                                   <span>Streak: {participant.streak} days</span>
                                </div>
                                {participant.rank === 1 && (
                                   <span className="text-yellow-400 font-medium">Leading</span>
                                )}
                             </div>
                          </div>
                       </div>
                    ))}
                 </div>
              </div>

              {/* Recent Joins */}
              <div>
                 <SectionLabel>Recent Joins</SectionLabel>
                 <div className="space-y-4">
                    {[1,2,3,4,5].map((_, i) => (
                       <div key={i} className="flex items-center gap-3 pb-3 border-b border-white/5">
                          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-mono">0x</div>
                          <div className="flex-1">
                             <div className="text-xs font-mono text-gray-300">8x...92kL</div>
                             <div className="text-[10px] text-gray-600">Joined 2h ago</div>
                          </div>
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50"></div>
                       </div>
                    ))}
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
