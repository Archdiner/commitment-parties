'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, Zap, ChevronDown } from 'lucide-react';
import { ButtonPrimary } from '@/components/ui/ButtonPrimary';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { InfoIcon } from '@/components/ui/Tooltip';
import { confirmPoolCreation } from '@/lib/api';
import { useWallet } from '@/hooks/useWallet';
import { usePrivy } from '@privy-io/react-auth';
import { InsufficientBalanceModal } from '@/components/InsufficientBalanceModal';
import { derivePoolPDA, solToLamports } from '@/lib/solana';
import { Transaction } from '@solana/web3.js';
import { POPULAR_TOKENS, getTokenByMint, type TokenInfo } from '@/lib/tokens';

export default function CreatePool() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [currentBalance, setCurrentBalance] = useState<number>(0);
  const [requiredBalance, setRequiredBalance] = useState<number>(0);
  
  // Use the new Privy-powered wallet hook
  const {
    isAuthenticated,
    isReady,
    walletAddress,
    walletType,
    login,
    signAndSendTransaction,
    ensureBalance,
    getBalance,
  } = useWallet();
  
  // Check GitHub connection via Privy (works for any login method)
  const { user: privyUser } = usePrivy();
  const githubAccount = privyUser?.linkedAccounts?.find(
    (account: any) => account.type === 'github_oauth'
  );
  const isGitHubConnected = !!githubAccount;
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    descriptionText: '',
    category: 'Crypto' as 'Crypto' | 'Lifestyle', // "Crypto" | "Lifestyle"
    cryptoMode: 'HODL' as 'HODL' | 'DCA', // "HODL" | "DCA"
    socialMode: 'GitHub' as 'GitHub' | 'Screen-time', // "GitHub" | "Screen-time"
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
    githubMinTotalLinesPerDay: '50', // Minimum total lines changed per day across all commits/repos
    screenTimeHours: '2',
    // Removed: githubRepo - we now track commits from any repository
  });
  const [useCustomDuration, setUseCustomDuration] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, boolean>>({});
  const [showValidationError, setShowValidationError] = useState(false);
  const [showTokenDropdown, setShowTokenDropdown] = useState(false);
  const [customTokenMint, setCustomTokenMint] = useState('');

  // Calculate potential profit
  const calculatePotentialProfit = (): number => {
    const stakeAmount = parseFloat(formData.stake) || 0;
    const maxParticipants = parseInt(formData.maxParticipants) || 0;
    
    if (stakeAmount <= 0 || maxParticipants <= 0) {
      return 0;
    }

    // Get duration in days
    const durationDays = useCustomDuration 
      ? parseInt(formData.customDuration) || 0
      : parseInt(formData.duration.split(' ')[0]) || 0;
    
    if (durationDays <= 0) {
      return 0;
    }

    // Calculate total staked
    const totalStaked = stakeAmount * maxParticipants;

    // Calculate yield (7% APY, compounded daily)
    // Formula: yield = principal * (1 + (APY / 365))^days - principal
    const APY = 0.07; // 7% APY
    const dailyRate = APY / 365;
    const yieldEarned = totalStaked * (Math.pow(1 + dailyRate, durationDays) - 1);

    // Solo challenge (1 participant)
    if (maxParticipants === 1) {
      // Solo: profit is just the yield earned
      return yieldEarned;
    }

    // Multi-player challenge: assume 50% win rate (reasonable estimate)
    const winners = Math.max(1, Math.floor(maxParticipants * 0.5));
    const losers = Math.max(0, maxParticipants - winners);

    // In competitive mode: winners split losers' stakes + yield
    const loserStakes = losers * stakeAmount;
    const totalPrizePool = loserStakes + yieldEarned;
    const bonusPerWinner = winners > 0 ? totalPrizePool / winners : 0;

    // Potential profit is the bonus (amount above original stake)
    return bonusPerWinner;
  };

  const potentialProfit = calculatePotentialProfit();

  // Determine if GitHub is required for current challenge type
  const requiresGitHub = formData.category === 'Lifestyle' && formData.socialMode === 'GitHub';

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!showTokenDropdown) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.token-selector-dropdown')) {
        setShowTokenDropdown(false);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showTokenDropdown]);

  const validateForm = (): boolean => {
    const errors: Record<string, boolean> = {};
    
    // Validate name
    if (!formData.name || formData.name.trim() === '') {
      errors.name = true;
    }
    
    // Validate duration
    if (useCustomDuration) {
      const customDays = parseInt(formData.customDuration);
      if (isNaN(customDays) || customDays < 1 || customDays > 30) {
        errors.customDuration = true;
      }
    }
    
    // Validate stake (0.05 to 10 SOL)
    const stakeAmount = parseFloat(formData.stake);
    if (isNaN(stakeAmount) || stakeAmount < 0.05 || stakeAmount > 10) {
      errors.stake = true;
    }
    
    // Validate max participants (1 to 100)
    const maxParticipants = parseInt(formData.maxParticipants);
    if (isNaN(maxParticipants) || maxParticipants < 1 || maxParticipants > 100) {
      errors.maxParticipants = true;
    }
    
    // Validate min participants if required
    if (formData.requireMinParticipants) {
      const minParticipants = parseInt(formData.minParticipants);
      if (isNaN(minParticipants) || minParticipants < 1 || minParticipants > maxParticipants) {
        errors.minParticipants = true;
      }
    }
    
    // Validate challenge-specific fields
    if (formData.category === 'Crypto') {
      if (formData.cryptoMode === 'HODL') {
        const hodlAmount = parseFloat(formData.hodlAmount || '0');
        if (isNaN(hodlAmount) || hodlAmount <= 0) {
          errors.hodlAmount = true;
        }
      } else if (formData.cryptoMode === 'DCA') {
        const tradesPerDay = parseInt(formData.dcaTradesPerDay || '0', 10);
        if (isNaN(tradesPerDay) || tradesPerDay < 1 || tradesPerDay > 50) {
          errors.dcaTradesPerDay = true;
        }
      }
    } else if (formData.category === 'Lifestyle') {
      if (formData.socialMode === 'GitHub') {
        const commitsPerDay = parseInt(formData.githubCommitsPerDay || '0', 10);
        if (isNaN(commitsPerDay) || commitsPerDay < 1 || commitsPerDay > 50) {
          errors.githubCommitsPerDay = true;
        }
        const minTotalLines = parseInt(formData.githubMinTotalLinesPerDay || '0', 10);
        if (isNaN(minTotalLines) || minTotalLines < 1 || minTotalLines > 10000) {
          errors.githubMinTotalLinesPerDay = true;
        }
      } else if (formData.socialMode === 'Screen-time') {
        const screenTime = parseFloat(formData.screenTimeHours || '0');
        if (isNaN(screenTime) || screenTime < 0.5 || screenTime > 24) {
          errors.screenTimeHours = true;
        }
      }
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleDeploy = async () => {
    // If not authenticated, prompt login
    if (!isAuthenticated || !walletAddress) {
      if (!isAuthenticated) {
        login();
      } else {
        alert("Please connect your wallet first (top right).");
      }
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
            // Get token decimals from token info, default to 9 (SOL) if not found
            const tokenInfo = getTokenByMint(tokenMint);
            const decimals = tokenInfo?.decimals ?? 9;
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
            const minTotalLines = parseInt(formData.githubMinTotalLinesPerDay || '50', 10);
            if (isNaN(minTotalLines) || minTotalLines < 1 || minTotalLines > 10000) {
              alert('Minimum total lines per day must be between 1 and 10000.');
              setLoading(false);
              return;
            }
            goalMetadata = {
              habit_type: 'github_commits',
              min_commits_per_day: commitsPerDay,
              min_total_lines_per_day: minTotalLines, // Total lines across all commits/repos per day
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

        // Use wallet address from hook (embedded or external)
        const creatorPubkey = walletAddress;
        const stakeLamports = solToLamports(stakeAmount);
        const minParticipants = minParticipantsForBackend;
        // Use a valid base58 charity address (configurable via env, fallback to system program ID)
        const charityAddress =
          process.env.NEXT_PUBLIC_CHARITY_ADDRESS || '11111111111111111111111111111111';
        const distributionMode = 'competitive';
        const winnerPercent = 100;

        // Check wallet has enough balance for transaction fees + potential stake
        const requiredBalanceLamports = stakeLamports + 20_000_000; // Stake + tx fees
        const balanceResult = await ensureBalance(requiredBalanceLamports);
        
        if (!balanceResult.success) {
          // Show modal for insufficient balance
          setCurrentBalance(balanceResult.currentBalance || 0);
          setRequiredBalance(requiredBalanceLamports);
          setShowBalanceModal(true);
          setLoading(false);
          return;
        }

        // --- Build transaction via backend Solana Actions (create-pool) ---
        // Use Render backend URL as default if env var is not set
        // In Next.js, NEXT_PUBLIC_* env vars are available in the browser at build time
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://commitment-backend.onrender.com';

        const createBody = {
          account: creatorPubkey,
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
        let createResp: Response | undefined;
        let retries = 0;
        const maxRetries = 2;
        let lastError: Error | null = null;
        
        while (retries <= maxRetries) {
          try {
            const controller = new AbortController();
            const timeout = retries === 0 ? 30000 : 45000; // 30s first, 45s retries
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            try {
              // Ensure apiUrl is valid
              if (!apiUrl || typeof apiUrl !== 'string') {
                throw new Error(`Invalid API URL: ${apiUrl}`);
              }
              
              const fetchUrl = `${apiUrl}/solana/actions/create-pool`;
              console.log('Fetching from:', fetchUrl);
              
              const response = await fetch(fetchUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(createBody),
                signal: controller.signal,
              });

              clearTimeout(timeoutId);
              
              // Assign to createResp for use outside the loop
              createResp = response;
              
              // Check if response is ok before breaking
              if (response.ok) {
                break; // Success, exit retry loop
              } else {
                // HTTP error - read error message but don't retry on 4xx
                const errorData = await response.json().catch(() => ({ detail: `HTTP ${response.status}: ${response.statusText}` }));
                if (response.status >= 400 && response.status < 500) {
                  // Client error - don't retry
                  throw new Error(errorData.detail || errorData.error || `HTTP ${response.status}: ${response.statusText}`);
                }
                // Server error - retry
                throw new Error(errorData.detail || errorData.error || `HTTP ${response.status}: ${response.statusText}`);
              }
            } catch (fetchErr: any) {
              clearTimeout(timeoutId);
              lastError = fetchErr;
              
              if (fetchErr.name === 'AbortError') {
                if (retries < maxRetries) {
                  retries++;
                  console.warn(`Request timeout (attempt ${retries}/${maxRetries + 1}), retrying... Backend may be waking up.`);
                  await new Promise(resolve => setTimeout(resolve, 2000 * retries)); // Exponential backoff
                  continue;
                } else {
                  throw new Error('Backend is taking too long to respond. It may be waking up from sleep. Please try again in a moment.');
                }
              }
              // Check for CORS/network errors
              if (fetchErr.message?.includes('Failed to fetch') || fetchErr.message?.includes('NetworkError') || fetchErr.message?.includes('CORS')) {
                if (retries < maxRetries) {
                  retries++;
                  console.warn(`Network/CORS error (attempt ${retries}/${maxRetries + 1}), retrying...`, fetchErr.message);
                  await new Promise(resolve => setTimeout(resolve, 2000 * retries));
                  continue;
                } else {
                  // Final attempt failed - provide helpful error message
                  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'unknown';
                  throw new Error(`Failed to connect to backend API. This could be a CORS issue or the backend is down. API URL: ${apiUrl}, Origin: ${currentOrigin}. Please check that NEXT_PUBLIC_API_URL is set correctly.`);
                }
              }
              throw fetchErr; // Re-throw if not retryable
            }
          } catch (err: any) {
            // Outer catch for any other errors
            lastError = err;
            if (retries >= maxRetries) {
              throw err;
            }
            retries++;
            await new Promise(resolve => setTimeout(resolve, 2000 * retries));
          }
        }

        // Verify we have a response before parsing
        if (!createResp) {
          throw lastError || new Error('Failed to get response from backend after retries');
        }

        // Response is already verified in the try block, safe to parse
        const { transaction: txB64 } = await createResp.json();

        const tx = Transaction.from(Buffer.from(txB64, 'base64'));

        // Sign and send transaction using Privy wallet (embedded or external)
        const txSignature = await signAndSendTransaction(tx);

        // --- Backend: confirm pool creation with transaction_signature ---
        const recruitment_period_hours = recruitmentHours;
        const require_min_participants = requireMinParticipants;

        const descriptionText =
          formData.descriptionText.trim() ||
          `A ${formData.category} challenge for ${durationDays} days.`;

        await confirmPoolCreation({
            pool_id: randomId,
          pool_pubkey: poolPubkey,
          transaction_signature: txSignature,
          creator_wallet: walletAddress,
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
        });
        
        // Small delay to ensure pool is available in database before redirecting
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Success - redirect to pools page
        router.push('/pools');
        
    } catch (error: any) {
        try {
          console.error('Pool creation error:', error);
          let errorMessage = "Failed to create pool.";
          
          // Check for CORS errors specifically
          const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'unknown';
          if (error?.message?.includes('CORS') || error?.message?.includes('cors') || 
              error?.message?.includes('blocked') || error?.message?.includes('Failed to fetch')) {
            errorMessage = `CORS Error: Backend is not configured to allow requests from this domain (${currentOrigin}). Please update CORS_ORIGINS in Render to include: ${currentOrigin}. Make sure the backend has restarted after updating the environment variable.`;
          }
          // Check wallet-specific error codes first (before generic message check)
          else if (error?.code === 4001) {
            errorMessage = "Transaction was rejected by user.";
          } else if (error?.code === -32002) {
            errorMessage = "Transaction already pending. Please check your wallet.";
          }
          // Extract detailed error information
          else if (error?.data?.detail) {
            errorMessage = error.data.detail;
          } else if (error?.data?.error) {
            errorMessage = error.data.error;
          } else if (error?.detail) {
            errorMessage = error.detail;
          } else if (error?.name === 'ApiError') {
            errorMessage = error.message || "Backend API error. Make sure the backend server is running.";
          } else if (error?.message) {
            errorMessage = error.message;
          }
          
          // Show full error details in console
          const currentApiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://commitment-backend.onrender.com';
          console.error('Full error details:', {
            error,
            status: error?.status,
            data: error?.data,
            message: error?.message,
            apiUrl: currentApiUrl,
            stack: error?.stack,
            name: error?.name
          });
          
          alert(`Error: ${errorMessage}\n\nStatus: ${error?.status || 'Unknown'}\n\nCheck the browser console for more details.`);
        } catch (alertError: any) {
          // If even the error handling fails, log to console and show a basic message
          console.error('Error in error handler:', alertError);
          console.error('Original error:', error);
          alert('An unexpected error occurred. Please check the browser console for details.');
        }
    } finally {
        setLoading(false);
    }
  };

  const handleCheckBalance = async () => {
    if (!walletAddress) return;
    
    try {
      const newBalance = await getBalance();
      setCurrentBalance(newBalance);
      
      if (newBalance >= requiredBalance) {
        setShowBalanceModal(false);
        // Retry create automatically
        handleDeploy();
      }
    } catch (error) {
      console.error('Failed to check balance:', error);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white pt-24 px-6 pb-20">
      <InsufficientBalanceModal
        isOpen={showBalanceModal}
        onClose={() => setShowBalanceModal(false)}
        walletAddress={walletAddress || ''}
        currentBalance={currentBalance}
        requiredBalance={requiredBalance}
        onCheckBalance={handleCheckBalance}
      />
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
                    <label className="flex items-center gap-2 text-xs uppercase tracking-widest text-gray-500 mb-2">
                      Challenge Description
                      <InfoIcon content="A detailed description of your challenge. This helps others understand what they're committing to. This will be displayed prominently on the challenge page." />
                    </label>
                    <textarea
                      value={formData.descriptionText}
                      onChange={(e) => setFormData({ ...formData, descriptionText: e.target.value })}
                      rows={4}
                      maxLength={500}
                      className="w-full bg-transparent border-b border-white/20 py-3 px-3 text-xl text-white placeholder-gray-800 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                      placeholder="e.g. 30 days of 6am gym check-ins with a mirror selfie as proof. GPS verification required. Must check in between 5:45am and 6:15am UTC daily."
                    />
                    <p className="text-[10px] text-gray-600 mt-1">
                      {formData.descriptionText.length}/500 characters. A good description helps attract participants.
                    </p>
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
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === 'Crypto' || value === 'Lifestyle') {
                            setFormData({
                              ...formData,
                              category: value,
                            });
                          }
                        }}
                        className="w-full bg-transparent border-b border-white/20 py-3 px-4 text-sm text-white placeholder-gray-800 focus:outline-none focus:border-emerald-500 transition-colors"
                    >
                       <option>Crypto</option>
                       <option>Lifestyle</option>
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
                        className="w-full bg-transparent border-b border-white/20 py-3 px-4 text-sm text-white placeholder-gray-800 focus:outline-none focus:border-emerald-500 transition-colors"
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
                          min="1"
                          max="30"
                          step="1"
                          value={formData.customDuration}
                          onChange={(e) => {
                            const value = e.target.value;
                            const numValue = parseInt(value, 10);
                            // Prevent negative values and enforce range
                            if (value === '' || (!isNaN(numValue) && numValue >= 1 && numValue <= 30)) {
                              setFormData({...formData, customDuration: value});
                              if (validationErrors.customDuration) {
                                setValidationErrors({...validationErrors, customDuration: false});
                              }
                            }
                          }}
                          onBlur={() => {
                            const days = parseInt(formData.customDuration, 10);
                            if (isNaN(days) || days < 1) {
                              setFormData({...formData, customDuration: '1'});
                            } else if (days > 30) {
                              setFormData({...formData, customDuration: '30'});
                            }
                          }}
                          className={`flex-1 bg-transparent border-b py-3 text-xl text-white placeholder-gray-800 focus:outline-none transition-colors ${
                            validationErrors.customDuration 
                              ? 'border-red-500 focus:border-red-500' 
                              : 'border-white/20 focus:border-emerald-500'
                          }`}
                          placeholder="Enter days" 
                        />
                        {validationErrors.customDuration && (
                          <p className="text-[10px] text-red-400 mt-1 absolute">Duration must be between 1 and 30 days</p>
                        )}
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
                    min="0.05"
                    max="10"
                    step="0.01"
                    value={formData.stake}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Prevent negative values
                      if (value === '' || (parseFloat(value) >= 0 && parseFloat(value) <= 10)) {
                        setFormData({...formData, stake: value});
                        if (validationErrors.stake) {
                          setValidationErrors({...validationErrors, stake: false});
                        }
                      }
                    }}
                    onBlur={() => {
                      const stakeAmount = parseFloat(formData.stake);
                      if (isNaN(stakeAmount) || stakeAmount < 0.05) {
                        setFormData({...formData, stake: '0.05'});
                      } else if (stakeAmount > 10) {
                        setFormData({...formData, stake: '10'});
                      }
                    }}
                    className={`w-full bg-transparent border-b py-3 text-xl text-white placeholder-gray-800 focus:outline-none transition-colors ${
                      validationErrors.stake 
                        ? 'border-red-500 focus:border-red-500' 
                        : 'border-white/20 focus:border-emerald-500'
                    }`}
                    placeholder="0.5" 
                  />
                  {validationErrors.stake && (
                    <p className="text-[10px] text-red-400 mt-1">Stake must be between 0.05 and 10 SOL</p>
                  )}
               </div>
               <div>
                  <label className="flex items-center gap-2 text-xs uppercase tracking-widest text-gray-500 mb-2">
                    Max Participants
                    <InfoIcon content="Maximum number of people who can join this challenge. More participants = bigger prize pool for winners." />
                  </label>
                  <input 
                    type="number" 
                    min="1"
                    max="100"
                    step="1"
                    value={formData.maxParticipants}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Prevent negative values and enforce max
                      const numValue = parseInt(value, 10);
                      if (value === '' || (!isNaN(numValue) && numValue >= 1 && numValue <= 100)) {
                        setFormData({...formData, maxParticipants: value});
                        if (validationErrors.maxParticipants) {
                          setValidationErrors({...validationErrors, maxParticipants: false});
                        }
                      }
                    }}
                    onBlur={() => {
                      const maxParts = parseInt(formData.maxParticipants, 10);
                      if (isNaN(maxParts) || maxParts < 1) {
                        setFormData({...formData, maxParticipants: '1'});
                      } else if (maxParts > 100) {
                        setFormData({...formData, maxParticipants: '100'});
                      }
                    }}
                    className={`w-full bg-transparent border-b py-3 text-xl text-white placeholder-gray-800 focus:outline-none transition-colors ${
                      validationErrors.maxParticipants 
                        ? 'border-red-500 focus:border-red-500' 
                        : 'border-white/20 focus:border-emerald-500'
                    }`}
                    placeholder="100" 
                  />
                  {validationErrors.maxParticipants && (
                    <p className="text-[10px] text-red-400 mt-1">Max participants must be between 1 and 100</p>
                  )}
               </div>
               {potentialProfit > 0 && (
                 <div className="p-4 border border-emerald-500/30 bg-emerald-500/5 rounded-lg">
                   <div className="flex items-center justify-between">
                     <div className="flex-1">
                       <div className="text-xs uppercase tracking-widest text-gray-400 mb-1">
                         Potential Profit (if you win)
                       </div>
                       <div className="text-2xl font-light text-emerald-400">
                         +{potentialProfit.toFixed(4)} SOL
                       </div>
                       <div className="text-[10px] text-gray-500 mt-1">
                         {parseInt(formData.maxParticipants) === 1 
                           ? "Solo challenge: profit comes from yield earned on your stake."
                           : "Based on 50% win rate assumption. You'd get your stake back + this profit."}
                       </div>
                     </div>
                   </div>
                 </div>
               )}
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
                    <div className="relative">
                      <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">
                        Token
                        <InfoIcon content="Select a popular token or enter a custom token mint address. Only tokens available on Solana can be tracked." />
                      </label>
                      
                      {/* Token Selector Dropdown */}
                      <div className="relative token-selector-dropdown">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowTokenDropdown(!showTokenDropdown);
                          }}
                          className="w-full bg-transparent border-b border-white/20 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            {(() => {
                              const selectedToken = getTokenByMint(formData.tokenMint);
                              if (selectedToken) {
                                return (
                                  <>
                                    {selectedToken.iconUrl ? (
                                      <img 
                                        src={selectedToken.iconUrl} 
                                        alt={selectedToken.symbol}
                                        className="w-5 h-5 rounded-full"
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                      />
                                    ) : (
                                      <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs font-mono">
                                        {selectedToken.symbol[0]}
                                      </div>
                                    )}
                                    <span className="font-medium">{selectedToken.symbol}</span>
                                    <span className="text-gray-500 text-xs">({selectedToken.name})</span>
                                  </>
                                );
                              } else if (formData.tokenMint) {
                                return (
                                  <>
                                    <div className="w-5 h-5 rounded-full bg-gray-500/20 flex items-center justify-center text-xs font-mono">
                                      ?
                                    </div>
                                    <span className="font-mono text-xs text-gray-400">
                                      {formData.tokenMint.slice(0, 8)}...
                                    </span>
                                  </>
                                );
                              }
                              return <span className="text-gray-600">Select a token...</span>;
                            })()}
                          </div>
                          <ChevronRight 
                            className={`w-4 h-4 text-gray-500 transition-transform ${showTokenDropdown ? 'rotate-90' : ''}`}
                          />
                        </button>
                        
                        {showTokenDropdown && (
                          <div 
                            className="absolute z-50 w-full mt-1 bg-[#0a0a0a] border border-white/20 rounded-lg shadow-lg max-h-64 overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {/* Popular Tokens */}
                            <div className="p-2">
                              <div className="text-[10px] uppercase tracking-widest text-gray-500 px-2 py-1">
                                Popular Tokens
                              </div>
                              {POPULAR_TOKENS.map((token) => (
                                <button
                                  key={token.mint}
                                  type="button"
                                  onClick={() => {
                                    setFormData({ ...formData, tokenMint: token.mint });
                                    setShowTokenDropdown(false);
                                    setCustomTokenMint('');
                                  }}
                                  className={`w-full flex items-center gap-3 px-3 py-2 rounded hover:bg-white/5 transition-colors ${
                                    formData.tokenMint === token.mint ? 'bg-emerald-500/10' : ''
                                  }`}
                                >
                                  {token.iconUrl ? (
                                    <img 
                                      src={token.iconUrl} 
                                      alt={token.symbol}
                                      className="w-6 h-6 rounded-full"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                      }}
                                    />
                                  ) : (
                                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs font-mono">
                                      {token.symbol[0]}
                                    </div>
                                  )}
                                  <div className="flex-1 text-left">
                                    <div className="text-sm font-medium text-white">{token.symbol}</div>
                                    <div className="text-xs text-gray-400">{token.name}</div>
                                  </div>
                                </button>
                              ))}
                            </div>
                            
                            {/* Custom Token Input */}
                            <div className="p-2 border-t border-white/10">
                              <div className="text-[10px] uppercase tracking-widest text-gray-500 px-2 py-1 mb-2">
                                Custom Token
                              </div>
                              <input
                                type="text"
                                value={customTokenMint}
                                onChange={(e) => {
                                  setCustomTokenMint(e.target.value);
                                  if (e.target.value.length >= 32) {
                                    setFormData({ ...formData, tokenMint: e.target.value });
                                  }
                                }}
                                onBlur={() => {
                                  if (customTokenMint && customTokenMint.length >= 32) {
                                    setFormData({ ...formData, tokenMint: customTokenMint });
                                  }
                                  setShowTokenDropdown(false);
                                }}
                                placeholder="Enter token mint address..."
                                className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <p className="text-[10px] text-gray-500 mt-1 px-2">
                                Only Solana (SPL) tokens supported
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Selected Token Mint (read-only display) */}
                      {formData.tokenMint && (
                        <div className="mt-2 text-[10px] text-gray-500 font-mono break-all">
                          Mint: {formData.tokenMint}
                        </div>
                      )}
                    </div>

                    {formData.cryptoMode === 'HODL' ? (
                      <div>
                        <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">
                          Minimum Balance (tokens)
                        </label>
                        <input
                          type="number"
                          min="0.000000001"
                          step="0.000000001"
                          value={formData.hodlAmount}
                          onChange={(e) => {
                            const value = e.target.value;
                            const numValue = parseFloat(value);
                            // Prevent negative values
                            if (value === '' || (!isNaN(numValue) && numValue > 0)) {
                              setFormData({ ...formData, hodlAmount: value });
                              if (validationErrors.hodlAmount) {
                                setValidationErrors({...validationErrors, hodlAmount: false});
                              }
                            }
                          }}
                          onBlur={() => {
                            const hodlAmount = parseFloat(formData.hodlAmount);
                            if (isNaN(hodlAmount) || hodlAmount <= 0) {
                              setFormData({ ...formData, hodlAmount: '1' });
                            }
                          }}
                          className={`w-full bg-transparent border-b py-2 text-sm text-white placeholder-gray-700 focus:outline-none transition-colors ${
                            validationErrors.hodlAmount 
                              ? 'border-red-500 focus:border-red-500' 
                              : 'border-white/20 focus:border-emerald-500'
                          }`}
                          placeholder="e.g. 1.0"
                        />
                        {validationErrors.hodlAmount && (
                          <p className="text-[10px] text-red-400 mt-1">Minimum balance must be greater than 0</p>
                        )}
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">
                          Trades Per Day
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="50"
                          step="1"
                          value={formData.dcaTradesPerDay}
                          onChange={(e) => {
                            const value = e.target.value;
                            const numValue = parseInt(value, 10);
                            // Prevent negative values and enforce range
                            if (value === '' || (!isNaN(numValue) && numValue >= 1 && numValue <= 50)) {
                              setFormData({ ...formData, dcaTradesPerDay: value });
                              if (validationErrors.dcaTradesPerDay) {
                                setValidationErrors({...validationErrors, dcaTradesPerDay: false});
                              }
                            }
                          }}
                          onBlur={() => {
                            const trades = parseInt(formData.dcaTradesPerDay, 10);
                            if (isNaN(trades) || trades < 1) {
                              setFormData({ ...formData, dcaTradesPerDay: '1' });
                            } else if (trades > 50) {
                              setFormData({ ...formData, dcaTradesPerDay: '50' });
                            }
                          }}
                          className={`w-full bg-transparent border-b py-2 text-sm text-white placeholder-gray-700 focus:outline-none transition-colors ${
                            validationErrors.dcaTradesPerDay 
                              ? 'border-red-500 focus:border-red-500' 
                              : 'border-white/20 focus:border-emerald-500'
                          }`}
                          placeholder="e.g. 1"
                        />
                        {validationErrors.dcaTradesPerDay && (
                          <p className="text-[10px] text-red-400 mt-1">Trades per day must be between 1 and 50</p>
                        )}
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
                            min="1"
                            max="50"
                            step="1"
                            value={formData.githubCommitsPerDay}
                            onChange={(e) => {
                              const value = e.target.value;
                              const numValue = parseInt(value, 10);
                              // Prevent negative values and enforce range
                              if (value === '' || (!isNaN(numValue) && numValue >= 1 && numValue <= 50)) {
                                setFormData({ ...formData, githubCommitsPerDay: value });
                                if (validationErrors.githubCommitsPerDay) {
                                  setValidationErrors({...validationErrors, githubCommitsPerDay: false});
                                }
                              }
                            }}
                            onBlur={() => {
                              const commits = parseInt(formData.githubCommitsPerDay, 10);
                              if (isNaN(commits) || commits < 1) {
                                setFormData({ ...formData, githubCommitsPerDay: '1' });
                              } else if (commits > 50) {
                                setFormData({ ...formData, githubCommitsPerDay: '50' });
                              }
                            }}
                            className={`w-full bg-transparent border-b py-2 text-sm text-white placeholder-gray-700 focus:outline-none transition-colors ${
                              validationErrors.githubCommitsPerDay 
                                ? 'border-red-500 focus:border-red-500' 
                                : 'border-white/20 focus:border-emerald-500'
                            }`}
                            placeholder="e.g. 1"
                          />
                          {validationErrors.githubCommitsPerDay && (
                            <p className="text-[10px] text-red-400 mt-1">Commits per day must be between 1 and 50</p>
                          )}
                        </div>
                        <div>
                          <label className="flex items-center gap-2 text-xs uppercase tracking-widest text-gray-500 mb-2">
                            Min Total Lines Per Day
                            <InfoIcon content="Minimum total lines changed (additions + deletions) across all commits and repositories per day. AI will evaluate all your code together to ensure it's genuine work." />
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="10000"
                            step="10"
                            value={formData.githubMinTotalLinesPerDay}
                            onChange={(e) => {
                              const value = e.target.value;
                              const numValue = parseInt(value, 10);
                              // Prevent negative values and enforce range
                              if (value === '' || (!isNaN(numValue) && numValue >= 1 && numValue <= 10000)) {
                                setFormData({ ...formData, githubMinTotalLinesPerDay: value });
                                if (validationErrors.githubMinTotalLinesPerDay) {
                                  setValidationErrors({...validationErrors, githubMinTotalLinesPerDay: false});
                                }
                              }
                            }}
                            onBlur={() => {
                              const minTotalLines = parseInt(formData.githubMinTotalLinesPerDay, 10);
                              if (isNaN(minTotalLines) || minTotalLines < 1) {
                                setFormData({ ...formData, githubMinTotalLinesPerDay: '50' });
                              } else if (minTotalLines > 10000) {
                                setFormData({ ...formData, githubMinTotalLinesPerDay: '10000' });
                              }
                            }}
                            className={`w-full bg-transparent border-b py-2 text-sm text-white placeholder-gray-700 focus:outline-none transition-colors ${
                              validationErrors.githubMinTotalLinesPerDay 
                                ? 'border-red-500 focus:border-red-500' 
                                : 'border-white/20 focus:border-emerald-500'
                            }`}
                            placeholder="e.g. 50"
                          />
                          {validationErrors.githubMinTotalLinesPerDay && (
                            <p className="text-[10px] text-red-400 mt-1">Min total lines per day must be between 1 and 10000</p>
                          )}
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-600">
                        Commits are tracked from any repository. Only commits with at least the minimum lines changed will count.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">
                        Max Screen-time Per Day (hours)
                      </label>
                      <input
                        type="number"
                        min="0.5"
                        max="24"
                        step="0.5"
                        value={formData.screenTimeHours}
                        onChange={(e) => {
                          const value = e.target.value;
                          const numValue = parseFloat(value);
                          // Prevent negative values and enforce range
                          if (value === '' || (!isNaN(numValue) && numValue >= 0.5 && numValue <= 24)) {
                            setFormData({ ...formData, screenTimeHours: value });
                            if (validationErrors.screenTimeHours) {
                              setValidationErrors({...validationErrors, screenTimeHours: false});
                            }
                          }
                        }}
                        onBlur={() => {
                          const hours = parseFloat(formData.screenTimeHours);
                          if (isNaN(hours) || hours < 0.5) {
                            setFormData({ ...formData, screenTimeHours: '0.5' });
                          } else if (hours > 24) {
                            setFormData({ ...formData, screenTimeHours: '24' });
                          }
                        }}
                        className={`w-full bg-transparent border-b py-2 text-sm text-white placeholder-gray-700 focus:outline-none transition-colors ${
                          validationErrors.screenTimeHours 
                            ? 'border-red-500 focus:border-red-500' 
                            : 'border-white/20 focus:border-emerald-500'
                        }`}
                        placeholder="e.g. 2"
                      />
                      {validationErrors.screenTimeHours && (
                        <p className="text-[10px] text-red-400 mt-1">Screen time must be between 0.5 and 24 hours</p>
                      )}
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
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[
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
                      min="1"
                      max="100"
                      step="1"
                      value={formData.minParticipants}
                      onChange={(e) => {
                        const value = e.target.value;
                        const numValue = parseInt(value, 10);
                        const maxParts = parseInt(formData.maxParticipants, 10);
                        // Prevent negative values and enforce range
                        if (value === '' || (!isNaN(numValue) && numValue >= 1 && numValue <= (isNaN(maxParts) ? 100 : maxParts))) {
                          setFormData({
                            ...formData,
                            minParticipants: value,
                          });
                          if (validationErrors.minParticipants) {
                            setValidationErrors({...validationErrors, minParticipants: false});
                          }
                        }
                      }}
                      onBlur={() => {
                        const minParts = parseInt(formData.minParticipants, 10);
                        const maxParts = parseInt(formData.maxParticipants, 10);
                        if (isNaN(minParts) || minParts < 1) {
                          setFormData({...formData, minParticipants: '1'});
                        } else if (!isNaN(maxParts) && minParts > maxParts) {
                          setFormData({...formData, minParticipants: formData.maxParticipants});
                        }
                      }}
                      disabled={!formData.requireMinParticipants}
                      className={`w-20 bg-transparent border-b py-1 text-sm text-white placeholder-gray-700 focus:outline-none transition-colors disabled:text-gray-700 disabled:border-white/10 ${
                        validationErrors.minParticipants 
                          ? 'border-red-500 focus:border-red-500' 
                          : 'border-white/20 focus:border-emerald-500'
                      }`}
                      placeholder="10"
                    />
                    {validationErrors.minParticipants && (
                      <p className="text-[10px] text-red-400 mt-1">Min participants must be between 1 and max participants</p>
                    )}
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
               {!isAuthenticated && (
                 <div className="mb-6 p-4 border border-amber-500/30 bg-amber-500/5 rounded-lg">
                   <div className="flex items-start gap-3 text-xs text-amber-400">
                     <InfoIcon content="Sign in with your email or connect a wallet to create a challenge. A wallet will be created automatically for you when you sign in." />
                     <div>
                       <p className="font-medium mb-1">Sign In First</p>
                       <p className="text-amber-300/80 leading-relaxed">
                         Click "Sign In" in the top-right corner to get started. A wallet will be created automatically.
                       </p>
                     </div>
                   </div>
                 </div>
               )}
               {isAuthenticated && !walletAddress && (
                 <div className="mb-6 p-4 border border-amber-500/30 bg-amber-500/5 rounded-lg">
                   <div className="flex items-start gap-3 text-xs text-amber-400">
                     <InfoIcon content="Your wallet is being set up. Please wait a moment..." />
                     <div>
                       <p className="font-medium mb-1">Setting Up Your Wallet</p>
                       <p className="text-amber-300/80 leading-relaxed">
                         Your wallet is being created. Please wait a moment...
                       </p>
                     </div>
                   </div>
                 </div>
               )}
               {/* Only show GitHub warning if creating a GitHub challenge */}
               {requiresGitHub && walletAddress && !isGitHubConnected && (
                 <div className="mb-6 p-4 border border-amber-500/30 bg-amber-500/5 rounded-lg">
                   <div className="flex items-start gap-3 text-xs text-amber-400">
                     <InfoIcon content="You need to connect your GitHub account to create GitHub commit challenges. This allows our AI agent to verify commits. You can connect GitHub in the top-right corner - it works even if you signed up with email!" />
                     <div>
                       <p className="font-medium mb-1">Connect Your GitHub Account</p>
                       <p className="text-amber-300/80 leading-relaxed">
                         GitHub challenges require connecting your GitHub account so we can verify commits. Click "Connect GitHub" in the top-right corner to connect your account. This works even if you signed up with email or wallet!
                       </p>
                     </div>
                   </div>
                 </div>
               )}
               <div className="flex items-center justify-center gap-2 mb-4">
                 <ButtonPrimary 
                   className="w-full" 
                   onClick={handleDeploy}
                   disabled={
                     loading || 
                     !isAuthenticated || 
                     !walletAddress || 
                     (requiresGitHub && !isGitHubConnected) || 
                     !isReady
                   }
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
