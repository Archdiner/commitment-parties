'use client';

import Link from 'next/link';
import { ArrowRight, Zap, Target, Trophy } from 'lucide-react';
import { ButtonPrimary } from '@/components/ui/ButtonPrimary';
import { SectionLabel } from '@/components/ui/SectionLabel';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-white pt-16">
      {/* Hero */}
      <div className="relative pt-32 pb-24 px-6 flex flex-col items-center text-center overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="relative z-10 max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-8 border border-white/10 rounded-full bg-white/5">
             <Zap className="w-3 h-3 text-emerald-400" />
             <span className="text-[9px] uppercase tracking-widest text-gray-300">AI-Powered Commitment Platform</span>
          </div>
          <h1 className="text-6xl md:text-8xl font-medium tracking-tighter leading-[0.9] mb-8">
            Turn Commitments<br/>
            into <span className="text-emerald-500 font-serif italic font-light">Capital.</span>
          </h1>
          <p className="max-w-xl mx-auto text-gray-400 font-light text-lg mb-6">
            Put money on your goals. We verify your progress automatically. <br/>
            Succeed and earn money. Fail and lose your stake. Nothing creates accountability faster.
          </p>
          <div className="max-w-xl mx-auto mb-12 p-4 border border-white/10 bg-white/[0.02] rounded-lg">
            <p className="text-xs text-gray-400 leading-relaxed text-center">
              <span className="text-emerald-400">No crypto experience needed.</span> Sign in with your email to get started. 
              We'll create a wallet for you automatically. You can connect your own wallet later if you prefer.
            </p>
          </div>
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

      {/* Why This Exists */}
      <div className="border-y border-white/10 bg-white/[0.01]">
        <div className="max-w-4xl mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-light mb-4">Why This Exists</h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
              Most accountability methods fail because there's no real consequence. 
              We solve this by putting real money on the line.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 border border-white/10 bg-white/[0.02] rounded-lg">
              <h3 className="text-lg font-light mb-3">The Problem</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                90% of New Year's resolutions fail. Habit trackers get ignored. 
                Gym buddies let you skip. There's no real cost to quitting.
              </p>
            </div>
            <div className="p-6 border border-emerald-500/20 bg-emerald-500/5 rounded-lg">
              <h3 className="text-lg font-light mb-3">Our Solution</h3>
              <p className="text-sm text-gray-300 leading-relaxed">
                Put real money down. Your stake is locked in a smart contract. 
                Complete your goal and win. Fail and lose your stake. 
                Financial stakes create real motivation.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works - Expanded */}
      <div className="border-y border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-light mb-4">How It Works</h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              Three simple steps. Your money is safe, locked in a smart contract until the challenge ends.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {[
              { 
                icon: Target, 
                title: "1. Create or Join", 
                desc: "Browse existing challenges or create your own. Set your goal, stake amount, and duration. Put money down to commit—this money is locked until the challenge ends.",
                details: "You can join with as little as 0.05 SOL. Your stake is held securely in a smart contract."
              },
              { 
                icon: Zap, 
                title: "2. Verify Daily", 
                desc: "Our AI automatically checks if you're meeting your goal each day. For crypto challenges, we check your wallet. For lifestyle challenges, you upload proof.",
                details: "Missing even one day means you're eliminated. Set reminders!"
              },
              { 
                icon: Trophy, 
                title: "3. Win or Lose", 
                desc: "If you complete your challenge, you split the prize pool with other winners. If you fail, you lose your stake to the winners.",
                details: "Winners get their stake back plus a share of losers' stakes and any yield earned."
              }
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-start group">
                <div className="mb-6 text-emerald-500 opacity-50 group-hover:opacity-100 transition-opacity">
                  <item.icon strokeWidth={1} className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-light mb-3">{item.title}</h3>
                <p className="text-sm text-gray-500 font-light leading-relaxed max-w-xs mb-2">{item.desc}</p>
                <p className="text-xs text-gray-600 italic">{item.details}</p>
              </div>
            ))}
          </div>

          {/* Example Calculation */}
          <div className="max-w-2xl mx-auto p-8 border border-white/10 bg-white/[0.02] rounded-lg">
            <h3 className="text-xl font-light mb-6">Example: How Rewards Work</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between p-3 border-b border-white/5">
                <span className="text-gray-400">10 people join at 1 SOL each</span>
                <span className="font-mono text-white">10 SOL total</span>
              </div>
              <div className="flex items-center justify-between p-3 border-b border-white/5">
                <span className="text-gray-400">3 people fail to complete</span>
                <span className="font-mono text-gray-300">3 SOL (lost stakes)</span>
              </div>
              <div className="flex items-center justify-between p-3 border-b border-emerald-500/20">
                <span className="text-gray-400">7 winners split the pot</span>
                <span className="font-mono text-emerald-400">~0.43 SOL each</span>
              </div>
              <div className="pt-4 border-t border-white/10">
                <p className="text-xs text-gray-500 leading-relaxed">
                  Each winner gets their 1 SOL stake back, plus ~0.43 SOL from the prize pool (3 SOL ÷ 7 winners). 
                  Plus any yield earned during the challenge period.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Challenge Types */}
      <div className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-light mb-4">Types of Challenges</h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Choose the type of commitment that fits your goals. All challenges work the same way—put money down, verify daily, win or lose.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-white/10 border border-white/10">
          <Link href="/pools?type=crypto" className="group p-12 bg-[#050505] hover:bg-white/[0.01] transition-colors cursor-pointer relative">
             <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRight className="w-4 h-4 text-emerald-500" />
             </div>
             <SectionLabel>Protocol A</SectionLabel>
             <h3 className="text-3xl font-light mb-4">Crypto<br/>Challenges</h3>
             <p className="text-gray-400 font-light text-sm max-w-sm mb-4 leading-relaxed">
               Automatically verified on-chain. Hold tokens (HODL) or make daily trades (DCA). 
               No manual check-ins needed—we check your wallet automatically.
             </p>
             <ul className="space-y-2 text-xs text-gray-400 font-mono uppercase tracking-wide mb-6">
               <li className="flex items-center gap-2"><div className="w-1 h-1 bg-gray-600 rounded-full"/> Diamond Hands</li>
               <li className="flex items-center gap-2"><div className="w-1 h-1 bg-gray-600 rounded-full"/> Wallet Activity</li>
             </ul>
             <p className="text-[10px] text-gray-600">
               Perfect for committing to crypto investment habits
             </p>
          </Link>
          <Link href="/pools?type=lifestyle" className="group p-12 bg-[#050505] hover:bg-white/[0.01] transition-colors cursor-pointer relative">
             <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRight className="w-4 h-4 text-emerald-500" />
             </div>
             <SectionLabel>Protocol B</SectionLabel>
             <h3 className="text-3xl font-light mb-4">Lifestyle<br/>Optimization</h3>
             <p className="text-gray-400 font-light text-sm max-w-sm mb-4 leading-relaxed">
               For real-world goals. Upload photos or screenshots as proof. Our AI verifies your check-ins automatically.
             </p>
             <ul className="space-y-2 text-xs text-gray-400 font-mono uppercase tracking-wide mb-6">
               <li className="flex items-center gap-2"><div className="w-1 h-1 bg-gray-600 rounded-full"/> Screen Time</li>
               <li className="flex items-center gap-2"><div className="w-1 h-1 bg-gray-600 rounded-full"/> Gym Attendance</li>
             </ul>
             <p className="text-[10px] text-gray-600">
               Perfect for gym, coding, productivity, or any daily habit
             </p>
          </Link>
        </div>
      </div>

      {/* Get Started CTA */}
      <div className="border-y border-white/10 bg-white/[0.01]">
        <div className="max-w-4xl mx-auto px-6 py-20 text-center">
          <h2 className="text-3xl md:text-4xl font-light mb-6">Ready to Get Started?</h2>
          <p className="text-lg text-gray-400 mb-8 max-w-2xl mx-auto">
            Sign in with your email to begin. No crypto experience needed—we'll handle everything.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/pools">
              <ButtonPrimary icon={ArrowRight}>Browse Challenges</ButtonPrimary>
            </Link>
            <Link 
              href="/create" 
              className="px-6 py-3 text-xs font-medium tracking-widest uppercase border border-white/20 hover:border-white text-white transition-all flex items-center justify-center"
            >
              Create Challenge
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
