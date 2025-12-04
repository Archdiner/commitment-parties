'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Zap, Target, Shield, Users, Code, Rocket } from 'lucide-react';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { ButtonPrimary } from '@/components/ui/ButtonPrimary';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-white pt-32 px-6 pb-20">
      <div className="max-w-4xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-20">
          <SectionLabel>About Us</SectionLabel>
          <h1 className="text-5xl md:text-6xl font-light tracking-tighter mb-6">
            Turning Commitments<br/>
            into <span className="text-emerald-500 font-serif italic font-light">Capital</span>
          </h1>
          <p className="text-lg text-gray-400 leading-relaxed max-w-2xl mx-auto">
            Commitment Agent is an AI-powered accountability protocol built on Solana. 
            We help you achieve your goals by putting real money on the line.
          </p>
        </div>

        {/* Mission */}
        <div className="mb-20 space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <Target className="w-6 h-6 text-emerald-500" />
            <h2 className="text-2xl font-light">Our Mission</h2>
          </div>
          <p className="text-gray-400 leading-relaxed text-lg">
            We believe that financial commitment is the most powerful motivator for achieving goals. 
            Traditional goal-setting often fails because there's no real consequence for giving up. 
            Commitment Agent changes that by locking your money in a smart contract until you prove 
            you've completed your commitment.
          </p>
          <p className="text-gray-400 leading-relaxed text-lg">
            Whether you want to build better habits, stick to a fitness routine, or commit to 
            crypto trading strategies, our platform uses AI-powered verification to ensure 
            accountability—automatically and transparently.
          </p>
        </div>

        {/* How It Works */}
        <div className="mb-20 space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <Zap className="w-6 h-6 text-emerald-500" />
            <h2 className="text-2xl font-light">How It Works</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="space-y-3">
              <div className="text-3xl font-light text-emerald-500 mb-2">01</div>
              <h3 className="text-lg font-medium">Create or Join</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Set up a challenge or join an existing one. Put down your stake (SOL) to commit. 
                This money is locked in a smart contract until the challenge ends.
              </p>
            </div>
            <div className="space-y-3">
              <div className="text-3xl font-light text-emerald-500 mb-2">02</div>
              <h3 className="text-lg font-medium">AI Verification</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Our AI agents automatically verify your progress daily. For lifestyle challenges, 
                you upload photos. For crypto challenges, we check your wallet on-chain.
              </p>
            </div>
            <div className="space-y-3">
              <div className="text-3xl font-light text-emerald-500 mb-2">03</div>
              <h3 className="text-lg font-medium">Win or Lose</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Complete your challenge and split the prize pool with other winners. 
                Fail and you lose your stake. Simple, transparent, effective.
              </p>
            </div>
          </div>
        </div>

        {/* Technology */}
        <div className="mb-20 space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <Code className="w-6 h-6 text-emerald-500" />
            <h2 className="text-2xl font-light">Technology</h2>
          </div>
          <div className="space-y-4">
            <p className="text-gray-400 leading-relaxed">
              Commitment Agent is built on <strong className="text-white">Solana</strong>, 
              one of the fastest and most cost-effective blockchains. This means:
            </p>
            <ul className="space-y-3 text-gray-400">
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-2 flex-shrink-0" />
                <span><strong className="text-white">Low fees:</strong> Transactions cost fractions of a cent, making it accessible for everyone</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-2 flex-shrink-0" />
                <span><strong className="text-white">Fast settlement:</strong> Challenges start and settle in seconds, not days</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-2 flex-shrink-0" />
                <span><strong className="text-white">Transparent:</strong> All transactions are on-chain and verifiable</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-2 flex-shrink-0" />
                <span><strong className="text-white">AI-powered:</strong> Our verification system uses advanced AI to automatically check progress</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Security */}
        <div className="mb-20 space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-6 h-6 text-emerald-500" />
            <h2 className="text-2xl font-light">Security & Trust</h2>
          </div>
          <div className="space-y-4">
            <p className="text-gray-400 leading-relaxed">
              Your funds are secured by smart contracts on the Solana blockchain. 
              Once you stake SOL, it's locked until the challenge ends—no one can 
              withdraw it early, including us.
            </p>
            <div className="p-6 border border-white/10 bg-white/[0.02] rounded-xl">
              <p className="text-sm text-gray-400 leading-relaxed">
                <strong className="text-white">PLACEHOLDER:</strong> Smart contract audit information, 
                security measures, and trust guarantees will be detailed here.
              </p>
            </div>
          </div>
        </div>

        {/* Team */}
        <div className="mb-20 space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <Users className="w-6 h-6 text-emerald-500" />
            <h2 className="text-2xl font-light">Team</h2>
          </div>
          <div className="p-6 border border-white/10 bg-white/[0.02] rounded-xl">
            <p className="text-sm text-gray-400 leading-relaxed">
              <strong className="text-white">PLACEHOLDER:</strong> Team member profiles, backgrounds, 
              and photos will be displayed here.
            </p>
          </div>
        </div>

        {/* Roadmap */}
        <div className="mb-20 space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <Rocket className="w-6 h-6 text-emerald-500" />
            <h2 className="text-2xl font-light">Roadmap</h2>
          </div>
          <div className="p-6 border border-white/10 bg-white/[0.02] rounded-xl">
            <p className="text-sm text-gray-400 leading-relaxed">
              <strong className="text-white">PLACEHOLDER:</strong> Future features, milestones, 
              and development timeline will be outlined here.
            </p>
          </div>
        </div>

        {/* Values */}
        <div className="mb-20 space-y-6">
          <h2 className="text-2xl font-light mb-6">Our Values</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 border border-white/10 bg-white/[0.01] rounded-xl">
              <h3 className="text-lg font-medium mb-3 text-emerald-400">Transparency</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Everything happens on-chain. No hidden fees, no surprises. 
                You can verify every transaction yourself.
              </p>
            </div>
            <div className="p-6 border border-white/10 bg-white/[0.01] rounded-xl">
              <h3 className="text-lg font-medium mb-3 text-emerald-400">Accessibility</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Low fees and simple UX make goal-setting accessible to everyone, 
                not just crypto natives.
              </p>
            </div>
            <div className="p-6 border border-white/10 bg-white/[0.01] rounded-xl">
              <h3 className="text-lg font-medium mb-3 text-emerald-400">Accountability</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Real money creates real motivation. We believe in the power 
                of financial commitment to drive behavior change.
              </p>
            </div>
            <div className="p-6 border border-white/10 bg-white/[0.01] rounded-xl">
              <h3 className="text-lg font-medium mb-3 text-emerald-400">Innovation</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                We're pushing the boundaries of what's possible with AI and 
                blockchain technology to help people achieve their goals.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center p-12 border border-white/10 bg-white/[0.01] rounded-xl">
          <h2 className="text-3xl font-light mb-4">Ready to Commit?</h2>
          <p className="text-gray-400 mb-8 max-w-xl mx-auto">
            Join thousands of people who are turning their goals into reality 
            with financial accountability.
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
