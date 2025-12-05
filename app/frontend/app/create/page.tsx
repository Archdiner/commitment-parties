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
import { derivePoolPDA, getConnection, solToLamports } from '@/lib/solana';
import { Transaction } from '@solana/web3.js';

export default function CreatePool() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    descriptionText: '',
    category: 'Crypto', // "Crypto" | "Social"
    cryptoMode: 'HODL', // "HODL" | "DCA"
    socialMode: 'GitHub', // "GitHub" | "Screen-time"
    duration: '14 Days',
    customDuration: '',
    stake: '0.5',
    maxParticipants: '100',
    recruitmentPeriodHours: '24', // onboarding / initiation phase length (in hours)
    requireMinParticipants: false,
    minParticipants: '10',
    // Crypto-specific fields
    tokenMint: 'So11111111111111111111111111111111111111112',
    hodlAmount: '1',          // whole tokens
    dcaTradesPerDay: '1',     // number of trades per day
    // Social-specific fields
    githubCommitsPerDay: '1',
    githubRepo: '',
    screenTimeHours: '2',
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
        const recruitmentHours = parseInt(formData.recruitmentPeriodHours);
        const requireMinParticipants = formData.requireMinParticipants;
        const minParticipantsForBackend = requireMinParticipants
          ? parseInt(formData.minParticipants)
          : 1;

        // Additional validation aligned with backend constraints
        if (durationDays < 1 || durationDays > 30) {
          alert("Duration must be between 1 and 30 days.");
          setLoading(false);
          return;
        }

        // Global economic guardrails for all challenges
        const MIN_STAKE = 0.05;
        const MAX_STAKE = 10;
        if (isNaN(stakeAmount) || stakeAmount < MIN_STAKE || stakeAmount > MAX_STAKE) {
          alert(`Stake amount must be between ${MIN_STAKE} and ${MAX_STAKE} SOL.`);
          setLoading(false);
          return;
        }

        const MIN_PARTICIPANTS = 1;
        // On-chain program enforces max_participants <= 100
        const MAX_PARTICIPANTS = 100;
        if (
          isNaN(maxParticipants) ||
          maxParticipants < MIN_PARTICIPANTS ||
          maxParticipants > MAX_PARTICIPANTS
        ) {
          alert(`Max participants must be between ${MIN_PARTICIPANTS} and ${MAX_PARTICIPANTS}.`);
          setLoading(false);
          return;
        }
        if (![0, 1, 24, 168].includes(recruitmentHours)) {
          alert("Please select a valid recruitment period option.");
          setLoading(false);
          return;
        }
        if (requireMinParticipants) {
          if (isNaN(minParticipantsForBackend) || minParticipantsForBackend < MIN_PARTICIPANTS) {
            alert(`Minimum participants must be at least ${MIN_PARTICIPANTS} when enabled.`);
            setLoading(false);
            return;
          }
          if (minParticipantsForBackend > maxParticipants) {
            alert("Minimum participants cannot be greater than max participants.");
            setLoading(false);
            return;
          }
        }

        // Determine Goal Type metadata based on explicit form selection only
        let goalType = 'lifestyle_habit';
        let goalMetadata: Record<string, any> = {};
        let goalParamsForOnchain: Record<string, any> = {};

        if (formData.category === 'Crypto') {
          const tokenMint = formData.tokenMint.trim() || 'So11111111111111111111111111111111111111112';

          // Very basic mint sanity check (length only; full validation is on-chain)
          if (tokenMint.length < 32 || tokenMint.length > 44) {
            alert('Please enter a valid token mint address (32–44 characters).');
            setLoading(false);
            return;
          }

          if (formData.cryptoMode === 'HODL') {
            const hodlAmountTokens = parseFloat(formData.hodlAmount || '0');
            if (isNaN(hodlAmountTokens) || hodlAmountTokens <= 0) {
              alert('Please enter a valid minimum balance for your HODL challenge.');
              setLoading(false);
              return;
            }
            const decimals = 9; // Assume 9 decimals for now (SOL and most SPL tokens)
            const minBalance = Math.floor(hodlAmountTokens * 10 ** decimals);

            goalType = 'hodl_token';
            goalMetadata = {
              habit_type: 'hodl_token',
              token_mint: tokenMint,
              min_balance: minBalance,
            };
            goalParamsForOnchain = { token_mint: tokenMint, min_balance: minBalance };
          } else {
            // DCA / trading challenge
            const tradesPerDay = parseInt(formData.dcaTradesPerDay || '0', 10);
            if (isNaN(tradesPerDay) || tradesPerDay < 1 || tradesPerDay > 50) {
              alert('Daily trades must be between 1 and 50.');
              setLoading(false);
              return;
            }

            goalType = 'lifestyle_habit';
            goalMetadata = {
              habit_type: 'dca_trade',
              token_mint: tokenMint,
              min_trades_per_day: tradesPerDay,
            };
            // The program only needs generic params; extra fields live in goal_metadata
            goalParamsForOnchain = { habit_name: 'Daily DCA' };
          }
        } else {
          // Social challenges (GitHub / Screen-time)
          goalType = 'lifestyle_habit';
          if (formData.socialMode === 'GitHub') {
            const commitsPerDay = parseInt(formData.githubCommitsPerDay || '0', 10);
            if (isNaN(commitsPerDay) || commitsPerDay < 1 || commitsPerDay > 50) {
              alert('Commits per day must be between 1 and 50.');
              setLoading(false);
              return;
            }
            goalMetadata = {
              habit_type: 'github_commits',
              min_commits_per_day: commitsPerDay,
              repo: formData.githubRepo.trim() || undefined,
            };
            goalParamsForOnchain = { habit_name: 'GitHub Commits' };
          } else {
            const hours = parseFloat(formData.screenTimeHours || '0');
            if (isNaN(hours) || hours <= 0 || hours > 24) {
              alert('Allowed screen-time hours must be between 0 and 24.');
              setLoading(false);
              return;
            }
            goalMetadata = {
              habit_type: 'screen_time',
              max_hours: hours,
            };
            goalParamsForOnchain = { habit_name: 'Screen Time' };
          }
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
        const minParticipants = minParticipantsForBackend;
        // Use a valid base58 charity address (configurable via env, fallback to system program ID)
        const charityAddress =
          process.env.NEXT_PUBLIC_CHARITY_ADDRESS || '11111111111111111111111111111111';
        const distributionMode = 'competitive';
        const winnerPercent = 100;

        // --- Build transaction via backend Solana Actions (create-pool) ---
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const createBody = {
          account: creatorPubkey.toBase58(),
          pool_id: randomId,
          goal_type: goalType,
          goal_params: goalParamsForOnchain,
          stake_amount_lamports: stakeLamports,
          duration_days: durationDays,
          max_participants: maxParticipants,
          min_participants: minParticipants,
          charity_address: charityAddress,
          distribution_mode: distributionMode,
          winner_percent: winnerPercent,
        };

        // Use fetch with timeout and retry for Render cold starts
        let createResp: Response;
        let retries = 0;
        const maxRetries = 2;
        
        while (retries <= maxRetries) {
          try {
            const controller = new AbortController();
            const timeout = retries === 0 ? 30000 : 45000; // 30s first, 45s retries
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            createResp = await fetch(`${apiUrl}/solana/actions/create-pool`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(createBody),
              signal: controller.signal,
            });

            clearTimeout(timeoutId);
            break; // Success, exit retry loop
          } catch (err: any) {
            if (err.name === 'AbortError') {
              if (retries < maxRetries) {
                retries++;
                console.warn(`Request timeout (attempt ${retries}/${maxRetries + 1}), retrying... Backend may be waking up.`);
                await new Promise(resolve => setTimeout(resolve, 2000 * retries)); // Exponential backoff
                continue;
              } else {
                throw new Error('Backend is taking too long to respond. It may be waking up from sleep. Please try again in a moment.');
              }
            }
            // For other errors, check if it's a network error and retry
            if (retries < maxRetries && (err.message?.includes('fetch') || err.message?.includes('network'))) {
              retries++;
              console.warn(`Network error (attempt ${retries}/${maxRetries + 1}), retrying...`, err.message);
              await new Promise(resolve => setTimeout(resolve, 2000 * retries));
              continue;
            }
            throw err; // Re-throw if not retryable
          }
        }

        if (!createResp!.ok) {
          const errData = await createResp!.json().catch(() => ({}));
          const errorMsg = errData.detail || errData.error || `HTTP ${createResp!.status}: ${createResp!.statusText}`;
          throw new Error(errorMsg || 'Failed to build create-pool transaction');
        }

        const { transaction: txB64 } = await createResp!.json();

        const tx = Transaction.from(Buffer.from(txB64, 'base64'));

        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
        tx.recentBlockhash = blockhash;
        tx.feePayer = creatorPubkey;

        let txSignature: string;
        if (typeof provider.sendTransaction === 'function') {
          txSignature = await provider.sendTransaction(tx, connection, {
            skipPreflight: false,
            maxRetries: 3,
            preflightCommitment: 'confirmed',
          });
        } else if (typeof provider.signTransaction === 'function') {
          const signed = await provider.signTransaction(tx);
          txSignature = await connection.sendRawTransaction(signed.serialize(), {
            skipPreflight: false,
            maxRetries: 3,
          });
        } else {
          throw new Error('Connected wallet does not support sending transactions.');
        }

        await connection.confirmTransaction(
          { signature: txSignature, blockhash, lastValidBlockHeight },
          'confirmed'
        );

        // --- Backend: confirm pool creation with transaction_signature ---
        const recruitment_period_hours = recruitmentHours;
        const require_min_participants = requireMinParticipants;
        const grace_period_minutes = 5;

        const descriptionText =
          formData.descriptionText.trim() ||
          `A ${formData.category} challenge for ${durationDays} days.`;

        await confirmPoolCreation({
            pool_id: randomId,
          pool_pubkey: poolPubkey,
          transaction_signature: txSignature,
          creator_wallet: currentWallet,
          name: formData.name || "Untitled Challenge",
          description: descriptionText,
          goal_type: goalType,
          goal_metadata: goalMetadata,
          stake_amount: stakeAmount,
          duration_days: durationDays,
          max_participants: maxParticipants,
          min_participants: minParticipantsForBackend,
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
               <div className="space-y-4">
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Describe Your Challenge</label>
                    <textarea
                      value={formData.descriptionText}
                      onChange={(e) => setFormData({ ...formData, descriptionText: e.target.value })}
                      rows={3}
                      className="w-full bg-transparent border border-white/20 py-3 px-3 text-sm text-white placeholder-gray-800 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                      placeholder="e.g. 30 days of 6am gym check-ins with a mirror selfie as proof."
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Challenge Name</label>
                    <input 
                      type="text" 
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full bg-transparent border-b border-white/20 py-3 text-xl text-white placeholder-gray-800 focus:outline-none focus:border-emerald-500 transition-colors" 
                      placeholder="e.g. 100 Days of Code" 
                    />
                  </div>
               </div>
               <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Category</label>
                    <select 
                        value={formData.category}
                        onChange={(e) => setFormData({
                          ...formData,
                          category: e.target.value,
                        })}
                        className="w-full bg-[#0A0A0A] border border-white/10 py-3 px-4 text-sm text-white focus:outline-none"
                    >
                       <option>Crypto</option>
                       <option>Social</option>
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

            {/* Section 2B - Challenge Specific Parameters */}
            <div className="space-y-6">
              <SectionLabel>Challenge Rules</SectionLabel>

              {formData.category === 'Crypto' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Crypto Mode</label>
                    <div className="grid grid-cols-2 gap-3">
                      {['HODL', 'DCA'].map(mode => {
                        const isActive = formData.cryptoMode === mode;
                        return (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => setFormData({ ...formData, cryptoMode: mode })}
                            className={`text-left border px-3 py-3 text-xs rounded-sm transition-colors ${
                              isActive
                                ? 'border-emerald-500/60 bg-emerald-500/10 text-white'
                                : 'border-white/10 bg-white/[0.02] text-gray-400 hover:border-white/30'
                            }`}
                          >
                            <div className="font-mono uppercase tracking-widest text-[10px] mb-1">
                              {mode === 'HODL' ? 'HODL Balance' : 'Daily DCA'}
                            </div>
                            <div className="text-[10px] text-gray-500">
                              {mode === 'HODL'
                                ? 'Hold a minimum balance for the full challenge'
                                : 'Make a certain number of trades each day'}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Token Mint</label>
                      <input
                        type="text"
                        value={formData.tokenMint}
                        onChange={(e) => setFormData({ ...formData, tokenMint: e.target.value })}
                        className="w-full bg-transparent border-b border-white/20 py-2 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-emerald-500 transition-colors"
                        placeholder="So1111... (wrapped SOL or SPL token mint)"
                      />
                    </div>

                    {formData.cryptoMode === 'HODL' ? (
                      <div>
                        <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">
                          Minimum Balance (tokens)
                        </label>
                        <input
                          type="number"
                          min={0.000000001}
                          step="0.000000001"
                          value={formData.hodlAmount}
                          onChange={(e) => setFormData({ ...formData, hodlAmount: e.target.value })}
                          className="w-full bg-transparent border-b border-white/20 py-2 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-emerald-500 transition-colors"
                          placeholder="e.g. 1.0"
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">
                          Trades Per Day
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={50}
                          value={formData.dcaTradesPerDay}
                          onChange={(e) => setFormData({ ...formData, dcaTradesPerDay: e.target.value })}
                          className="w-full bg-transparent border-b border-white/20 py-2 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-emerald-500 transition-colors"
                          placeholder="e.g. 1"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Social Mode</label>
                    <div className="grid grid-cols-2 gap-3">
                      {['GitHub', 'Screen-time'].map(mode => {
                        const isActive = formData.socialMode === mode;
                        return (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => setFormData({ ...formData, socialMode: mode })}
                            className={`text-left border px-3 py-3 text-xs rounded-sm transition-colors ${
                              isActive
                                ? 'border-emerald-500/60 bg-emerald-500/10 text-white'
                                : 'border-white/10 bg-white/[0.02] text-gray-400 hover:border-white/30'
                            }`}
                          >
                            <div className="font-mono uppercase tracking-widest text-[10px] mb-1">
                              {mode === 'GitHub' ? 'GitHub Commits' : 'Screen-time'}
                            </div>
                            <div className="text-[10px] text-gray-500">
                              {mode === 'GitHub'
                                ? 'Daily commit habit verified via GitHub'
                                : 'Limit your daily screen-time hours'}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {formData.socialMode === 'GitHub' ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">
                            Commits Per Day
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={50}
                            value={formData.githubCommitsPerDay}
                            onChange={(e) =>
                              setFormData({ ...formData, githubCommitsPerDay: e.target.value })
                            }
                            className="w-full bg-transparent border-b border-white/20 py-2 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-emerald-500 transition-colors"
                            placeholder="e.g. 1"
                          />
                        </div>
                        <div>
                          <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">
                            Repository (optional)
                          </label>
                          <input
                            type="text"
                            value={formData.githubRepo}
                            onChange={(e) => setFormData({ ...formData, githubRepo: e.target.value })}
                            className="w-full bg-transparent border-b border-white/20 py-2 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-emerald-500 transition-colors"
                            placeholder="owner/repo (leave empty for any repo)"
                          />
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-600">
                        GitHub username is verified separately and used automatically by the agent.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">
                        Max Screen-time Per Day (hours)
                      </label>
                      <input
                        type="number"
                        min={0.5}
                        max={24}
                        step="0.5"
                        value={formData.screenTimeHours}
                        onChange={(e) =>
                          setFormData({ ...formData, screenTimeHours: e.target.value })
                        }
                        className="w-full bg-transparent border-b border-white/20 py-2 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-emerald-500 transition-colors"
                        placeholder="e.g. 2"
                      />
                      <p className="text-[10px] text-gray-600">
                        Used by the agent when validating your daily screen-time check-ins.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Section 3 - Onboarding / Recruitment */}
            <div className="space-y-6">
               <SectionLabel>Onboarding & Start Time</SectionLabel>
               <div>
                  <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Recruitment Period</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: 'Immediate', value: '0', hint: 'Starts as soon as you deploy' },
                      { label: '1 Hour', value: '1', hint: 'Quick sprint with friends' },
                      { label: '1 Day', value: '24', hint: 'Default – time to onboard' },
                      { label: '1 Week', value: '168', hint: 'Big public campaign' },
                    ].map(option => {
                      const isActive = formData.recruitmentPeriodHours === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setFormData({ ...formData, recruitmentPeriodHours: option.value })}
                          className={`text-left border px-3 py-3 text-xs rounded-sm transition-colors ${
                            isActive
                              ? 'border-emerald-500/60 bg-emerald-500/10 text-white'
                              : 'border-white/10 bg-white/[0.02] text-gray-400 hover:border-white/30'
                          }`}
                        >
                          <div className="font-mono uppercase tracking-widest text-[10px] mb-1">
                            {option.label}
                          </div>
                          <div className="text-[10px] text-gray-500">
                            {option.hint}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-[10px] text-gray-600">
                    This is the onboarding window before the challenge actually starts. Longer windows give people more time to join.
                  </p>
               </div>

               <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Minimum Participants</label>
                    <p className="text-[10px] text-gray-600 max-w-xs">
                      Optionally require a minimum number of people before the challenge can start.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          requireMinParticipants: !formData.requireMinParticipants,
                        })
                      }
                      className={`w-10 h-5 rounded-full border flex items-center px-1 transition-colors ${
                        formData.requireMinParticipants
                          ? 'border-emerald-500 bg-emerald-500/20'
                          : 'border-white/20 bg-white/[0.02]'
                      }`}
                    >
                      <div
                        className={`w-3 h-3 rounded-full bg-white transition-transform ${
                          formData.requireMinParticipants ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                    <input
                      type="number"
                      min={1}
                      value={formData.minParticipants}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          minParticipants: e.target.value,
                        })
                      }
                      disabled={!formData.requireMinParticipants}
                      className="w-20 bg-transparent border-b border-white/20 py-1 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-emerald-500 disabled:text-gray-700 disabled:border-white/10"
                      placeholder="10"
                    />
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest">
                      People
                    </span>
                  </div>
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
