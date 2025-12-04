'use client';

import Link from 'next/link';
import { ArrowRight, Zap, Target, Trophy } from 'lucide-react';
import { ButtonPrimary } from '@/components/ui/ButtonPrimary';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { InfoIcon } from '@/components/ui/Tooltip';

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
            <div className="flex items-start gap-3 text-xs text-gray-500">
              <InfoIcon content="SOL is a digital currency (like dollars, but digital). You'll need a free wallet app called 'Phantom' to get started. Think of it like a digital bank account for your commitment money." />
              <div>
                <p className="font-medium text-gray-400 mb-1">What is SOL?</p>
                <p className="leading-relaxed">
                  SOL is a digital currency. You'll need a free wallet app called "Phantom" to get started.
                </p>
              </div>
            </div>
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

      {/* How It Works (Minimalist) */}
      <div className="border-y border-white/10 bg-white/[0.01]">
        <div className="max-w-6xl mx-auto px-6 py-20 grid grid-cols-1 md:grid-cols-3 gap-12">
          {[
            { 
              icon: Target, 
              title: "01. Create or Join", 
              desc: "Choose a challenge or create your own. Put money down to commit (this money is locked until the challenge ends)." 
            },
            { 
              icon: Zap, 
              title: "02. Auto-Verification", 
              desc: "Our system automatically checks if you're meeting your goal each day. No manual tracking needed." 
            },
            { 
              icon: Trophy, 
              title: "03. Get Rewarded", 
              desc: "If you complete your challenge, you split the prize pool with other winners. If you fail, you lose your stake." 
            }
          ].map((item, i) => (
            <div key={i} className="flex flex-col items-start group">
              <div className="mb-6 text-emerald-500 opacity-50 group-hover:opacity-100 transition-opacity">
                <item.icon strokeWidth={1} className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-light mb-3">{item.title}</h3>
              <p className="text-sm text-gray-500 font-light leading-relaxed max-w-xs">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Arenas (Wireframe Style) */}
      <div className="max-w-6xl mx-auto px-6 py-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-white/10 border border-white/10">
          <Link href="/pools?type=crypto" className="group p-12 bg-[#050505] hover:bg-white/[0.01] transition-colors cursor-pointer relative">
             <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRight className="w-4 h-4 text-emerald-500" />
             </div>
             <SectionLabel>Protocol A</SectionLabel>
             <h3 className="text-3xl font-light mb-4">Crypto<br/>Challenges</h3>
             <p className="text-gray-500 font-light text-sm max-w-sm mb-4">
               Challenges that automatically verify your crypto activity (like holding tokens or making regular trades).
             </p>
             <p className="text-[10px] text-gray-600 mb-8">
               Perfect if you want to commit to crypto trading habits.
             </p>
             <ul className="space-y-2 text-xs text-gray-400 font-mono uppercase tracking-wide">
               <li className="flex items-center gap-2"><div className="w-1 h-1 bg-gray-600 rounded-full"/> Diamond Hands</li>
               <li className="flex items-center gap-2"><div className="w-1 h-1 bg-gray-600 rounded-full"/> Wallet Activity</li>
             </ul>
          </Link>
          <Link href="/pools?type=lifestyle" className="group p-12 bg-[#050505] hover:bg-white/[0.01] transition-colors cursor-pointer relative">
             <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRight className="w-4 h-4 text-emerald-500" />
             </div>
             <SectionLabel>Protocol B</SectionLabel>
             <h3 className="text-3xl font-light mb-4">Lifestyle<br/>Optimization</h3>
             <p className="text-gray-500 font-light text-sm max-w-sm mb-4">
               Challenges for real-life habits like gym attendance, screen time limits, or daily routines.
             </p>
             <p className="text-[10px] text-gray-600 mb-8">
               You submit photos or check-ins to prove you're sticking to your commitment.
             </p>
             <ul className="space-y-2 text-xs text-gray-400 font-mono uppercase tracking-wide">
               <li className="flex items-center gap-2"><div className="w-1 h-1 bg-gray-600 rounded-full"/> Screen Time</li>
               <li className="flex items-center gap-2"><div className="w-1 h-1 bg-gray-600 rounded-full"/> Gym Attendance</li>
             </ul>
          </Link>
        </div>
      </div>
    </div>
  );
}
