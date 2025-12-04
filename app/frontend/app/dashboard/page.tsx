'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronDown, Check, Smartphone, ArrowRight, Users, TrendingDown } from 'lucide-react';
import { getUserParticipations, UserParticipation, getPoolStats, getParticipantVerifications } from '@/lib/api';
import { getPersistedWalletAddress } from '@/lib/wallet';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { Stat } from '@/components/ui/Stat';
import { getConnection } from '@/lib/solana';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [activeChallenges, setActiveChallenges] = useState<any[]>([]);
  const [selectedChallengeId, setSelectedChallengeId] = useState<number | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [participantStats, setParticipantStats] = useState<{ started: number; remaining: number } | null>(null);
  const [timeLeft, setTimeLeft] = useState<string | null>(null);
  const [currentBlock, setCurrentBlock] = useState<number | null>(null);

  useEffect(() => {
    const address = getPersistedWalletAddress();
    setWalletAddress(address);
    
    if (address) {
      fetchData(address);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchData = async (address: string) => {
    try {
      const participations = await getUserParticipations(address);
      
      // Map API data to UI format
      const mapped = participations.map(p => ({
        id: p.pool_id,
        title: p.name,
        type: p.goal_type.includes('Lifestyle') ? 'LIFESTYLE' : 'CRYPTO',
        status: p.status === 'active' ? 'ACTIVE' : p.status,
        description: p.description,
        duration: `${p.duration_days} Days`,
        stake: p.stake_amount,
        poolValue: p.stake_amount * 10, // Mock total value
        potentialWin: p.stake_amount * 1.1, // Mock ROI
        streak: p.days_verified,
        totalDays: p.duration_days,
        progress: p.progress,
        joinedAt: p.joined_at,
      }));
      
      setActiveChallenges(mapped);
      if (mapped.length > 0) {
        setSelectedChallengeId(mapped[0].id);
        // Load participant stats for the first challenge
        // TODO: Replace with actual API call to get pool participant stats
        loadParticipantStats(mapped[0].id);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadParticipantStats = async (poolId: number) => {
    try {
      const stats = await getPoolStats(poolId);
      setParticipantStats({ started: stats.started, remaining: stats.remaining });
    } catch (e) {
      console.error('Failed to load participant stats:', e);
      setParticipantStats(null);
    }
  };

  // Reload stats when challenge changes
  useEffect(() => {
    if (selectedChallengeId) {
      loadParticipantStats(selectedChallengeId);
    }
  }, [selectedChallengeId]);

  // Load Solana block (devnet) for display
  useEffect(() => {
    const loadBlock = async () => {
      try {
        const conn = getConnection();
        const slot = await conn.getSlot();
        setCurrentBlock(slot);
      } catch (e) {
        console.error('Failed to load current block:', e);
      }
    };
    loadBlock();
  }, []);

  // Load verification window and compute "closes in" countdown
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    const loadWindow = async () => {
      if (!walletAddress || !selectedChallengeId) {
        setTimeLeft(null);
        return;
      }
      try {
        const status = await getParticipantVerifications(selectedChallengeId, walletAddress);
        if (!status.next_window_end) {
          setTimeLeft(null);
          return;
        }
        const update = () => {
          const now = Math.floor(Date.now() / 1000);
          const diff = status.next_window_end! - now;
          if (diff <= 0) {
            setTimeLeft('0 minutes');
            return;
          }
          const hours = Math.floor(diff / 3600);
          const minutes = Math.floor((diff % 3600) / 60);
          if (hours > 0) {
            setTimeLeft(`${hours}h ${minutes}m`);
          } else {
            setTimeLeft(`${minutes}m`);
          }
        };
        update();
        intervalId = setInterval(update, 60_000);
      } catch (e) {
        console.error('Failed to load verification window:', e);
        setTimeLeft(null);
      }
    };

    loadWindow();

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [walletAddress, selectedChallengeId]);

  const handleCheckIn = () => {
    setVerifying(true);
    // Mock check-in logic
    setTimeout(() => { 
      setVerifying(false); 
      setCheckedIn(true); 
    }, 1500);
  };

  if (!walletAddress) {
    return (
      <div className="min-h-screen bg-[#050505] text-white pt-32 px-6 flex flex-col items-center justify-center text-center">
        <SectionLabel>Access Restricted</SectionLabel>
        <h1 className="text-4xl font-light mb-6">Please Connect Wallet</h1>
        <p className="text-gray-500 mb-8">You need to connect your Solana wallet to view your dashboard.</p>
      </div>
    );
  }

  if (loading) {
     return (
        <div className="min-h-screen bg-[#050505] text-white pt-32 px-6 flex items-center justify-center">
           <div className="animate-pulse text-emerald-500 text-xs uppercase tracking-widest">Loading Protocol Data...</div>
        </div>
     );
  }

  if (activeChallenges.length === 0) {
    return (
      <div className="min-h-screen bg-[#050505] text-white pt-32 px-6 text-center">
         <SectionLabel>No Active Protocols</SectionLabel>
         <h1 className="text-4xl font-light mb-6">Start Your Journey</h1>
         <p className="text-gray-500 mb-12">You have not joined any commitment pools yet.</p>
         <Link href="/pools" className="inline-flex items-center gap-2 px-6 py-3 border border-emerald-500 text-emerald-500 uppercase tracking-widest text-xs hover:bg-emerald-500 hover:text-white transition-colors">
            Browse Challenges <ArrowRight className="w-4 h-4" />
         </Link>
      </div>
    );
  }

  const activeChallenge = activeChallenges.find(c => c.id === selectedChallengeId) || activeChallenges[0];
  const progress = activeChallenge.progress ?? Math.floor((activeChallenge.streak / activeChallenge.totalDays) * 100);

  return (
    <div className="min-h-screen bg-[#050505] text-white pt-32 px-6 pb-20">
      <div className="max-w-[1000px] mx-auto">
        
        {/* Challenge Selector Dropdown */}
        <div className="mb-12 flex justify-center relative z-20">
            <div className="relative">
                <button 
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center gap-3 px-8 py-3 border border-white/10 rounded-full bg-white/[0.02] hover:border-white/30 transition-all min-w-[280px] justify-between"
                >
                    <div className="flex flex-col text-left">
                        <span className="text-[9px] text-gray-500 uppercase tracking-widest mb-0.5">Active Protocol</span>
                        <span className="text-xs font-medium uppercase tracking-widest text-white">{activeChallenge.title}</span>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-emerald-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {isDropdownOpen && (
                    <div className="absolute top-full left-0 w-full mt-2 bg-[#0A0A0A] border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-30">
                        {activeChallenges.map(challenge => (
                            <button
                                key={challenge.id}
                                onClick={() => {
                                    setSelectedChallengeId(challenge.id);
                                    setCheckedIn(false);
                                    setIsDropdownOpen(false);
                                    loadParticipantStats(challenge.id);
                                }}
                                className={`w-full text-left px-8 py-4 text-[10px] uppercase tracking-widest hover:bg-white/[0.05] transition-colors border-b border-white/5 last:border-0 flex justify-between items-center ${
                                    selectedChallengeId === challenge.id ? 'text-white bg-white/[0.02]' : 'text-gray-500'
                                }`}
                            >
                                <span>{challenge.title}</span>
                                {selectedChallengeId === challenge.id && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center min-h-[60vh] animate-in fade-in slide-in-from-bottom-4 duration-500" key={activeChallenge.id}>
           
           {/* Left: Progress Visualization */}
           <div className="flex flex-col items-center md:items-start">
              <SectionLabel>Active Protocol</SectionLabel>
              <h1 className="text-4xl font-light mb-12 text-center md:text-left">
                Day {activeChallenge.streak} <span className="text-gray-600">/ {activeChallenge.totalDays}</span>
              </h1>
              
              <div className="relative w-72 h-72 md:w-96 md:h-96 border border-white/10 rounded-full flex items-center justify-center p-8">
                 {/* Thin subtle track */}
                 <div className="absolute inset-0 rounded-full border border-white/5 scale-90" />
                 
                 {/* Spinner visual */}
                 <div 
                    className="absolute inset-0 rounded-full border-2 border-transparent border-t-emerald-500 transition-all duration-1000 ease-out" 
                    style={{ transform: `rotate(${progress * 3.6}deg)` }}
                 />
                 
                 <div className="text-center">
                    <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">Streak</div>
                    <div className="text-6xl font-light tracking-tighter text-white">{activeChallenge.streak}</div>
                 </div>
              </div>
           </div>

           {/* Right: Actions & Stats */}
           <div className="flex flex-col justify-center space-y-12">
              <div className="space-y-8">
                 <div className="border-l-2 border-emerald-500 pl-6">
                    <h3 className="text-xl font-light mb-2">{activeChallenge.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">
                      {timeLeft
                        ? `You are on track. Next verification window closes in ${timeLeft}.`
                        : 'You are on track. Waiting for next verification window.'}
                    </p>
                 </div>

                 <div className="grid grid-cols-2 gap-8">
                    <Stat label="Staked" value={`${activeChallenge.stake} SOL`} />
                    <Stat label="Projected" value={`+${activeChallenge.potentialWin.toFixed(2)} SOL`} />
                 </div>

                 {/* Participant Statistics */}
                 {participantStats && (
                    <div className="pt-6 border-t border-white/5">
                       <div className="flex items-center gap-2 mb-4">
                          <Users className="w-4 h-4 text-gray-500" />
                          <span className="text-xs uppercase tracking-widest text-gray-500">Challenge Stats</span>
                       </div>
                       <div className="grid grid-cols-2 gap-6">
                          <div className="flex flex-col">
                             <div className="text-2xl font-light text-white mb-1">{participantStats.started}</div>
                             <div className="text-[10px] uppercase tracking-wider text-gray-500">Started</div>
                          </div>
                          <div className="flex flex-col">
                             <div className="text-2xl font-light text-emerald-400 mb-1">{participantStats.remaining}</div>
                             <div className="text-[10px] uppercase tracking-wider text-gray-500 flex items-center gap-1">
                                <TrendingDown className="w-3 h-3" />
                                Remaining
                             </div>
                          </div>
                       </div>
                       <div className="mt-4 pt-4 border-t border-white/5">
                          <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                             <div 
                                className="bg-emerald-500 h-full transition-all"
                                style={{
                                  width:
                                    participantStats.started > 0
                                      ? `${(participantStats.remaining / participantStats.started) * 100}%`
                                      : '0%',
                                }}
                             />
                          </div>
                          <div className="flex justify-between mt-2 text-[10px] text-gray-600">
                             <span>{participantStats.started - participantStats.remaining} eliminated</span>
                             <span>
                               {participantStats.started > 0
                                 ? `${Math.round(
                                     (participantStats.remaining / participantStats.started) * 100
                                   )}% still in`
                                 : '0% still in'}
                             </span>
                          </div>
                       </div>
                    </div>
                 )}
              </div>

              <div>
                 {!checkedIn ? (
                    <button 
                       onClick={handleCheckIn}
                       disabled={verifying}
                       className="w-full h-20 border border-white/20 hover:border-emerald-500 hover:bg-emerald-500/5 text-white uppercase tracking-widest text-xs font-medium transition-all flex items-center justify-center gap-4 group"
                    >
                       {verifying ? (
                          <span className="animate-pulse">Verifying On-Chain...</span>
                       ) : (
                          <>
                             <span>Submit Daily Proof</span>
                             <Smartphone strokeWidth={1} className="w-5 h-5 group-hover:-translate-y-1 transition-transform" />
                          </>
                       )}
                    </button>
                 ) : (
                    <div className="w-full h-20 bg-white text-black flex items-center justify-center gap-3 uppercase tracking-widest text-xs font-medium">
                       <Check strokeWidth={1.5} className="w-5 h-5" />
                       Verified
                    </div>
                 )}
                 <div className="flex justify-between mt-4 text-[9px] text-gray-600 font-mono">
                    <span>BLOCK: #{currentBlock ?? '...'}</span>
                    <span>STATUS: CONFIRMED</span>
                 </div>
              </div>

              <div className="pt-8 border-t border-white/5">
                 <div className="flex justify-between items-center mb-4">
                    <span className="text-xs uppercase tracking-widest text-gray-500">History</span>
                    <Link href="/pools" className="text-xs text-white hover:text-emerald-500">View All</Link>
                 </div>
                 {/* Placeholder history */}
                 <div className="space-y-3">
                   <div className="flex justify-between text-sm text-gray-400">
                     <span>Previous Challenge</span>
                     <span className="text-emerald-500">+1.2 SOL</span>
                   </div>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
