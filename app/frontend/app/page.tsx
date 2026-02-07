'use client';

import { Zap, Target, Trophy, ArrowRight, Mail, User, CheckCircle, Loader2 } from 'lucide-react';
import { ButtonPrimary } from '@/components/ui/ButtonPrimary';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { useEffect, useRef, useState } from 'react';
import { submitWaitlistSignup } from '@/lib/api';

// Animated underline component with green shade variants
function AnimatedUnderline({ 
  children, 
  delay = 0, 
  duration = 2000,
  variant = 'emerald',
  className = '' 
}: { 
  children: React.ReactNode; 
  delay?: number;
  duration?: number;
  variant?: 'dark' | 'emerald' | 'pale';
  className?: string;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), delay);
        }
      },
      { threshold: 0.2 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [delay]);

  const getVariantStyles = () => {
    switch (variant) {
      case 'dark':
        return {
          height: '2px',
          backgroundColor: '#059669',
          bottom: '0px',
          left: '0px',
        };
      case 'pale':
        return {
          height: '2px',
          backgroundColor: '#6ee7b7',
          bottom: '0px',
          left: '0px',
        };
      default:
        return {
          height: '2px',
          backgroundColor: '#34d399',
          bottom: '0px',
          left: '0px',
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div ref={ref} className={`relative inline-block ${className}`}>
      {children}
      <span
        className="absolute transition-all ease-out"
        style={{
          ...styles,
          width: isVisible ? '100%' : '0%',
          transitionDuration: `${duration}ms`,
        }}
      />
    </div>
  );
}


export default function LandingPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    whyUse: '',
    whatWantToSee: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const formRef = useRef<HTMLDivElement>(null);

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!formData.name.trim() || !formData.email.trim()) {
      setErrorMessage('Please enter your name and email.');
      return;
    }

    setIsSubmitting(true);

    try {
      await submitWaitlistSignup({
        name: formData.name.trim(),
        email: formData.email.trim(),
        auth_method: 'manual',
        why_use: formData.whyUse.trim() || undefined,
        what_want_to_see: formData.whatWantToSee.trim() || undefined,
      });
      setIsSubmitted(true);
    } catch (error: any) {
      console.error('Waitlist signup failed:', error);
      setErrorMessage(error?.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <p className="max-w-xl mx-auto text-gray-200 font-light text-xl mb-6">
            Put money on your goals. We verify your progress automatically. <br/>
            Succeed and earn money. Fail and lose your stake. Nothing creates accountability faster.
          </p>
          <div className="max-w-xl mx-auto mb-12 p-4 border border-emerald-500/20 bg-emerald-500/5 rounded-lg">
            <p className="text-sm text-gray-200 leading-relaxed text-center">
              <span className="text-emerald-400 font-medium">We're building something special.</span> Sign up below to be the first to know when CommitMint launches.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <ButtonPrimary icon={ArrowRight} onClick={scrollToForm}>
              Join the Waitlist
            </ButtonPrimary>
          </div>
        </div>
      </div>

      {/* Why This Exists */}
      <div className="border-y border-white/10 bg-white/[0.01]">
        <div className="max-w-4xl mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <AnimatedUnderline delay={0} duration={1500} variant="dark">
              <h2 className="text-4xl md:text-5xl font-medium mb-4 text-white">Why This Exists</h2>
            </AnimatedUnderline>
            <p className="text-xl text-gray-200 max-w-2xl mx-auto leading-relaxed mt-6">
              Most accountability methods fail because there's no real consequence. 
              We solve this by putting real money on the line.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-8 border border-white/20 bg-white/[0.03] rounded-lg">
              <h3 className="text-2xl font-medium mb-4 text-white">The Problem</h3>
              <p className="text-base text-gray-200 leading-relaxed">
                90% of New Year's resolutions fail. Habit trackers get ignored. 
                Gym buddies let you skip. There's no real cost to quitting.
              </p>
            </div>
            <div className="p-8 border border-emerald-500/30 bg-emerald-500/10 rounded-lg">
              <h3 className="text-2xl font-medium mb-4 text-white">Our Solution</h3>
              <p className="text-base text-white leading-relaxed">
                Put real money down. Your stake is locked in a smart contract. 
                Complete your goal and win. Fail and lose your stake. 
                Financial stakes create real motivation.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="border-y border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="text-center mb-16">
            <AnimatedUnderline delay={0} duration={1500} variant="emerald">
              <h2 className="text-4xl md:text-5xl font-medium mb-4 text-white">How It Works</h2>
            </AnimatedUnderline>
            <p className="text-xl text-gray-200 max-w-2xl mx-auto mt-6">
              Three simple steps. Your money is safe, locked in a smart contract until the challenge ends.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {[
              { 
                icon: Target, 
                title: "1. Create or Join", 
                desc: "Browse existing challenges or create your own. Set your goal, stake amount, and duration. Put money down to commit.",
                details: "You can join with as little as $5. Your stake is held securely in a smart contract."
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
                <h3 className="text-xl font-medium mb-4 text-white px-2 py-1">{item.title}</h3>
                <p className="text-base text-gray-200 leading-relaxed max-w-xs mb-3">{item.desc}</p>
                <p className="text-sm text-gray-400 italic">{item.details}</p>
              </div>
            ))}
          </div>

          {/* Example Calculation */}
          <div className="max-w-2xl mx-auto p-8 border border-white/20 bg-white/[0.03] rounded-lg">
            <h3 className="text-2xl font-medium mb-6 text-white">Example: How Rewards Work</h3>
            <div className="space-y-4 text-base">
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <span className="text-gray-200">10 people join at $50 each</span>
                <span className="font-mono text-white font-medium">$500 total</span>
              </div>
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <span className="text-gray-200">3 people fail to complete</span>
                <span className="font-mono text-gray-300 font-medium">$150 (lost stakes)</span>
              </div>
              <div className="flex items-center justify-between p-4 border-b border-emerald-500/30">
                <span className="text-gray-200">7 winners split the pot</span>
                <span className="font-mono text-emerald-400 font-medium">~$21 each</span>
              </div>
              <div className="pt-4 border-t border-white/10">
                <p className="text-sm text-gray-300 leading-relaxed">
                  Each winner gets their $50 stake back, plus ~$21 from the prize pool ($150 / 7 winners). 
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
          <AnimatedUnderline delay={0} duration={1500} variant="pale">
            <h2 className="text-4xl md:text-5xl font-medium mb-4 text-white">Types of Challenges</h2>
          </AnimatedUnderline>
          <p className="text-xl text-gray-200 max-w-2xl mx-auto mt-6">
            Choose the type of commitment that fits your goals. All challenges work the same way - put money down, verify daily, win or lose.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-white/10 border border-white/10">
          <div className="group p-12 bg-[#050505] relative">
             <SectionLabel>Protocol A</SectionLabel>
             <h3 className="text-3xl font-medium mb-4 text-white">Crypto<br/>Challenges</h3>
             <p className="text-gray-200 font-light text-base max-w-sm mb-4 leading-relaxed">
               Automatically verified on-chain. Hold tokens (HODL) or make daily trades (DCA). 
               No manual check-ins needed - we check your wallet automatically.
             </p>
             <ul className="space-y-2 text-sm text-gray-300 font-mono uppercase tracking-wide mb-6">
               <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-emerald-400 rounded-full"/> Diamond Hands</li>
               <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-emerald-400 rounded-full"/> Wallet Activity</li>
             </ul>
             <p className="text-xs text-gray-400">
               Perfect for committing to crypto investment habits
             </p>
          </div>
          <div className="group p-12 bg-[#050505] relative">
             <SectionLabel>Protocol B</SectionLabel>
             <h3 className="text-3xl font-medium mb-4 text-white">Lifestyle<br/>Optimization</h3>
             <p className="text-gray-200 font-light text-base max-w-sm mb-4 leading-relaxed">
               For real-world goals. Upload photos or screenshots as proof. Our AI verifies your check-ins automatically.
             </p>
             <ul className="space-y-2 text-sm text-gray-300 font-mono uppercase tracking-wide mb-6">
               <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-cyan-400 rounded-full"/> Screen Time</li>
               <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-cyan-400 rounded-full"/> Gym Attendance</li>
             </ul>
             <p className="text-xs text-gray-400">
               Perfect for gym, coding, productivity, or any daily habit
             </p>
          </div>
        </div>
      </div>

      {/* Waitlist Signup Form */}
      <div ref={formRef} className="border-y border-white/10 bg-white/[0.01]">
        <div className="max-w-2xl mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <AnimatedUnderline delay={0} duration={1500} variant="emerald">
              <h2 className="text-4xl md:text-5xl font-medium mb-4 text-white">Get Early Access</h2>
            </AnimatedUnderline>
            <p className="text-xl text-gray-200 max-w-xl mx-auto mt-6">
              Be the first to know when CommitMint launches. Join the waitlist and help us build what you need.
            </p>
          </div>

          {isSubmitted ? (
            <div className="text-center p-12 border border-emerald-500/30 bg-emerald-500/5 rounded-lg">
              <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
              <h3 className="text-2xl font-medium text-white mb-3">You're on the list!</h3>
              <p className="text-gray-300 text-base leading-relaxed">
                Thanks for signing up. We'll reach out when CommitMint is ready for you.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-xs uppercase tracking-widest text-gray-500 mb-2">
                    Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      id="name"
                      type="text"
                      placeholder="Your name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full bg-white/[0.03] border border-white/10 focus:border-emerald-500/50 rounded-lg px-4 py-3 pl-10 text-sm text-white placeholder-gray-600 outline-none transition-colors"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="email" className="block text-xs uppercase tracking-widest text-gray-500 mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full bg-white/[0.03] border border-white/10 focus:border-emerald-500/50 rounded-lg px-4 py-3 pl-10 text-sm text-white placeholder-gray-600 outline-none transition-colors"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Why do you want to use CommitMint? */}
              <div>
                <label htmlFor="whyUse" className="block text-xs uppercase tracking-widest text-gray-500 mb-2">
                  Why do you want to use CommitMint?
                </label>
                <textarea
                  id="whyUse"
                  placeholder="What goals are you trying to hit? What's held you back before?"
                  value={formData.whyUse}
                  onChange={(e) => setFormData(prev => ({ ...prev, whyUse: e.target.value }))}
                  rows={3}
                  className="w-full bg-white/[0.03] border border-white/10 focus:border-emerald-500/50 rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 outline-none transition-colors resize-none"
                />
              </div>

              {/* What would you like to see? */}
              <div>
                <label htmlFor="whatWantToSee" className="block text-xs uppercase tracking-widest text-gray-500 mb-2">
                  What would you like to see from CommitMint?
                </label>
                <textarea
                  id="whatWantToSee"
                  placeholder="What features matter most to you? What would make this app a must-have?"
                  value={formData.whatWantToSee}
                  onChange={(e) => setFormData(prev => ({ ...prev, whatWantToSee: e.target.value }))}
                  rows={3}
                  className="w-full bg-white/[0.03] border border-white/10 focus:border-emerald-500/50 rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 outline-none transition-colors resize-none"
                />
              </div>

              {/* Error Message */}
              {errorMessage && (
                <div className="p-3 border border-red-500/30 bg-red-500/5 rounded-lg">
                  <p className="text-sm text-red-400">{errorMessage}</p>
                </div>
              )}

              {/* Submit */}
              <div className="pt-2">
                <ButtonPrimary
                  type="submit"
                  disabled={isSubmitting}
                  icon={isSubmitting ? Loader2 : ArrowRight}
                  className="w-full"
                >
                  {isSubmitting ? 'Signing up...' : 'Join the Waitlist'}
                </ButtonPrimary>
                <p className="text-xs text-gray-600 text-center mt-3">
                  We'll never share your email. Unsubscribe anytime.
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
