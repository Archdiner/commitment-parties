'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronDown, Check, Smartphone, ArrowRight, Users, TrendingDown, X } from 'lucide-react';
import { InfoIcon } from '@/components/ui/Tooltip';
import { getUserParticipations, UserParticipation, getPoolStats, getParticipantVerifications, triggerGitHubVerification, verifyScreenTime, buildForfeitPoolTransaction, confirmPoolForfeit } from '@/lib/api';
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
  const [timeLeftLabel, setTimeLeftLabel] = useState<string>('Next verification window closes in');
  const [currentBlock, setCurrentBlock] = useState<number | null>(null);
  const [forfeiting, setForfeiting] = useState(false);
  const [showForfeitConfirm, setShowForfeitConfirm] = useState(false);
  const [showLossNotification, setShowLossNotification] = useState(false);
  const [lostChallenges, setLostChallenges] = useState<Array<{pool_id: number; name: string}>>([]);
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
      // Active = pool is still running (status='active' or 'pending'), regardless of participant status
      // Completed = pool has ended (status='ended' or 'settled')
      const active = participations.filter(p => 
        p.status === 'active' || p.status === 'pending'
      );
      
      const completed = participations.filter(p => 
        p.status === 'ended' || 
        p.status === 'settled'
      );
      
      // Check for newly lost challenges (failed/forfeit but pool still active)
      // Show notification if user has lost challenges they haven't been notified about
      const lostButActive = active.filter(p => 
        (p.participant_status === 'failed' || p.participant_status === 'forfeit') &&
        p.status === 'active'
      );
      
      // Check localStorage to see if we've already notified about these challenges
      const notifiedKey = `notified_losses_${address}`;
      const previouslyNotified = JSON.parse(localStorage.getItem(notifiedKey) || '[]');
      const newlyLost = lostButActive.filter(p => 
        !previouslyNotified.includes(p.pool_id)
      );
      
      if (newlyLost.length > 0) {
        setLostChallenges(newlyLost.map(p => ({ pool_id: p.pool_id, name: p.name })));
        setShowLossNotification(true);
        // Mark as notified
        const updatedNotified = [...previouslyNotified, ...newlyLost.map(p => p.pool_id)];
        localStorage.setItem(notifiedKey, JSON.stringify(updatedNotified));
      }
      
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
      
      // Map API data to UI format (all active challenges, including failed ones)
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
          status: p.status === 'active' ? 'ACTIVE' : (p.status === 'pending' ? 'PENDING' : p.status.toUpperCase()),
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
          participantStatus: p.participant_status, // Include participant status
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

  // Load countdown - either "time until challenge starts" or "next verification window closes"
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    const loadCountdown = async () => {
      if (!walletAddress || !selectedChallengeId) {
        setTimeLeft(null);
        setTimeLeftLabel('Next verification window closes in');
        return;
      }
      
      // Find the participation data for this challenge
      const participation = participationsData.find(p => p.pool_id === selectedChallengeId);
      if (!participation) {
        setTimeLeft(null);
        setTimeLeftLabel('Next verification window closes in');
        return;
      }

      const poolStatus = participation.status;
      const startTimestamp = participation.start_timestamp;

      // If challenge is pending (recruiting phase), show countdown to start
      if (poolStatus === 'pending') {
        const update = () => {
          const now = Math.floor(Date.now() / 1000);
          const diff = startTimestamp - now;
          if (diff <= 0) {
            setTimeLeft('Starting soon...');
            setTimeLeftLabel('Challenge starts in');
            return;
          }
          const days = Math.floor(diff / 86400);
          const hours = Math.floor((diff % 86400) / 3600);
          const minutes = Math.floor((diff % 3600) / 60);
          
          if (days > 0) {
            setTimeLeft(`${days}d ${hours}h`);
          } else if (hours > 0) {
            setTimeLeft(`${hours}h ${minutes}m`);
          } else {
            setTimeLeft(`${minutes}m`);
          }
          setTimeLeftLabel('Challenge starts in');
        };
        update();
        intervalId = setInterval(update, 60_000);
        return;
      }

      // If challenge is active, show verification window countdown
      if (poolStatus === 'active') {
        try {
          const status = await getParticipantVerifications(selectedChallengeId, walletAddress);
          if (!status.next_window_end) {
            setTimeLeft(null);
            setTimeLeftLabel('Next verification window closes in');
            return;
          }
          const update = () => {
            const now = Math.floor(Date.now() / 1000);
            const diff = status.next_window_end! - now;
            if (diff <= 0) {
              setTimeLeft('0 minutes');
              setTimeLeftLabel('Next verification window closes in');
              return;
            }
            const hours = Math.floor(diff / 3600);
            const minutes = Math.floor((diff % 3600) / 60);
            if (hours > 0) {
              setTimeLeft(`${hours}h ${minutes}m`);
            } else {
              setTimeLeft(`${minutes}m`);
            }
            setTimeLeftLabel('Next verification window closes in');
          };
          update();
          intervalId = setInterval(update, 60_000);
        } catch (e) {
          console.error('Failed to load verification window:', e);
          setTimeLeft(null);
          setTimeLeftLabel('Next verification window closes in');
        }
        return;
      }

      // For other statuses, clear countdown
      setTimeLeft(null);
      setTimeLeftLabel('Next verification window closes in');
    };

    loadCountdown();

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [walletAddress, selectedChallengeId, participationsData]);

  const handleCheckIn = async () => {
    if (!walletAddress || !selectedChallengeId) return;
    
    // Find the current participation data
    const participation = participationsData.find(p => p.pool_id === selectedChallengeId);
    if (!participation) return;
    
    // Check if participant has failed - prevent interaction
    if (participation.participant_status === 'failed' || participation.participant_status === 'forfeit') {
      setVerificationMessage('You have failed this challenge and can no longer participate.');
      return;
    }
    
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

  const handleForfeit = async () => {
    if (!walletAddress || !selectedChallengeId) return;
    
    // Find the current participation data
    const participation = participationsData.find(p => p.pool_id === selectedChallengeId);
    if (!participation) return;
    
    // Check if participant has already failed/forfeited
    if (participation.participant_status === 'failed' || participation.participant_status === 'forfeit') {
      setVerificationMessage('You have already forfeited or failed this challenge.');
      return;
    }
    
    setForfeiting(true);
    setVerificationMessage(null);
    
    try {
      // Build forfeit transaction
      const { transaction: txB64 } = await buildForfeitPoolTransaction(selectedChallengeId, walletAddress);
      
      // Get wallet provider
      const anyWindow = window as any;
      const provider = 
        (anyWindow.phantom && anyWindow.phantom.solana) ||
        anyWindow.solana ||
        null;
      
      if (!provider) {
        alert('Please install Phantom Wallet to forfeit this challenge.');
        setForfeiting(false);
        return;
      }
      
      if (!provider.publicKey) {
        await provider.connect();
      }
      
      const connection = getConnection();
      const { Transaction } = await import('@solana/web3.js');
      const tx = Transaction.from(Buffer.from(txB64, 'base64'));
      
      // Send transaction
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
      
      // Confirm forfeit with backend
      await confirmPoolForfeit(selectedChallengeId, {
        transaction_signature: signature,
        participant_wallet: walletAddress,
      });
      
      setVerificationMessage('Challenge forfeited. You have lost your stake.');
      setShowForfeitConfirm(false);
      
      // Refresh participation data
      if (walletAddress) {
        await fetchData(walletAddress);
      }
    } catch (error: any) {
      console.error('Error forfeiting challenge:', error);
      setVerificationMessage(error.message || 'Failed to forfeit challenge. Please try again.');
    } finally {
      setForfeiting(false);
    }
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
  const progress = activeChallenge 
    ? (activeChallenge.progress ?? Math.floor((activeChallenge.streak / activeChallenge.totalDays) * 100))
    : 0;
  
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
  const hasFailed = currentParticipation && (
    currentParticipation.participant_status === 'failed' || 
    currentParticipation.participant_status === 'forfeit'
  );
  const hasWon = currentParticipation && currentParticipation.participant_status === 'success';

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
                        <span className="text-xs font-medium uppercase tracking-widest text-white">{activeChallenge?.title || 'No Challenge Selected'}</span>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-emerald-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {isDropdownOpen && (
                    <div className="absolute top-full left-0 w-full mt-2 bg-[#0A0A0A] border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-30">
                        {activeChallenges.map(challenge => {
                        const challengeParticipation = participationsData.find(p => p.pool_id === challenge.id);
                        const isFailed = challengeParticipation && (
                          challengeParticipation.participant_status === 'failed' || 
                          challengeParticipation.participant_status === 'forfeit'
                        );
                        const isWon = challengeParticipation && challengeParticipation.participant_status === 'success';
                        
                        return (
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
                                    selectedChallengeId === challenge.id 
                                      ? 'text-white bg-white/[0.02]' 
                                      : isFailed 
                                      ? 'text-red-400' 
                                      : isWon
                                      ? 'text-emerald-400'
                                      : 'text-gray-500'
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                  <span>{challenge.title}</span>
                                  {isFailed && <span className="text-[8px] text-red-400">(Lost)</span>}
                                  {isWon && <span className="text-[8px] text-emerald-400">(Won)</span>}
                                </div>
                                {selectedChallengeId === challenge.id && (
                                  <div className={`w-1.5 h-1.5 rounded-full ${
                                    isFailed ? 'bg-red-500' : isWon ? 'bg-emerald-500' : 'bg-emerald-500'
                                  }`} />
                                )}
                            </button>
                        );
                    })}
                    </div>
                )}
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center min-h-[60vh] animate-in fade-in slide-in-from-bottom-4 duration-500" key={activeChallenge.id}>
           
           {/* Left: Progress Visualization */}
           <div className="flex flex-col items-center md:items-start">
              <SectionLabel>
                {hasFailed ? 'Challenge Lost' : hasWon ? 'Challenge Won' : 'Active Protocol'}
              </SectionLabel>
              <h1 className="text-4xl font-light mb-12 text-center md:text-left">
                {hasFailed ? (
                  <span className="text-red-400">Challenge Failed</span>
                ) : hasWon ? (
                  <span className="text-emerald-400">Challenge Won!</span>
                ) : (
                  <>
                    Day {activeChallenge?.currentDay || activeChallenge?.streak || 1} <span className="text-gray-600">/ {activeChallenge?.totalDays || 1}</span>
                  </>
                )}
              </h1>
              
              <div className={`relative w-72 h-72 md:w-96 md:h-96 border rounded-full flex items-center justify-center p-8 ${
                hasFailed ? 'border-red-500/30' : hasWon ? 'border-emerald-500/30' : 'border-white/10'
              }`}>
                 {/* Thin subtle track */}
                 <div className={`absolute inset-0 rounded-full border scale-90 ${
                   hasFailed ? 'border-red-500/10' : hasWon ? 'border-emerald-500/10' : 'border-white/5'
                 }`} />
                 
                 {/* Spinner visual - only show if not failed/won */}
                 {!hasFailed && !hasWon && (
                   <div 
                      className="absolute inset-0 rounded-full border-2 border-transparent border-t-emerald-500 transition-all duration-1000 ease-out" 
                      style={{ transform: `rotate(${progress * 3.6}deg)` }}
                   />
                 )}
                 
                 {/* Failed/Won overlay */}
                 {(hasFailed || hasWon) && (
                   <div className={`absolute inset-0 rounded-full ${
                     hasFailed ? 'bg-red-500/5' : 'bg-emerald-500/5'
                   }`} />
                 )}
                 
                 <div className="text-center">
                    <div className="flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest text-gray-500 mb-2">
                      {hasFailed ? 'Challenge Status' : hasWon ? 'Final Result' : 'Days Completed'}
                      {!hasFailed && !hasWon && (
                        <InfoIcon content="Your current streak of consecutive successful verifications. Keep it going!" />
                      )}
                    </div>
                    {hasFailed ? (
                      <div className="text-6xl font-light tracking-tighter text-red-400">Lost</div>
                    ) : hasWon ? (
                      <div className="text-6xl font-light tracking-tighter text-emerald-400">Won!</div>
                    ) : (
                      <div className="text-6xl font-light tracking-tighter text-white">{activeChallenge?.streak || 0}</div>
                    )}
                 </div>
              </div>
           </div>

           {/* Right: Actions & Stats */}
           <div className="flex flex-col justify-center space-y-12">
              <div className="space-y-8">
                 <div className={`border-l-2 pl-6 ${
                   hasFailed ? 'border-red-500' : hasWon ? 'border-emerald-500' : 'border-emerald-500'
                 }`}>
                    <h3 className="text-xl font-light mb-2">{activeChallenge?.title || 'Challenge'}</h3>
                    {hasFailed ? (
                      <div>
                        <p className="text-sm text-red-400 leading-relaxed mb-3">
                          You have lost this challenge. The challenge will continue until it ends, but you are no longer participating.
                        </p>
                        <div className="flex items-start gap-2 text-[10px] text-gray-600">
                          <InfoIcon content="You failed to meet the challenge requirements. Your stake will be distributed to winners when the challenge ends." />
                          <span>
                            You failed to meet the challenge requirements. Your stake will be distributed to winners when the challenge ends.
                          </span>
                        </div>
                      </div>
                    ) : hasWon ? (
                      <div>
                        <p className="text-sm text-emerald-400 leading-relaxed mb-3">
                          Congratulations! You've completed this challenge. The challenge will continue until it ends, then rewards will be distributed.
                        </p>
                        <div className="flex items-start gap-2 text-[10px] text-gray-600">
                          <InfoIcon content="You successfully completed all days of the challenge. You'll receive your share of the prize pool when the challenge ends." />
                          <span>
                            You successfully completed all days of the challenge. You'll receive your share of the prize pool when the challenge ends.
                          </span>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-gray-500 leading-relaxed mb-3">
                          {timeLeft ? (
                            <>
                              {activeChallenge?.status === 'PENDING' || activeChallenge?.status === 'pending' ? (
                                <>Challenge is recruiting. {timeLeftLabel} {timeLeft}.</>
                              ) : (
                                <>You are on track. {timeLeftLabel} {timeLeft}.</>
                              )}
                            </>
                          ) : (
                            activeChallenge?.status === 'PENDING' || activeChallenge?.status === 'pending' 
                              ? 'Challenge is recruiting. Waiting for challenge to start.'
                              : 'You are on track. Waiting for next verification window.'
                          )}
                        </p>
                        <div className="flex items-start gap-2 text-[10px] text-gray-600">
                          <InfoIcon content={
                            activeChallenge?.status === 'PENDING' || activeChallenge?.status === 'pending'
                              ? "The challenge is still in the recruiting phase. Once it starts, you'll need to verify your progress every day."
                              : "You need to verify your progress every day. Missing a day means you're out of the challenge."
                          } />
                          <span>
                            {activeChallenge?.status === 'PENDING' || activeChallenge?.status === 'pending'
                              ? "The challenge is still in the recruiting phase. Once it starts, you'll need to verify your progress every day."
                              : "You need to verify your progress every day. Missing a day means you're out of the challenge."
                            }
                          </span>
                        </div>
                      </>
                    )}
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
                           disabled={verifying || isCryptoChallenge || hasFailed}
                           className={`flex-1 h-20 border uppercase tracking-widest text-xs font-medium transition-all flex items-center justify-center gap-4 group ${
                             hasFailed || isCryptoChallenge
                               ? 'border-white/10 bg-white/[0.02] text-gray-500 cursor-not-allowed'
                               : 'border-white/20 hover:border-emerald-500 hover:bg-emerald-500/5 text-white'
                           }`}
                        >
                           {verifying ? (
                              <span className="animate-pulse">Verifying...</span>
                           ) : hasFailed ? (
                              <>
                                 <span>Challenge Failed - No Longer Active</span>
                              </>
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
                            ? "Click to upload a screenshot of your mobile screen time data. Make sure the date is visible (showing 'Today' or today's date). Our AI will verify your screen time is below the limit."
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
                          ? "Upload a screenshot of your mobile screen time (showing 'Today' or today's date)"
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
                      <span>Status: {hasFailed ? 'Failed' : 'Active'}</span>
                      {currentBlock && (
                        <InfoIcon content={`This shows the latest Solana blockchain block (#${currentBlock}) and the status of your last on-chain interaction. 'Confirmed' means your transaction was successfully processed.`} />
                      )}
                    </div>
                 </div>
                 
                 {/* Forfeit Button - Only show if active and not failed */}
                 {!hasFailed && currentParticipation && currentParticipation.participant_status === 'active' && (
                   <div className="mt-6 pt-6 border-t border-white/5">
                     <button
                       onClick={() => setShowForfeitConfirm(true)}
                       disabled={forfeiting}
                       className="w-full px-4 py-3 border border-red-500/30 text-red-400 uppercase tracking-widest text-xs font-medium hover:bg-red-500/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                     >
                       <X className="w-4 h-4" />
                       {forfeiting ? 'Forfeiting...' : 'Forfeit Challenge'}
                     </button>
                     <p className="text-[9px] text-gray-600 mt-2 text-center">
                       Forfeiting will immediately end your participation and you will lose your stake
                     </p>
                   </div>
                 )}
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
              <li>The date is clearly visible (showing "Today" or today's date is acceptable)</li>
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

      {/* Loss Notification Modal */}
      {showLossNotification && lostChallenges.length > 0 && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6">
          <div className="bg-[#0A0A0A] border border-red-500/30 rounded-2xl p-8 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                <X className="w-6 h-6 text-red-400" />
              </div>
              <h2 className="text-2xl font-light text-red-400">Challenge Lost</h2>
            </div>
            <p className="text-sm text-gray-400 mb-4">
              {lostChallenges.length === 1 
                ? `You have lost the challenge "${lostChallenges[0].name}".`
                : `You have lost ${lostChallenges.length} challenges.`
              }
            </p>
            {lostChallenges.length > 1 && (
              <ul className="list-disc list-inside text-sm text-gray-400 mb-4 space-y-1">
                {lostChallenges.map(c => (
                  <li key={c.pool_id}>{c.name}</li>
                ))}
              </ul>
            )}
            <p className="text-sm text-gray-500 mb-6">
              The challenge will continue until it ends. Your stake will be distributed to winners when the challenge concludes.
            </p>
            <button
              onClick={() => setShowLossNotification(false)}
              className="w-full px-4 py-2 bg-red-500/20 border border-red-500 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/30 transition-colors"
            >
              I Understand
            </button>
          </div>
        </div>
      )}

      {/* Forfeit Confirmation Modal */}
      {showForfeitConfirm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6">
          <div className="bg-[#0A0A0A] border border-red-500/30 rounded-2xl p-8 max-w-md w-full">
            <h2 className="text-2xl font-light mb-4 text-red-400">Forfeit Challenge?</h2>
            <p className="text-sm text-gray-400 mb-6">
              Are you sure you want to forfeit this challenge? This action cannot be undone.
            </p>
            <div className="p-4 border border-red-500/20 bg-red-500/5 rounded-lg mb-6">
              <p className="text-sm text-red-400 font-medium mb-2">You will lose:</p>
              <p className="text-lg text-white">
                {currentParticipation?.stake_amount || 0} SOL
              </p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setShowForfeitConfirm(false)}
                disabled={forfeiting}
                className="flex-1 px-4 py-2 border border-white/10 rounded-lg text-sm text-gray-400 hover:border-white/20 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleForfeit}
                disabled={forfeiting}
                className="flex-1 px-4 py-2 bg-red-500/20 border border-red-500 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/30 transition-colors disabled:opacity-50"
              >
                {forfeiting ? 'Forfeiting...' : 'Yes, Forfeit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
