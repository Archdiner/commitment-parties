'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, Zap } from 'lucide-react';
import { ButtonPrimary } from '@/components/ui/ButtonPrimary';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { InfoIcon } from '@/components/ui/Tooltip';
import { confirmPoolCreation } from '@/lib/api';
import { getPersistedWalletAddress } from '@/lib/wallet';
import { derivePoolPDA, getConnection, solToLamports, buildCreatePoolInstruction, signAndSendTransaction } from '@/lib/solana';

export default function CreatePool() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    type: 'Lifestyle (Photo/GPS)',
    duration: '14 Days',
    customDuration: '',
    stake: '0.5',
    maxParticipants: '100'
  });
  const [useCustomDuration, setUseCustomDuration] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, boolean>>({});
  const [showValidationError, setShowValidationError] = useState(false);

  useEffect(() => {
    // Initial load from persisted storage
    const address = getPersistedWalletAddress();
    setWalletAddress(address);

    // Also listen for storage changes so connecting in Navbar while this
    // page is open will update the local state.
    if (typeof window !== 'undefined') {
      const handleStorage = () => {
        const updated = getPersistedWalletAddress();
        setWalletAddress(updated);
      };
      window.addEventListener('storage', handleStorage);
      return () => window.removeEventListener('storage', handleStorage);
    }
  }, []);

  const validateForm = (): boolean => {
    const errors: Record<string, boolean> = {};
    
    // Validate name
    if (!formData.name || formData.name.trim() === '') {
      errors.name = true;
    }
    
    // Validate duration
    if (useCustomDuration) {
      const customDays = parseInt(formData.customDuration);
      if (isNaN(customDays) || customDays <= 0) {
        errors.customDuration = true;
      }
    }
    
    // Validate stake
    const stakeAmount = parseFloat(formData.stake);
    if (isNaN(stakeAmount) || stakeAmount <= 0) {
      errors.stake = true;
    }
    
    // Validate max participants
    const maxParticipants = parseInt(formData.maxParticipants);
    if (isNaN(maxParticipants) || maxParticipants <= 0) {
      errors.maxParticipants = true;
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleDeploy = async () => {
    // Always read latest wallet from storage (Navbar may have updated it)
    const currentWallet = getPersistedWalletAddress();
    if (!currentWallet) {
        alert("Please connect your wallet first (top right).");
        return;
    }
    
    // Validate form first
    if (!validateForm()) {
      setShowValidationError(true);
      // Scroll to top to show error message
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    
    setShowValidationError(false);
    setLoading(true);
    try {
        const durationDays = useCustomDuration 
          ? parseInt(formData.customDuration) 
          : parseInt(formData.duration.split(' ')[0]);
        
        const stakeAmount = parseFloat(formData.stake);
        const maxParticipants = parseInt(formData.maxParticipants);

        // Additional validation aligned with backend constraints
        if (durationDays < 1 || durationDays > 30) {
          alert("Duration must be between 1 and 30 days.");
          setLoading(false);
          return;
        }
        if (maxParticipants < 1 || maxParticipants > 100) {
          alert("Max participants must be between 1 and 100.");
          setLoading(false);
          return;
        }

        // Determine Goal Type metadata
        let goalType = 'lifestyle_habit';
        let goalMetadata: Record<string, any> = {};
        let goalParamsForOnchain: Record<string, any> = {};
        if (formData.type.includes('Crypto')) {
            goalType = 'hodl_token';
            goalMetadata = { token_mint: 'So11111111111111111111111111111111111111112', min_balance: 1000000000 };
            goalParamsForOnchain = { token_mint: goalMetadata.token_mint, min_balance: goalMetadata.min_balance };
        } else if (formData.type.includes('Developer')) {
            goalType = 'lifestyle_habit';
            goalMetadata = { habit_type: 'github_commits', min_commits_per_day: 1 };
            goalParamsForOnchain = { habit_name: 'GitHub Commits' };
        } else {
            // Lifestyle
            goalType = 'lifestyle_habit';
            goalMetadata = { habit_type: 'screen_time', max_hours: 2 };
            goalParamsForOnchain = { habit_name: 'Lifestyle Habit' };
        }

        // Pool ID and PDA (on-chain identity)
        const randomId = Math.floor(Math.random() * 1_000_000);
        const [poolPDA] = await derivePoolPDA(randomId);
        const poolPubkey = poolPDA.toBase58();
        
        // Timestamps
        const now = Math.floor(Date.now() / 1000);
        const end = now + (durationDays * 86400);

        // --- On-chain: build and send create_pool transaction ---
        const connection = getConnection();

        // Phantom / Solana provider
        const anyWindow = typeof window !== 'undefined' ? (window as any) : null;
        const provider =
          (anyWindow?.phantom && anyWindow.phantom.solana) ||
          anyWindow?.solana ||
          null;

        if (!provider) {
          alert("Wallet provider not available. Please install or open your Solana wallet and try again.");
          setLoading(false);
          return;
        }

        // Ensure wallet is connected and we have a public key
        if (!provider.publicKey) {
          await provider.connect();
        }

        const creatorPubkey = provider.publicKey;
        const stakeLamports = solToLamports(stakeAmount);
        const minParticipants = 1;
        // Use a valid base58 charity address (configurable via env, fallback to system program ID)
        const charityAddress =
          process.env.NEXT_PUBLIC_CHARITY_ADDRESS || '11111111111111111111111111111111';
        const distributionMode = 'competitive';
        const winnerPercent = 100;

        const createIx = await buildCreatePoolInstruction(
          randomId,
          creatorPubkey,
          goalType,
          goalParamsForOnchain,
          stakeLamports,
          durationDays,
          maxParticipants,
          minParticipants,
          charityAddress,
          distributionMode,
          winnerPercent
        );

        const txSignature = await signAndSendTransaction(
          connection,
          createIx,
          provider
        );

        // --- Backend: confirm pool creation with transaction_signature ---
        const recruitment_period_hours = 24;
        const require_min_participants = false;
        const grace_period_minutes = 5;

        await confirmPoolCreation({
            pool_id: randomId,
          pool_pubkey: poolPubkey,
          transaction_signature: txSignature,
          creator_wallet: currentWallet,
            name: formData.name || "Untitled Challenge",
            description: `A ${formData.type} challenge for ${durationDays} days.`,
            goal_type: goalType,
            goal_metadata: goalMetadata,
            stake_amount: stakeAmount,
            duration_days: durationDays,
            max_participants: maxParticipants,
          min_participants: 1,
          distribution_mode: 'competitive',
          split_percentage_winners: 100,
          charity_address: charityAddress,
            start_timestamp: now,
            end_timestamp: end,
            is_public: true,
          recruitment_period_hours,
          require_min_participants,
          grace_period_minutes,
        });
        
        // Success
        router.push('/pools');
        
    } catch (error: any) {
        console.error('Pool creation error:', error);
        let errorMessage = "Failed to create pool.";
        
        // Extract detailed error information
        if (error?.data?.detail) {
          errorMessage = error.data.detail;
        } else if (error?.data?.error) {
          errorMessage = error.data.error;
        } else if (error?.message) {
          errorMessage = error.message;
        } else if (error?.detail) {
          errorMessage = error.detail;
        } else if (error?.name === 'ApiError') {
          errorMessage = error.message || "Backend API error. Make sure the backend server is running.";
        } else if (error?.code === 4001) {
          errorMessage = "Transaction was rejected by user.";
        } else if (error?.code === -32002) {
          errorMessage = "Transaction already pending. Please check your wallet.";
        }
        
        // Show full error details in console
        console.error('Full error details:', {
          error,
          status: error?.status,
          data: error?.data,
          message: error?.message
        });
        
        alert(`Error: ${errorMessage}\n\nStatus: ${error?.status || 'Unknown'}\n\nCheck the browser console for more details.`);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white pt-24 px-6 pb-20">
      <div className="max-w-2xl mx-auto">
         <Link href="/pools" className="flex items-center gap-2 text-gray-500 hover:text-white mb-8 text-xs uppercase tracking-widest transition-colors">
            <ChevronRight className="w-3 h-3 rotate-180" /> Cancel
         </Link>
         
         <div className="mb-12">
           <h1 className="text-4xl font-light mb-4">Create Your Challenge</h1>
           <p className="text-sm text-gray-500 leading-relaxed max-w-2xl">
             Set up a commitment challenge where you and others put money on the line. 
             Complete your goal and win money. Fail and lose your stake.
           </p>
         </div>
         
         <div className="space-y-12">
            {/* Section 1 */}
            <div className="space-y-6">
               <SectionLabel>Core Parameters</SectionLabel>
               <div>
                  <label className="flex items-center gap-2 text-xs uppercase tracking-widest text-gray-500 mb-2">
                    Challenge Name
                    <InfoIcon content="Give your challenge a clear name so others know what they're committing to." />
                  </label>
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({...formData, name: e.target.value});
                      if (validationErrors.name) {
                        setValidationErrors({...validationErrors, name: false});
                      }
                    }}
                    className={`w-full bg-transparent border-b py-3 text-xl text-white placeholder-gray-800 focus:outline-none transition-colors ${
                      validationErrors.name 
                        ? 'border-red-500 focus:border-red-500' 
                        : 'border-white/20 focus:border-emerald-500'
                    }`}
                    placeholder="e.g. 100 Days of Code" 
                  />
               </div>
               <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="flex items-center gap-2 text-xs uppercase tracking-widest text-gray-500 mb-2">
                      Type
                      <InfoIcon content="Choose how your goal will be verified: Lifestyle (photos/check-ins), Crypto (automatic wallet tracking), or Developer (GitHub commits)." />
                    </label>
                    <select 
                        value={formData.type}
                        onChange={(e) => setFormData({...formData, type: e.target.value})}
                        className="w-full bg-[#0A0A0A] border border-white/10 py-3 px-4 text-sm text-white focus:outline-none"
                    >
                       <option>Lifestyle (Photo/GPS)</option>
                       <option>Crypto (On-Chain)</option>
                       <option>Developer (GitHub)</option>
                    </select>
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-xs uppercase tracking-widest text-gray-500 mb-2">
                      Duration
                      <InfoIcon content="How long your challenge will last. You must verify your progress every day during this period." />
                    </label>
                    {!useCustomDuration ? (
                    <select 
                        value={formData.duration}
                          onChange={(e) => {
                            if (e.target.value === 'Custom') {
                              setUseCustomDuration(true);
                            } else {
                              setFormData({...formData, duration: e.target.value});
                            }
                          }}
                        className="w-full bg-[#0A0A0A] border border-white/10 py-3 px-4 text-sm text-white focus:outline-none"
                    >
                       <option>7 Days</option>
                       <option>14 Days</option>
                       <option>30 Days</option>
                         <option>Custom</option>
                    </select>
                    ) : (
                      <div className="flex gap-2">
                        <input 
                          type="number" 
                          value={formData.customDuration}
                          onChange={(e) => {
                            setFormData({...formData, customDuration: e.target.value});
                            if (validationErrors.customDuration) {
                              setValidationErrors({...validationErrors, customDuration: false});
                            }
                          }}
                          className={`flex-1 bg-transparent border-b py-3 text-xl text-white placeholder-gray-800 focus:outline-none transition-colors ${
                            validationErrors.customDuration 
                              ? 'border-red-500 focus:border-red-500' 
                              : 'border-white/20 focus:border-emerald-500'
                          }`}
                          placeholder="Enter days" 
                          min="1"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setUseCustomDuration(false);
                            setFormData({...formData, customDuration: ''});
                          }}
                          className="px-4 py-3 text-xs uppercase tracking-widest text-gray-500 hover:text-white border border-white/10 hover:border-white/30 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
               </div>
            </div>

            {/* Section 2 */}
            <div className="space-y-6">
               <SectionLabel>Money & Participants</SectionLabel>
               <div>
                  <label className="flex items-center gap-2 text-xs uppercase tracking-widest text-gray-500 mb-2">
                    Stake Amount (SOL)
                    <InfoIcon content="This is the amount of money each person must put down to join. This money is locked until the challenge ends. If you complete your goal, you can win more. If you fail, you lose this amount." />
                  </label>
                  <input 
                    type="number" 
                    value={formData.stake}
                    onChange={(e) => {
                      setFormData({...formData, stake: e.target.value});
                      if (validationErrors.stake) {
                        setValidationErrors({...validationErrors, stake: false});
                      }
                    }}
                    className={`w-full bg-transparent border-b py-3 text-xl text-white placeholder-gray-800 focus:outline-none transition-colors ${
                      validationErrors.stake 
                        ? 'border-red-500 focus:border-red-500' 
                        : 'border-white/20 focus:border-emerald-500'
                    }`}
                    placeholder="0.5" 
                  />
               </div>
               <div>
                  <label className="flex items-center gap-2 text-xs uppercase tracking-widest text-gray-500 mb-2">
                    Max Participants
                    <InfoIcon content="Maximum number of people who can join this challenge. More participants = bigger prize pool for winners." />
                  </label>
                  <input 
                    type="number" 
                    value={formData.maxParticipants}
                    onChange={(e) => {
                      setFormData({...formData, maxParticipants: e.target.value});
                      if (validationErrors.maxParticipants) {
                        setValidationErrors({...validationErrors, maxParticipants: false});
                      }
                    }}
                    className={`w-full bg-transparent border-b py-3 text-xl text-white placeholder-gray-800 focus:outline-none transition-colors ${
                      validationErrors.maxParticipants 
                        ? 'border-red-500 focus:border-red-500' 
                        : 'border-white/20 focus:border-emerald-500'
                    }`}
                    placeholder="100" 
                  />
               </div>
            </div>

            {/* Section 3 */}
            <div className="space-y-6">
               <SectionLabel>How Verification Works</SectionLabel>
               <div className="p-6 border border-white/10 bg-white/[0.01]">
                  <div className="flex items-start gap-4">
                     <Zap className="w-5 h-5 text-emerald-500 mt-1" />
                     <div>
                        <div className="flex items-start gap-2">
                          <h4 className="text-sm font-medium text-white mb-1">How Verification Works</h4>
                          <InfoIcon content="Our system automatically checks if you're meeting your goal each day. For lifestyle challenges, you'll upload photos as proof. For crypto challenges, we check your wallet automatically. You'll need to verify daily - missing a day means you're out of the challenge." />
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed">
                           Automatic daily verification. Upload photos for lifestyle challenges, or we check your wallet for crypto challenges.
                        </p>
                     </div>
                  </div>
               </div>
            </div>

            <div className="pt-8 border-t border-white/10">
               {showValidationError && (
                 <div className="mb-6 p-4 border border-red-500/50 bg-red-500/10 rounded-lg">
                   <div className="flex items-start gap-3 text-xs text-red-400">
                     <div className="flex-1">
                       <p className="font-medium mb-1 text-red-300">Please fill in all required fields</p>
                       <p className="text-red-400/80 leading-relaxed">
                         All fields are required. Please check the highlighted fields above and fill them in before creating your challenge.
                       </p>
                     </div>
                   </div>
                 </div>
               )}
               {!walletAddress && (
                 <div className="mb-6 p-4 border border-amber-500/30 bg-amber-500/5 rounded-lg">
                   <div className="flex items-start gap-3 text-xs text-amber-400">
                     <InfoIcon content="You need to connect a wallet (like Phantom) in the top-right corner before creating a challenge. This is like connecting your bank account - it's where your commitment money comes from." />
                     <div>
                       <p className="font-medium mb-1">Connect Your Wallet First</p>
                       <p className="text-amber-300/80 leading-relaxed">
                         Click "Connect Wallet" in the top-right corner to get started.
                       </p>
                     </div>
                   </div>
                 </div>
               )}
               <div className="flex items-center justify-center gap-2 mb-4">
                 <ButtonPrimary 
                   className="w-full" 
                   onClick={handleDeploy}
                   disabled={loading || !walletAddress}
                 >
                   {loading ? <span className="animate-pulse">Creating Challenge...</span> : "Create Challenge"}
                 </ButtonPrimary>
                 <InfoIcon content="Creating a challenge costs a small fee (about 0.001-0.002 SOL, roughly $0.10-$0.40) to cover blockchain transaction fees and account creation. This is separate from the stake amount participants will pay." />
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}
