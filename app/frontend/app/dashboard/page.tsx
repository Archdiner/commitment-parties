'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronDown, Check, Smartphone, ArrowRight, Users, TrendingDown } from 'lucide-react';
import { InfoIcon } from '@/components/ui/Tooltip';
import { getUserParticipations, UserParticipation, getPoolStats, getParticipantVerifications, triggerGitHubVerification, verifyScreenTime } from '@/lib/api';
import { getPersistedWalletAddress } from '@/lib/wallet';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { Stat } from '@/components/ui/Stat';
import { getConnection } from '@/lib/solana';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [activeChallenges, setActiveChallenges] = useState<any[]>([]);
  const [participationsData, setParticipationsData] = useState<UserParticipation[]>([]);
  const [selectedChallengeId, setSelectedChallengeId] = useState<number | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);
  const [participantStats, setParticipantStats] = useState<{ started: number; remaining: number } | null>(null);
  const [timeLeft, setTimeLeft] = useState<string | null>(null);
  const [currentBlock, setCurrentBlock] = useState<number | null>(null);
  const [userStats, setUserStats] = useState<{
    totalEarned: number;
    totalStaked: number;
    successfulChallenges: number;
  } | null>(null);
  const [historyData, setHistoryData] = useState<Array<{
    pool_id: number;
    name: string;
    participant_status: string;
    stake_amount: number;
    earnings: number;
    end_timestamp: number;
  }>>([]);

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
      
      // Calculate user stats
      let totalStaked = 0;
      let totalEarned = 0;
      let successfulChallenges = 0;
      
      participations.forEach(p => {
        totalStaked += p.stake_amount;
        
        // If participant status is 'success', they completed the challenge
        // For now, we'll estimate earnings based on completed challenges
        // In a real implementation, you'd query payouts table
        if (p.participant_status === 'success' || p.participant_status === 'completed') {
          successfulChallenges++;
          // Estimate: they got their stake back + some profit
          // This is a simplified calculation - real earnings would come from payout records
          totalEarned += p.stake_amount * 1.2; // Assume 20% profit on successful challenges
        }
      });
      
      setUserStats({
        totalEarned,
        totalStaked,
        successfulChallenges,
      });
      
      // Store full participation data for challenge type checking
      setParticipationsData(participations);
      
      // Separate active and completed participations
      const active = participations.filter(p => 
        p.status === 'active' && 
        p.participant_status !== 'success' &&
        p.participant_status !== 'failed' &&
        p.participant_status !== 'forfeit'
      );
      
      const completed = participations.filter(p => 
        p.participant_status === 'success' || 
        p.participant_status === 'failed' || 
        p.participant_status === 'forfeit' ||
        p.status === 'ended' || 
        p.status === 'settled'
      );
      
      // Calculate history data with earnings
      const history = completed.map(p => {
        let earnings = 0;
        if (p.participant_status === 'success') {
          // Successful: got stake back + estimated profit (20% of stake)
          earnings = p.stake_amount * 1.2;
        } else {
          // Failed/Forfeit: lost stake (negative)
          earnings = -p.stake_amount;
        }
        
        return {
          pool_id: p.pool_id,
          name: p.name,
          participant_status: p.participant_status,
          stake_amount: p.stake_amount,
          earnings,
          end_timestamp: p.end_timestamp,
        };
      });
      
      // Sort by end_timestamp (most recent first)
      history.sort((a, b) => b.end_timestamp - a.end_timestamp);
      setHistoryData(history);
      
      // Map API data to UI format (only active challenges)
      // We'll fetch current_day from the verification status API
      const mapped = await Promise.all(active.map(async (p) => {
        let currentDay = 1; // Default to day 1
        try {
          // Fetch current day from verification status
          const status = await getParticipantVerifications(p.pool_id, address);
          currentDay = status.current_day || 1;
          // Ensure current_day is at least 1 (never 0)
          if (currentDay < 1) currentDay = 1;
        } catch (e) {
          console.warn('Failed to fetch current day, defaulting to 1:', e);
        }
        
        return {
          id: p.pool_id,
          title: p.name,
          type: p.goal_type.includes('Lifestyle') ? 'LIFESTYLE' : 'CRYPTO',
          status: p.status === 'active' ? 'ACTIVE' : p.status,
          description: p.description,
          duration: `${p.duration_days} Days`,
          stake: p.stake_amount,
          poolValue: p.stake_amount * 10, // Mock total value
          potentialWin: p.stake_amount * 1.1, // Mock ROI
          streak: p.days_verified, // Days successfully verified
          currentDay: currentDay, // Current challenge day (1-indexed)
          totalDays: p.duration_days,
          progress: p.progress,
          joinedAt: p.joined_at,
        };
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

  // Reload stats and check verification status when challenge changes
  useEffect(() => {
    if (selectedChallengeId && walletAddress) {
      loadParticipantStats(selectedChallengeId);
      checkVerificationStatus(selectedChallengeId, walletAddress);
      // Update current day for the selected challenge
      updateCurrentDay(selectedChallengeId);
    }
    // Reset checkedIn when challenge changes
    setCheckedIn(false);
  }, [selectedChallengeId, walletAddress]);

  const updateCurrentDay = async (poolId: number) => {
    if (!walletAddress) return;
    try {
      const status = await getParticipantVerifications(poolId, walletAddress);
      const currentDay = status.current_day || 1;
      // Update the activeChallenge with current day
      setActiveChallenges(prev => prev.map(c => 
        c.id === poolId ? { ...c, currentDay: Math.max(1, currentDay) } : c
      ));
    } catch (e) {
      console.error('Failed to update current day:', e);
    }
  };

  const checkVerificationStatus = async (poolId: number, wallet: string) => {
    try {
      const status = await getParticipantVerifications(poolId, wallet);
      // Check if user is verified for today
      // We'll check if there's a verification for the current day
      const today = new Date();
      const hasTodayVerification = status.verifications.some(v => {
        // This is a simplified check - in production, you'd compare with actual challenge day
        return v.passed === true;
      });
      // For now, we'll check if days_verified increased (simplified)
      // In a real implementation, you'd check the specific day
      setCheckedIn(false); // Reset and let user trigger check
    } catch (e) {
      console.error('Failed to check verification status:', e);
      setCheckedIn(false);
    }
  };

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

  const handleCheckIn = async () => {
    if (!walletAddress || !selectedChallengeId) return;
    
    // Find the current participation data
    const participation = participationsData.find(p => p.pool_id === selectedChallengeId);
    if (!participation) return;
    
    const goalType = participation.goal_type;
    const goalMetadata = participation.goal_metadata || {};
    const habitType = goalMetadata.habit_type;
    
    // Check if it's a crypto challenge
    if (goalType === 'hodl_token' || goalType.includes('crypto') || goalType.includes('Crypto')) {
      // Crypto challenges don't allow manual verification
      return;
    }
    
    // Check if it's a GitHub challenge
    if (goalType === 'lifestyle_habit' && habitType === 'github_commits') {
      setVerifying(true);
      setVerificationMessage(null);
      try {
        const result = await triggerGitHubVerification(selectedChallengeId, walletAddress);
        if (result.verified) {
          setCheckedIn(true);
          setVerificationMessage(result.message || 'Successfully verified GitHub commits for today');
          // Refresh participation data to update progress
          if (walletAddress) {
            await fetchData(walletAddress);
          }
        } else {
          setVerificationMessage(result.message || 'Verification failed. Please ensure you have commits for today.');
        }
      } catch (error: any) {
        console.error('Error triggering GitHub verification:', error);
        setVerificationMessage(error.message || 'Failed to verify GitHub commits. Please try again.');
      } finally {
        setVerifying(false);
      }
      return;
    }
    
    // Check if it's a screen time challenge
    if (goalType === 'lifestyle_habit' && habitType === 'screen_time') {
      setShowUploadModal(true);
      setUploadError(null);
      return;
    }
    
    // For other lifestyle challenges, use the existing check-in flow
    setVerifying(true);
    // Mock check-in logic for non-GitHub lifestyle challenges
    setTimeout(() => { 
      setVerifying(false); 
      setCheckedIn(true); 
    }, 1500);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!walletAddress || !selectedChallengeId || !event.target.files || event.target.files.length === 0) {
      return;
    }

    const file = event.target.files[0];
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUploadError('Please upload an image file (PNG, JPEG, etc.)');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File size must be less than 10MB');
      return;
    }

    setUploadingFile(true);
    setUploadError(null);

    try {
      const result = await verifyScreenTime(selectedChallengeId, walletAddress, file);
      
      if (result.verified) {
        setCheckedIn(true);
        setShowUploadModal(false);
        // Refresh participation data to update progress
        if (walletAddress) {
          await fetchData(walletAddress);
        }
        alert(result.message || 'Verification successful!');
      } else {
        setUploadError(result.message || 'Verification failed. Please check your screenshot and try again.');
      }
    } catch (error: any) {
      console.error('Error verifying screen time:', error);
      setUploadError(error.message || 'Failed to verify screen time. Please try again.');
    } finally {
      setUploadingFile(false);
      // Reset file input
      event.target.value = '';
    }
  };

  if (!walletAddress) {
    return (
      <div className="min-h-screen bg-[#050505] text-white pt-32 px-6 flex flex-col items-center justify-center text-center max-w-2xl mx-auto">
        <SectionLabel>Connect Your Wallet</SectionLabel>
        <h1 className="text-4xl font-light mb-6">Get Started</h1>
        <p className="text-gray-400 mb-6 leading-relaxed">
          To see your challenges and track your progress, you need to connect a wallet. 
          Think of it like logging into your account.
        </p>
        <div className="p-6 border border-white/10 bg-white/[0.02] rounded-xl text-left mb-8">
          <div className="flex items-start gap-3 text-sm text-gray-400">
            <InfoIcon content="Install the free Phantom wallet app (available for Chrome, iOS, or Android). It's like a digital wallet for your commitment money - completely free and takes 2 minutes to set up. Click 'Connect Wallet' in the top-right corner to get started." />
            <div>
              <p className="font-medium text-gray-300 mb-2">Don't have a wallet?</p>
              <p className="leading-relaxed mb-3">
                Install the free Phantom wallet app. Click "Connect Wallet" in the top-right corner to get started.
              </p>
            </div>
          </div>
        </div>
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
      <div className="min-h-screen bg-[#050505] text-white pt-32 px-6 text-center max-w-2xl mx-auto">
         <SectionLabel>No Active Challenges</SectionLabel>
         <h1 className="text-4xl font-light mb-6">Start Your Journey</h1>
         <p className="text-gray-400 mb-6 leading-relaxed">
           You haven't joined any challenges yet. Browse available challenges and find one that matches your goals.
         </p>
         <div className="p-6 border border-white/10 bg-white/[0.02] rounded-xl text-left mb-8">
           <div className="flex items-start gap-3 text-sm text-gray-400">
             <InfoIcon content="Browse challenges that interest you. Join one by putting down your stake (commitment money). Verify your progress daily. Complete the challenge and win money, or fail and lose your stake." />
             <div>
               <p className="font-medium text-gray-300 mb-2">How it works:</p>
               <ol className="list-decimal list-inside space-y-2 text-xs leading-relaxed">
                 <li>Browse challenges that interest you</li>
                 <li>Join one by putting down your stake (commitment money)</li>
                 <li>Verify your progress daily</li>
                 <li>Complete the challenge and win money, or fail and lose your stake</li>
               </ol>
             </div>
           </div>
         </div>
         <Link href="/pools" className="inline-flex items-center gap-2 px-6 py-3 border border-emerald-500 text-emerald-500 uppercase tracking-widest text-xs hover:bg-emerald-500 hover:text-white transition-colors">
            Browse Challenges <ArrowRight className="w-4 h-4" />
         </Link>
      </div>
    );
  }

  const activeChallenge = activeChallenges.find(c => c.id === selectedChallengeId) || activeChallenges[0];
  const progress = activeChallenge.progress ?? Math.floor((activeChallenge.streak / activeChallenge.totalDays) * 100);
  
  // Determine challenge type for current challenge
  const currentParticipation = participationsData.find(p => p.pool_id === selectedChallengeId);
  const isCryptoChallenge = currentParticipation && (
    currentParticipation.goal_type === 'hodl_token' || 
    currentParticipation.goal_type.includes('crypto') || 
    currentParticipation.goal_type.includes('Crypto')
  );
  const isGitHubChallenge = currentParticipation && 
    currentParticipation.goal_type === 'lifestyle_habit' && 
    currentParticipation.goal_metadata?.habit_type === 'github_commits';
  const isScreenTimeChallenge = currentParticipation && 
    currentParticipation.goal_type === 'lifestyle_habit' && 
    currentParticipation.goal_metadata?.habit_type === 'screen_time';

  return (
    <div className="min-h-screen bg-[#050505] text-white pt-32 px-6 pb-20">
      <div className="max-w-[1000px] mx-auto">
        
        {/* User Stats Section */}
        {userStats && (
          <div className="mb-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 border border-white/10 bg-white/[0.02] rounded-xl">
              <div className="text-xs uppercase tracking-widest text-gray-500 mb-2">Total Earned</div>
              <div className="text-3xl font-light text-emerald-400 mb-1">
                {userStats.totalEarned.toFixed(4)} SOL
              </div>
              <div className="text-[10px] text-gray-600">From completed challenges</div>
            </div>
            <div className="p-6 border border-white/10 bg-white/[0.02] rounded-xl">
              <div className="text-xs uppercase tracking-widest text-gray-500 mb-2">Total Staked</div>
              <div className="text-3xl font-light text-white mb-1">
                {userStats.totalStaked.toFixed(4)} SOL
              </div>
              <div className="text-[10px] text-gray-600">Across all challenges</div>
            </div>
            <div className="p-6 border border-white/10 bg-white/[0.02] rounded-xl">
              <div className="text-xs uppercase tracking-widest text-gray-500 mb-2">Successful Challenges</div>
              <div className="text-3xl font-light text-white mb-1">
                {userStats.successfulChallenges}
              </div>
              <div className="text-[10px] text-gray-600">Completed successfully</div>
            </div>
          </div>
        )}
        
        {/* Challenge Selector Dropdown */}
        <div className="mb-12 flex justify-center relative z-20">
            <div className="relative">
                <button 
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center gap-3 px-8 py-3 border border-white/10 rounded-full bg-white/[0.02] hover:border-white/30 transition-all min-w-[280px] justify-between"
                >
                    <div className="flex flex-col text-left">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[9px] text-gray-500 uppercase tracking-widest">Active Protocol</span>
                          <InfoIcon content="This is your current active challenge. Track your progress and see how you're doing compared to others." />
                        </div>
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
                                    setVerificationMessage(null);
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
                Day {activeChallenge.currentDay || activeChallenge.streak || 1} <span className="text-gray-600">/ {activeChallenge.totalDays}</span>
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
                    <div className="flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest text-gray-500 mb-2">
                      Days Completed
                      <InfoIcon content="Your current streak of consecutive successful verifications. Keep it going!" />
                    </div>
                    <div className="text-6xl font-light tracking-tighter text-white">{activeChallenge.streak}</div>
                 </div>
              </div>
           </div>

           {/* Right: Actions & Stats */}
           <div className="flex flex-col justify-center space-y-12">
              <div className="space-y-8">
                 <div className="border-l-2 border-emerald-500 pl-6">
                    <h3 className="text-xl font-light mb-2">{activeChallenge.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed mb-3">
                      {timeLeft
                        ? `You are on track. Next verification window closes in ${timeLeft}.`
                        : 'You are on track. Waiting for next verification window.'}
                    </p>
                    <div className="flex items-start gap-2 text-[10px] text-gray-600">
                      <InfoIcon content="You need to verify your progress every day. Missing a day means you're out of the challenge." />
                      <span>
                        You need to verify your progress every day. Missing a day means you're out of the challenge.
                      </span>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-8">
                    <div>
                    <Stat label="Staked" value={`${activeChallenge.stake} SOL`} />
                      <p className="text-[9px] text-gray-600 mt-2">Money you committed</p>
                    </div>
                    <div>
                    <Stat label="Projected" value={`+${activeChallenge.potentialWin.toFixed(2)} SOL`} />
                      <p className="text-[9px] text-gray-600 mt-2">Potential winnings</p>
                    </div>
                 </div>

                 {/* Participant Statistics */}
                 {participantStats && (
                    <div className="pt-6 border-t border-white/5">
                       <div className="flex items-center gap-2 mb-4">
                          <Users className="w-4 h-4 text-gray-500" />
                          <span className="text-xs uppercase tracking-widest text-gray-500">Challenge Stats</span>
                          <InfoIcon content="See how other participants are performing in this challenge. 'Started' shows total participants, 'Remaining' shows who's still in. Stay motivated!" />
                       </div>
                       <div className="grid grid-cols-2 gap-6">
                          <div className="flex flex-col">
                             <div className="text-2xl font-light text-white mb-1">{participantStats.started}</div>
                             <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Started</div>
                             <div className="text-[9px] text-gray-600">Total participants</div>
                          </div>
                          <div className="flex flex-col">
                             <div className="text-2xl font-light text-emerald-400 mb-1">{participantStats.remaining}</div>
                             <div className="text-[10px] uppercase tracking-wider text-gray-500 flex items-center gap-1 mb-1">
                                <TrendingDown className="w-3 h-3" />
                                Remaining
                             </div>
                             <div className="text-[9px] text-gray-600">Still in challenge</div>
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
                       <p className="text-[9px] text-gray-600 mt-2">
                         People who fail are eliminated. Their stake goes to the winners at the end.
                       </p>
                       </div>
                    </div>
                 )}
              </div>

              <div>
                 {!checkedIn ? (
                    <div>
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <button 
                           onClick={handleCheckIn}
                           disabled={verifying || isCryptoChallenge}
                           className={`flex-1 h-20 border uppercase tracking-widest text-xs font-medium transition-all flex items-center justify-center gap-4 group ${
                             isCryptoChallenge
                               ? 'border-white/10 bg-white/[0.02] text-gray-500 cursor-not-allowed'
                               : 'border-white/20 hover:border-emerald-500 hover:bg-emerald-500/5 text-white'
                           }`}
                        >
                           {verifying ? (
                              <span className="animate-pulse">Verifying...</span>
                           ) : isCryptoChallenge ? (
                              <>
                                 <span>Crypto Challenge - Auto-Verified</span>
                              </>
                           ) : isGitHubChallenge ? (
                              <>
                                 <span>Check GitHub Commits</span>
                                 <Smartphone strokeWidth={1} className="w-5 h-5 group-hover:-translate-y-1 transition-transform" />
                              </>
                           ) : isScreenTimeChallenge ? (
                              <>
                                 <span>Upload Screen Time</span>
                                 <Smartphone strokeWidth={1} className="w-5 h-5 group-hover:-translate-y-1 transition-transform" />
                              </>
                           ) : (
                              <>
                                 <span>Submit Daily Proof</span>
                                 <Smartphone strokeWidth={1} className="w-5 h-5 group-hover:-translate-y-1 transition-transform" />
                              </>
                           )}
                        </button>
                        <InfoIcon content={
                          isCryptoChallenge
                            ? "Crypto challenges are automatically verified on-chain. No manual verification needed."
                            : isGitHubChallenge
                            ? "Click to immediately check your GitHub commits for today. Our agent will verify your code."
                            : isScreenTimeChallenge
                            ? "Click to upload a screenshot of your mobile screen time data. Make sure the date is visible and matches today. Our AI will verify your screen time is below the limit."
                            : "Click here to submit your daily proof of progress. Our AI agent will verify it! Upload a photo, screenshot, or other proof that you completed your goal today."
                        } />
                      </div>
                      {verificationMessage ? (
                        <p className={`text-[9px] mt-2 text-center ${
                          checkedIn 
                            ? 'text-emerald-400' 
                            : 'text-red-400'
                        }`}>
                          {verificationMessage}
                        </p>
                      ) : (
                      <p className="text-[9px] text-gray-600 mt-2 text-center">
                        {isCryptoChallenge
                          ? "Crypto challenges are verified automatically on-chain"
                          : isGitHubChallenge
                          ? "We'll check your GitHub commits for today's code"
                          : isScreenTimeChallenge
                          ? "Upload a screenshot of your mobile screen time with today's date visible"
                          : "Upload proof that you completed your goal today (photo, screenshot, etc.)"}
                      </p>
                      )}
                    </div>
                 ) : (
                    <div>
                      {verificationMessage && (
                        <p className="text-[9px] mt-2 mb-2 text-center text-emerald-400">
                          {verificationMessage}
                        </p>
                      )}
                      <div className="w-full h-20 bg-white text-black flex items-center justify-center gap-3 uppercase tracking-widest text-xs font-medium">
                         <Check strokeWidth={1.5} className="w-5 h-5" />
                         Verified
                      </div>
                    </div>
                 )}
                 <div className="flex justify-between mt-4 text-[9px] text-gray-600 font-mono">
                    <span>Verified</span>
                    <div className="flex items-center gap-2">
                      <span>Status: Active</span>
                      {currentBlock && (
                        <InfoIcon content={`This shows the latest Solana blockchain block (#${currentBlock}) and the status of your last on-chain interaction. 'Confirmed' means your transaction was successfully processed.`} />
                      )}
                    </div>
                 </div>
              </div>

              <div className="pt-8 border-t border-white/5">
                 <div className="flex justify-between items-center mb-4">
                    <span className="text-xs uppercase tracking-widest text-gray-500">History</span>
                    <Link href="/pools" className="text-xs text-white hover:text-emerald-500">View All</Link>
                 </div>
                 {historyData.length > 0 ? (
                   <div className="space-y-3">
                     {historyData.slice(0, 5).map((item) => (
                       <div key={item.pool_id} className="flex justify-between items-center text-sm">
                         <div className="flex flex-col">
                           <span className="text-gray-300">{item.name}</span>
                           <span className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">
                             {item.participant_status === 'success' ? 'Completed' : 
                              item.participant_status === 'failed' ? 'Failed' : 
                              item.participant_status === 'forfeit' ? 'Forfeited' : 'Ended'}
                           </span>
                         </div>
                         <span className={`font-medium ${
                           item.earnings > 0 ? 'text-emerald-500' : 'text-red-400'
                         }`}>
                           {item.earnings > 0 ? '+' : ''}{item.earnings.toFixed(4)} SOL
                         </span>
                       </div>
                     ))}
                     {historyData.length > 5 && (
                       <div className="text-[10px] text-gray-500 text-center pt-2">
                         +{historyData.length - 5} more
                       </div>
                     )}
                   </div>
                 ) : (
                   <div className="text-sm text-gray-500 text-center py-4">
                     No completed challenges yet
                   </div>
                 )}
              </div>
           </div>
        </div>
      </div>

      {/* Screen Time Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6">
          <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-8 max-w-md w-full">
            <h2 className="text-2xl font-light mb-4">Upload Screen Time Screenshot</h2>
            <p className="text-sm text-gray-400 mb-6">
              Please upload a screenshot of your mobile screen time data. Make sure:
            </p>
            <ul className="text-sm text-gray-400 mb-6 space-y-2 list-disc list-inside">
              <li>The date is clearly visible and matches today</li>
              <li>The total screen time is visible</li>
              <li>The screenshot is clear and readable</li>
            </ul>
            
            <div className="mb-6">
              <label className="block mb-2 text-sm text-gray-300">
                Select Screenshot
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                disabled={uploadingFile}
                className="block w-full text-sm text-gray-400
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-emerald-500/20 file:text-emerald-400
                  hover:file:bg-emerald-500/30
                  file:cursor-pointer
                  disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {uploadError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-sm text-red-400">{uploadError}</p>
              </div>
            )}

            {uploadingFile && (
              <div className="mb-4 text-center">
                <div className="animate-pulse text-emerald-500 text-sm">Verifying screenshot...</div>
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadError(null);
                }}
                disabled={uploadingFile}
                className="flex-1 px-4 py-2 border border-white/10 rounded-lg text-sm text-gray-400 hover:border-white/20 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
