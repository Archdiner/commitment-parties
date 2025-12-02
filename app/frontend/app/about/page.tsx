'use client';

import Link from 'next/link';
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { getPersistedWalletAddress, persistWalletAddress, clearPersistedWalletAddress } from '@/lib/wallet';
import {
  Wallet,
  Trophy,
  Target,
  Users,
  Clock,
  Plus,
  TrendingUp,
  Activity,
  X,
  Search,
  Zap,
  Flame,
  Leaf,
  Loader2,
  AlertCircle,
  ExternalLink,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Info,
  DollarSign,
  Calendar,
  User as UserIcon,
  Shield,
  AlertTriangle,
  Sparkles,
  Menu,
  Home,
  Grid,
  Medal,
  BarChart3,
  PieChart,
  Bot,
  Coins,
  PiggyBank,
  Smartphone,
  Eye,
  Star,
  Github,
  Twitter,
  Heart,
  Globe,
  Cpu,
  Database,
  ZapIcon,
  Check,
  XIcon
} from 'lucide-react';

// --- CONFIGURATION ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// --- Components ---

const Navbar = ({
  walletConnected,
  walletAddress,
  onConnect,
  balance
}: {
  walletConnected: boolean;
  walletAddress: string;
  onConnect: () => void;
  balance: number | null;
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="bg-white/80 backdrop-blur-lg border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-2 rounded-xl shadow-lg">
              <Leaf className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 leading-none tracking-tight">Commitment Agent</h1>
              <span className="text-xs text-emerald-600 font-bold tracking-wide uppercase">AI-Powered Accountability</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/" className="text-slate-700 hover:text-emerald-600 font-medium transition-colors">Home</Link>
            <Link href="/pools" className="text-slate-700 hover:text-emerald-600 font-medium transition-colors">Pools</Link>
            <Link href="/leaderboard" className="text-slate-700 hover:text-emerald-600 font-medium transition-colors">Leaderboard</Link>
            <Link href="/dashboard" className="text-slate-700 hover:text-emerald-600 font-medium transition-colors">Dashboard</Link>
            <Link href="/about" className="text-slate-700 hover:text-emerald-600 font-medium transition-colors">About</Link>
          </nav>

          <div className="flex items-center gap-4">
            {walletConnected && balance !== null && (
              <div className="hidden lg:flex flex-col items-end text-sm">
                <span className="text-slate-500 text-xs font-medium">Balance</span>
                <span className="font-bold text-slate-900">{balance.toFixed(2)} SOL</span>
              </div>
            )}

            <Link
              href="/create"
              className="hidden md:flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-all shadow-md hover:shadow-lg"
            >
              <Plus className="w-4 h-4" />
              Create Pool
            </Link>

            <button
              onClick={onConnect}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all border ${
                walletConnected
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm'
                  : 'bg-slate-900 text-white hover:bg-emerald-600 hover:border-emerald-600 border-transparent shadow-md'
              }`}
            >
              <Wallet className="w-4 h-4" />
              {walletConnected
                ? `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`
                : 'Connect Wallet'}
            </button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-600"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-gray-100">
            <nav className="flex flex-col gap-4">
              <Link href="/" className="flex items-center gap-2 text-slate-700 hover:text-emerald-600 font-medium">
                <Home className="w-4 h-4" /> Home
              </Link>
              <Link href="/pools" className="flex items-center gap-2 text-slate-700 hover:text-emerald-600 font-medium">
                <Grid className="w-4 h-4" /> Pools
              </Link>
              <Link href="/leaderboard" className="flex items-center gap-2 text-slate-700 hover:text-emerald-600 font-medium">
                <Medal className="w-4 h-4" /> Leaderboard
              </Link>
              <Link href="/dashboard" className="flex items-center gap-2 text-slate-700 hover:text-emerald-600 font-medium">
                <UserIcon className="w-4 h-4" /> Dashboard
              </Link>
              <Link href="/about" className="flex items-center gap-2 text-slate-700 hover:text-emerald-600 font-medium">
                <Info className="w-4 h-4" /> About
              </Link>
              <Link href="/create" className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium">
                <Plus className="w-4 h-4" /> Create Pool
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

const Hero = () => (
  <div className="bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50 border-b border-gray-200 py-16">
    <div className="max-w-4xl mx-auto px-4 text-center">
      <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
        About Commitment Agent
      </h1>
      <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
        An autonomous AI-powered accountability platform that transforms personal commitments
        into competitive games with real financial stakes on Solana.
      </p>
    </div>
  </div>
);

const ProblemSolution = () => (
  <div className="py-20 bg-white">
    <div className="max-w-6xl mx-auto px-4">
      <div className="grid md:grid-cols-2 gap-12 items-center">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 mb-6">The Problem</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <XIcon className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-slate-600">
                Traditional habit trackers rely on willpower alone, with success rates below 20%
              </p>
            </div>
            <div className="flex items-start gap-3">
              <XIcon className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-slate-600">
                Social accountability lacks real consequences for failure
              </p>
            </div>
            <div className="flex items-start gap-3">
              <XIcon className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-slate-600">
                No financial incentives to follow through on personal commitments
              </p>
            </div>
            <div className="flex items-start gap-3">
              <XIcon className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-slate-600">
                Manual tracking and verification is time-consuming and error-prone
              </p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-3xl font-bold text-slate-900 mb-6">Our Solution</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
              <p className="text-slate-600">
                <strong>Real stakes:</strong> Financial consequences create genuine accountability
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
              <p className="text-slate-600">
                <strong>AI automation:</strong> 24/7 monitoring with on-chain verification
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
              <p className="text-slate-600">
                <strong>Social pressure:</strong> Compete against others in the same challenge
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
              <p className="text-slate-600">
                <strong>Tangible rewards:</strong> Winners share the prize pool and social recognition
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const TechStack = () => (
  <div className="py-20 bg-slate-50">
    <div className="max-w-6xl mx-auto px-4">
      <div className="text-center mb-16">
        <h2 className="text-4xl font-bold text-slate-900 mb-4">Technology Stack</h2>
        <p className="text-xl text-slate-600 max-w-2xl mx-auto">
          Built on cutting-edge blockchain and AI technology for maximum transparency and automation
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
        <div className="text-center p-6 bg-white rounded-xl border border-gray-200">
          <div className="bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <ZapIcon className="w-8 h-8 text-orange-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Solana</h3>
          <p className="text-slate-600 text-sm">
            High-performance blockchain with sub-second finality and negligible fees
          </p>
        </div>

        <div className="text-center p-6 bg-white rounded-xl border border-gray-200">
          <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-purple-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Anchor</h3>
          <p className="text-slate-600 text-sm">
            Rust framework for secure Solana smart contract development
          </p>
        </div>

        <div className="text-center p-6 bg-white rounded-xl border border-gray-200">
          <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bot className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">AI Agent</h3>
          <p className="text-slate-600 text-sm">
            Autonomous monitoring with Python and Solana integration
          </p>
        </div>

        <div className="text-center p-6 bg-white rounded-xl border border-gray-200">
          <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Database className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Supabase</h3>
          <p className="text-slate-600 text-sm">
            Real-time database and authentication for seamless user experience
          </p>
        </div>
      </div>
    </div>
  </div>
);

const HowItWorks = () => (
  <div className="py-20 bg-white">
    <div className="max-w-6xl mx-auto px-4">
      <div className="text-center mb-16">
        <h2 className="text-4xl font-bold text-slate-900 mb-4">How It Works</h2>
        <p className="text-xl text-slate-600 max-w-2xl mx-auto">
          A simple 4-step process that transforms commitments into results
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
        <div className="text-center">
          <div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-emerald-600">
            1
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-3">Create or Join</h3>
          <p className="text-slate-600">
            Choose from existing pools or create your own commitment challenge with custom goals and stakes.
          </p>
        </div>

        <div className="text-center">
          <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-blue-600">
            2
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-3">Stake & Commit</h3>
          <p className="text-slate-600">
            Lock your SOL in a smart contract. Your stake goes to charity if you fail, or you share the pot if you succeed.
          </p>
        </div>

        <div className="text-center">
          <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-purple-600">
            3
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-3">AI Monitors</h3>
          <p className="text-slate-600">
            Our AI agent watches your progress 24/7, verifying completion through on-chain data and check-ins.
          </p>
        </div>

        <div className="text-center">
          <div className="bg-amber-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-amber-600">
            4
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-3">Win or Donate</h3>
          <p className="text-slate-600">
            Complete your goal and share the rewards. Fail and help fund community-selected charities.
          </p>
        </div>
      </div>
    </div>
  </div>
);

const Vision = () => (
  <div className="py-20 bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
    <div className="max-w-4xl mx-auto px-4 text-center">
      <h2 className="text-4xl font-bold mb-6">Our Vision</h2>
      <p className="text-xl mb-8 leading-relaxed opacity-90">
        To create a world where personal growth and financial incentives work together to help people
        achieve their goals and build better habits.
      </p>

      <div className="grid md:grid-cols-3 gap-8 mt-12">
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
          <Heart className="w-8 h-8 mx-auto mb-4" />
          <h3 className="font-bold mb-2">Human Flourishing</h3>
          <p className="opacity-90 text-sm">
            Using technology to help people become the best versions of themselves
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
          <Globe className="w-8 h-8 mx-auto mb-4" />
          <h3 className="font-bold mb-2">Community Impact</h3>
          <p className="opacity-90 text-sm">
            Failed stakes fund meaningful causes and social initiatives
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
          <Star className="w-8 h-8 mx-auto mb-4" />
          <h3 className="font-bold mb-2">Financial Freedom</h3>
          <p className="opacity-90 text-sm">
            Making personal development accessible to everyone through gamification
          </p>
        </div>
      </div>
    </div>
  </div>
);

const Team = () => (
  <div className="py-20 bg-slate-50">
    <div className="max-w-6xl mx-auto px-4">
      <div className="text-center mb-16">
        <h2 className="text-4xl font-bold text-slate-900 mb-4">Built for UBC Blockchain Conference</h2>
        <p className="text-xl text-slate-600 max-w-2xl mx-auto">
          This project was developed as part of the University Blockchain Conference Hackathon 2025
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl p-8 border border-gray-200 text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-2xl font-bold text-white">JD</span>
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Frontend Developer</h3>
          <p className="text-slate-600 mb-4">Responsible for the beautiful user interface and user experience</p>
          <div className="flex justify-center gap-4">
            <Github className="w-5 h-5 text-slate-400 hover:text-slate-600 cursor-pointer" />
            <Twitter className="w-5 h-5 text-slate-400 hover:text-slate-600 cursor-pointer" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-8 border border-gray-200 text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-2xl font-bold text-white">??</span>
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Backend Developer</h3>
          <p className="text-slate-600 mb-4">Responsible for the AI agent, smart contracts, and backend infrastructure</p>
          <div className="flex justify-center gap-4">
            <Github className="w-5 h-5 text-slate-400 hover:text-slate-600 cursor-pointer" />
            <Twitter className="w-5 h-5 text-slate-400 hover:text-slate-600 cursor-pointer" />
          </div>
        </div>
      </div>
    </div>
  </div>
);

const CTA = () => (
  <div className="py-20 bg-slate-900 text-white">
    <div className="max-w-4xl mx-auto px-4 text-center">
      <h2 className="text-4xl font-bold mb-6">Ready to Get Started?</h2>
      <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
        Join the movement that's transforming personal commitments into competitive games.
        Your future self will thank you.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link
          href="/pools"
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-xl shadow-emerald-200 transition-all transform hover:-translate-y-1"
        >
          Browse Active Pools
        </Link>
        <Link
          href="/create"
          className="border-2 border-white text-white hover:bg-white hover:text-slate-900 px-8 py-4 rounded-xl font-bold text-lg transition-all"
        >
          Create Your First Pool
        </Link>
      </div>
    </div>
  </div>
);

// --- Main Component ---

export default function AboutPage() {
  // Solana State
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    const saved = getPersistedWalletAddress();
    if (saved) {
      setWalletConnected(true);
      setWalletAddress(saved);
    }
  }, []);

  const handleConnectWallet = async () => {
    if (walletConnected) {
      setWalletConnected(false);
      setWalletAddress('');
      setBalance(null);
      clearPersistedWalletAddress();
      return;
    }

    try {
      const { solana } = window as any;
      if (!solana) {
        alert("Please install Phantom Wallet.");
        return;
      }

      const response = await solana.connect();
      const pubKey = response.publicKey.toString();
      setWalletAddress(pubKey);
      setWalletConnected(true);
      setBalance(2.45);
      persistWalletAddress(pubKey);

    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar
        walletConnected={walletConnected}
        walletAddress={walletAddress}
        onConnect={handleConnectWallet}
        balance={balance}
      />

      <main>
        <Hero />
        <ProblemSolution />
        <TechStack />
        <HowItWorks />
        <Vision />
        <Team />
        <CTA />
      </main>
    </div>
  );
}
