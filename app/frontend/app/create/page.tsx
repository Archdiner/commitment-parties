'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, Zap, Loader2 } from 'lucide-react';
import { ButtonPrimary } from '@/components/ui/ButtonPrimary';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { createPool } from '@/lib/api';
import { getPersistedWalletAddress } from '@/lib/wallet';

export default function CreatePool() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    type: 'Lifestyle (Photo/GPS)',
    duration: '14 Days',
    stake: '0.5',
    maxParticipants: '100'
  });

  useEffect(() => {
    const address = getPersistedWalletAddress();
    setWalletAddress(address);
  }, []);

  const handleDeploy = async () => {
    if (!walletAddress) {
        alert("Please connect your wallet first (top right).");
        return;
    }
    
    setLoading(true);
    try {
        const durationDays = parseInt(formData.duration.split(' ')[0]);
        const stakeAmount = parseFloat(formData.stake);
        const maxParticipants = parseInt(formData.maxParticipants);

        // Determine Goal Type metadata
        let goalType = 'lifestyle_habit';
        let goalMetadata = {};
        if (formData.type.includes('Crypto')) {
            goalType = 'hodl_token';
            goalMetadata = { token_mint: 'So11111111111111111111111111111111111111112', min_balance: 1000000000 };
        } else if (formData.type.includes('Developer')) {
            goalType = 'lifestyle_habit';
            goalMetadata = { habit_type: 'github_commits', min_commits_per_day: 1 };
        } else {
            // Lifestyle
            goalType = 'lifestyle_habit';
            goalMetadata = { habit_type: 'screen_time', max_hours: 2 };
        }

        // Mock ID and Pubkey for MVP (Backend expects unique ID)
        const randomId = Math.floor(Math.random() * 1000000);
        const mockPubkey = `Pool${randomId}PubKeymock11111111111111111`;
        
        // Timestamps
        const now = Math.floor(Date.now() / 1000);
        const end = now + (durationDays * 86400);

        await createPool({
            pool_id: randomId,
            pool_pubkey: mockPubkey,
            creator_wallet: walletAddress,
            name: formData.name || "Untitled Challenge",
            description: `A ${formData.type} challenge for ${durationDays} days.`,
            goal_type: goalType,
            goal_metadata: goalMetadata,
            stake_amount: stakeAmount,
            duration_days: durationDays,
            max_participants: maxParticipants,
            charity_address: "CharityWalletAddress11111111111111111111111",
            start_timestamp: now,
            end_timestamp: end,
            is_public: true,
            distribution_mode: 'competitive',
            split_percentage_winners: 100
        });
        
        // Success
        router.push('/pools');
        
    } catch (error) {
        console.error(error);
        alert("Failed to create pool. Check console.");
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
         
         <h1 className="text-4xl font-light mb-12">Initialize Protocol</h1>
         
         <div className="space-y-12">
            {/* Section 1 */}
            <div className="space-y-6">
               <SectionLabel>Core Parameters</SectionLabel>
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
               <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Type</label>
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
                    <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Duration</label>
                    <select 
                        value={formData.duration}
                        onChange={(e) => setFormData({...formData, duration: e.target.value})}
                        className="w-full bg-[#0A0A0A] border border-white/10 py-3 px-4 text-sm text-white focus:outline-none"
                    >
                       <option>7 Days</option>
                       <option>14 Days</option>
                       <option>30 Days</option>
                    </select>
                  </div>
               </div>
            </div>

            {/* Section 2 */}
            <div className="space-y-6">
               <SectionLabel>Financial Stakes</SectionLabel>
               <div>
                  <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Stake Amount (SOL)</label>
                  <input 
                    type="number" 
                    value={formData.stake}
                    onChange={(e) => setFormData({...formData, stake: e.target.value})}
                    className="w-full bg-transparent border-b border-white/20 py-3 text-xl text-white placeholder-gray-800 focus:outline-none focus:border-emerald-500 transition-colors" 
                    placeholder="0.5" 
                  />
                  <p className="mt-2 text-[10px] text-gray-600">This amount will be locked for every participant.</p>
               </div>
               <div>
                  <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Max Participants</label>
                  <input 
                    type="number" 
                    value={formData.maxParticipants}
                    onChange={(e) => setFormData({...formData, maxParticipants: e.target.value})}
                    className="w-full bg-transparent border-b border-white/20 py-3 text-xl text-white placeholder-gray-800 focus:outline-none focus:border-emerald-500 transition-colors" 
                    placeholder="100" 
                  />
               </div>
            </div>

            {/* Section 3 */}
            <div className="space-y-6">
               <SectionLabel>Verification Logic</SectionLabel>
               <div className="p-6 border border-white/10 bg-white/[0.01]">
                  <div className="flex items-start gap-4">
                     <Zap className="w-5 h-5 text-emerald-500 mt-1" />
                     <div>
                        <h4 className="text-sm font-medium text-white mb-1">AI Agent Verification</h4>
                        <p className="text-xs text-gray-500 leading-relaxed">
                           Our centralized AI agent will monitor the verification proof submitted by users. 
                           For "Lifestyle" challenges, this involves vision analysis of uploaded photos.
                        </p>
                     </div>
                  </div>
               </div>
            </div>

            <div className="pt-8 border-t border-white/10">
               <ButtonPrimary 
                className="w-full" 
                onClick={handleDeploy}
                disabled={loading}
               >
                 {loading ? <span className="animate-pulse">Initializing...</span> : "Deploy Protocol"}
               </ButtonPrimary>
               <p className="text-center mt-4 text-[10px] text-gray-600 font-mono">0.05 SOL deployment fee applies</p>
            </div>
         </div>
      </div>
    </div>
  );
}
