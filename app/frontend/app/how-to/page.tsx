'use client';

import React from 'react';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { ArrowRight, Wallet, Target, CheckCircle, Trophy } from 'lucide-react';
import { ButtonPrimary } from '@/components/ui/ButtonPrimary';
import Link from 'next/link';

export default function HowToPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-white pt-32 px-6 pb-20">
      <div className="max-w-4xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <SectionLabel>How to Guide</SectionLabel>
          <h1 className="text-5xl md:text-6xl font-light tracking-tighter mb-6">
            Getting Started<br/>
            <span className="text-emerald-500 font-serif italic font-light">Step by Step</span>
          </h1>
          <p className="text-lg text-gray-400 leading-relaxed max-w-2xl mx-auto">
            New to CommitMint? Follow this guide to get started with your first challenge.
          </p>
        </div>

        {/* Step 1: Install Wallet */}
        <div className="mb-16 space-y-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center text-2xl font-light text-emerald-400">
              1
            </div>
            <div className="flex items-center gap-3">
              <Wallet className="w-6 h-6 text-emerald-500" />
              <h2 className="text-3xl font-light">Install Phantom Wallet</h2>
            </div>
          </div>
          <div className="space-y-4 pl-16">
            <p className="text-gray-400 leading-relaxed text-lg">
              Phantom is a free digital wallet for Solana (like a bank account for crypto). It takes just 2 minutes to set up.
            </p>
            <ol className="space-y-3 text-gray-400 list-decimal list-inside">
              <li>Go to <a href="https://phantom.app" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300">phantom.app</a> and click "Download"</li>
              <li>Install the browser extension (Chrome, Firefox, Brave, or Edge)</li>
              <li>Create a new wallet and save your seed phrase securely (this is your backup - never share it!)</li>
              <li>Fund your wallet with SOL (you can buy it directly in Phantom or transfer from an exchange)</li>
            </ol>
            <div className="p-6 border border-amber-500/30 bg-amber-500/5 rounded-xl mt-4">
              <p className="text-sm text-amber-300 leading-relaxed">
                <strong className="text-amber-400">Important:</strong> Never share your seed phrase or private keys with anyone. 
                CommitMint will never ask for this information.
              </p>
            </div>
          </div>
        </div>

        {/* Step 2: Connect Wallet */}
        <div className="mb-16 space-y-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center text-2xl font-light text-emerald-400">
              2
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-emerald-500" />
              <h2 className="text-3xl font-light">Connect Your Wallet</h2>
            </div>
          </div>
          <div className="space-y-4 pl-16">
            <p className="text-gray-400 leading-relaxed text-lg">
              Once you have Phantom installed, connect it to CommitMint.
            </p>
            <ol className="space-y-3 text-gray-400 list-decimal list-inside">
              <li>Click "Connect Wallet" in the top-right corner of the website</li>
              <li>Phantom will pop up asking you to approve the connection</li>
              <li>Click "Connect" or "Approve" in the Phantom popup</li>
              <li>Your wallet address will now appear in the top-right corner</li>
            </ol>
            <p className="text-gray-400 leading-relaxed text-lg mt-4">
              That's it! Your wallet is now connected and you can browse challenges.
            </p>
          </div>
        </div>

        {/* Step 3: Browse or Create */}
        <div className="mb-16 space-y-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center text-2xl font-light text-emerald-400">
              3
            </div>
            <div className="flex items-center gap-3">
              <Target className="w-6 h-6 text-emerald-500" />
              <h2 className="text-3xl font-light">Browse or Create a Challenge</h2>
            </div>
          </div>
          <div className="space-y-4 pl-16">
            <p className="text-gray-400 leading-relaxed text-lg">
              You can either join an existing challenge or create your own.
            </p>
            <div className="grid md:grid-cols-2 gap-6 mt-6">
              <div className="p-6 border border-white/10 bg-white/[0.01] rounded-xl">
                <h3 className="text-lg font-medium mb-3 text-emerald-400">Join a Challenge</h3>
                <ol className="space-y-2 text-sm text-gray-400 list-decimal list-inside">
                  <li>Go to the "Challenges" page</li>
                  <li>Browse available challenges</li>
                  <li>Click on a challenge to see details</li>
                  <li>Click "Join Challenge" and approve the transaction</li>
                  <li>Your SOL will be locked until the challenge ends</li>
                </ol>
              </div>
              <div className="p-6 border border-white/10 bg-white/[0.01] rounded-xl">
                <h3 className="text-lg font-medium mb-3 text-emerald-400">Create a Challenge</h3>
                <ol className="space-y-2 text-sm text-gray-400 list-decimal list-inside">
                  <li>Click "Create Challenge" in the navbar</li>
                  <li>Fill in the challenge details (name, type, duration, stake amount)</li>
                  <li>Set the maximum number of participants</li>
                  <li>Click "Create Challenge" and approve the transaction</li>
                  <li>Wait for others to join, then the challenge starts!</li>
                </ol>
              </div>
            </div>
          </div>
        </div>

        {/* Step 4: Verify Daily */}
        <div className="mb-16 space-y-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center text-2xl font-light text-emerald-400">
              4
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-emerald-500" />
              <h2 className="text-3xl font-light">Verify Your Progress Daily</h2>
            </div>
          </div>
          <div className="space-y-4 pl-16">
            <p className="text-gray-400 leading-relaxed text-lg">
              Once a challenge starts, you must verify your progress every single day.
            </p>
            <div className="space-y-4">
              <div className="p-6 border border-white/10 bg-white/[0.01] rounded-xl">
                <h3 className="text-lg font-medium mb-3 text-emerald-400">Lifestyle Challenges</h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Upload a photo or proof that you completed your goal (e.g., gym selfie, screen time screenshot). 
                  Our AI will verify it automatically.
                </p>
              </div>
              <div className="p-6 border border-white/10 bg-white/[0.01] rounded-xl">
                <h3 className="text-lg font-medium mb-3 text-emerald-400">Crypto Challenges</h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Verification happens automatically! We check your wallet on-chain. No action needed from you.
                </p>
              </div>
              <div className="p-6 border border-red-500/30 bg-red-500/5 rounded-xl">
                <p className="text-sm text-red-300 leading-relaxed">
                  <strong className="text-red-400">Warning:</strong> Missing even one day means you're eliminated 
                  and you lose your stake. Set reminders!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Step 5: Win or Lose */}
        <div className="mb-16 space-y-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center text-2xl font-light text-emerald-400">
              5
            </div>
            <div className="flex items-center gap-3">
              <Trophy className="w-6 h-6 text-emerald-500" />
              <h2 className="text-3xl font-light">Complete and Win (or Lose)</h2>
            </div>
          </div>
          <div className="space-y-4 pl-16">
            <p className="text-gray-400 leading-relaxed text-lg">
              When the challenge ends, rewards are automatically distributed.
            </p>
            <div className="grid md:grid-cols-2 gap-6 mt-6">
              <div className="p-6 border border-emerald-500/30 bg-emerald-500/5 rounded-xl">
                <h3 className="text-lg font-medium mb-3 text-emerald-400">If You Win</h3>
                <p className="text-sm text-gray-400 leading-relaxed mb-3">
                  You get your stake back plus a share of the prize pool. The prize pool comes from:
                </p>
                <ul className="space-y-2 text-sm text-gray-400 list-disc list-inside">
                  <li>Stakes from participants who failed</li>
                  <li>Any yield generated during the challenge</li>
                </ul>
              </div>
              <div className="p-6 border border-red-500/30 bg-red-500/5 rounded-xl">
                <h3 className="text-lg font-medium mb-3 text-red-400">If You Lose</h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  You forfeit your stake. It goes to the winners (in competitive mode) or to charity (in charity mode). 
                  This is why financial commitment works - real money creates real motivation.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="mb-16 space-y-6">
          <h2 className="text-3xl font-light mb-6">Pro Tips</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 border border-white/10 bg-white/[0.01] rounded-xl">
              <h3 className="text-lg font-medium mb-3 text-emerald-400">Start Small</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Don't stake more than you can afford to lose. Start with a small amount to get familiar with the platform.
              </p>
            </div>
            <div className="p-6 border border-white/10 bg-white/[0.01] rounded-xl">
              <h3 className="text-lg font-medium mb-3 text-emerald-400">Set Reminders</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Missing a single day means elimination. Set daily reminders on your phone to verify your progress.
              </p>
            </div>
            <div className="p-6 border border-white/10 bg-white/[0.01] rounded-xl">
              <h3 className="text-lg font-medium mb-3 text-emerald-400">Choose Realistic Goals</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Pick challenges you can actually complete. Overly ambitious goals lead to failure and lost stakes.
              </p>
            </div>
            <div className="p-6 border border-white/10 bg-white/[0.01] rounded-xl">
              <h3 className="text-lg font-medium mb-3 text-emerald-400">Keep Your Seed Phrase Safe</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Write it down and store it securely. If you lose it, you lose access to your wallet and any staked funds.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center p-12 border border-white/10 bg-white/[0.01] rounded-xl">
          <h2 className="text-3xl font-light mb-4">Ready to Start?</h2>
          <p className="text-gray-400 mb-8 max-w-xl mx-auto">
            You now know everything you need to get started. Create or join your first challenge!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/pools">
              <ButtonPrimary icon={ArrowRight}>Browse Challenges</ButtonPrimary>
            </Link>
            <Link href="/create" className="px-6 py-3 text-xs font-medium tracking-widest uppercase border border-white/20 hover:border-white text-white transition-all flex items-center justify-center">
              Create Challenge
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

