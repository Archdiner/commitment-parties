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
             <span className="text-[9px] uppercase tracking-widest text-gray-300">AI-Powered Accountability Protocol</span>
          </div>
          <h1 className="text-6xl md:text-8xl font-medium tracking-tighter leading-[0.9] mb-8">
            Turn Commitments<br/>
            into <span className="text-emerald-500 font-serif italic font-light">Capital.</span>
          </h1>
          <p className="max-w-xl mx-auto text-gray-400 font-light text-lg mb-12">
            Stake SOL on your goals. Allow us to verify your progress <br/>
            Win and earn SOL. Fail and lose SOL. Nothing creates accountability faster.
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

      {/* How It Works (Minimalist) */}
      <div className="border-y border-white/10 bg-white/[0.01]">
        <div className="max-w-6xl mx-auto px-6 py-20 grid grid-cols-1 md:grid-cols-3 gap-12">
          {[
            { icon: Target, title: "01. Create or Join", desc: "Select a habit protocol. Lock SOL in the smart contract to commit." },
            { icon: Zap, title: "02. Auto-Verification", desc: "AI agents monitor GitHub API, GPS, or Vision to verify daily." },
            { icon: Trophy, title: "03. Settlement", desc: "Winners split the pool." }
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
             <p className="text-gray-500 font-light text-sm max-w-sm mb-8">
               On-chain verification for holding (HODL), staking, and DCA consistency.
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
             <p className="text-gray-500 font-light text-sm max-w-sm mb-8">
               Computer vision and GPS verification for real-world habits.
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
