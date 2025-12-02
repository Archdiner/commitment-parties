'use client';

import Link from 'next/link';
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
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
  Leaf,
  ArrowRight,
  Shield,
  DollarSign,
  BarChart3,
  Award,
  Heart,
  Twitter,
  Github,
  Star,
  CheckCircle,
  Bot,
  Coins,
  PiggyBank,
  Smartphone,
  Eye,
  Calendar,
  Menu,
  Home,
  Grid3X3,
  User,
  Medal,
  Info
} from 'lucide-react';

// --- CONFIGURATION ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// --- Types ---
interface Pool {
  id: string;
  name: string;
  goalType: 'Crypto' | 'Lifestyle';
  description: string;
  stakeAmount: number;
  durationDays: number;
  participants: number;
  maxParticipants: number;
  created_at: string;
  onChainAddress?: string;
  txHash?: string;
}

interface User {
  id: string;
  email?: string;
}

interface WindowWithSolana extends Window {
  solana?: {
    connect: (options?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: { toString: () => string } }>;
    isPhantom?: boolean;
  };
}

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
                <Grid3X3 className="w-4 h-4" /> Pools
              </Link>
              <Link href="/leaderboard" className="flex items-center gap-2 text-slate-700 hover:text-emerald-600 font-medium">
                <Medal className="w-4 h-4" /> Leaderboard
              </Link>
              <Link href="/dashboard" className="flex items-center gap-2 text-slate-700 hover:text-emerald-600 font-medium">
                <User className="w-4 h-4" /> Dashboard
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
  <div className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50 border-b border-gray-200">

    <div className="max-w-7xl mx-auto px-4 py-20 lg:py-32 relative z-10">
      <div className="text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-700 text-sm font-semibold mb-8 shadow-sm">
          <Bot className="w-4 h-4" />
          <span>AI-Powered Accountability</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 mb-8 tracking-tight">
          Turn Commitments into
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600">
            Competitive Games
          </span>
        </h1>

        <p className="text-xl md:text-2xl text-slate-600 max-w-3xl mx-auto mb-12 leading-relaxed font-light">
          Stake SOL on your goals. AI monitors progress 24/7.
          <br />
          <strong className="text-slate-900 font-semibold">Win big or lose your stake to charity.</strong>
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
          <Link
            href="/pools"
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-xl shadow-emerald-200 transition-all transform hover:-translate-y-1 flex items-center gap-2"
          >
            <Target className="w-5 h-5" />
            Browse Challenges
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            href="/create"
            className="border-2 border-slate-300 hover:border-emerald-300 text-slate-700 hover:text-emerald-600 px-8 py-4 rounded-xl font-bold text-lg transition-all flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create Challenge
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-2xl mx-auto">
          <div className="text-center">
            <div className="text-3xl font-bold text-slate-900">$2.4M+</div>
            <div className="text-sm text-slate-600">Total Staked</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-slate-900">12.8K</div>
            <div className="text-sm text-slate-600">Active Users</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-slate-900">94%</div>
            <div className="text-sm text-slate-600">Success Rate</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-slate-900">500+</div>
            <div className="text-sm text-slate-600">Pools Created</div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const Features = () => (
  <div className="py-20 bg-white">
    <div className="max-w-7xl mx-auto px-4">
      <div className="text-center mb-16">
        <h2 className="text-4xl font-bold text-slate-900 mb-4">How It Works</h2>
        <p className="text-xl text-slate-600 max-w-2xl mx-auto">
          Transform personal goals into competitive games with real consequences
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="text-center p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100">
          <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
            <Target className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-3">Create or Join Pools</h3>
          <p className="text-slate-600">
            Choose from DCA challenges, HODL streaks, or lifestyle goals. Stake SOL and compete with others.
          </p>
        </div>

        <div className="text-center p-6 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100">
          <div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
            <Bot className="w-8 h-8 text-emerald-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-3">AI Monitors 24/7</h3>
          <p className="text-slate-600">
            Our AI agent with its own Solana wallet tracks your progress through on-chain data and check-ins.
          </p>
        </div>

        <div className="text-center p-6 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100">
          <div className="bg-amber-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
            <Trophy className="w-8 h-8 text-amber-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-3">Win or Donate</h3>
          <p className="text-slate-600">
            Complete your goals and share the pot. Fail and your stake goes to community-selected charities.
          </p>
        </div>
      </div>
    </div>
  </div>
);

const ChallengeTypes = () => (
  <div className="py-20 bg-slate-50">
    <div className="max-w-7xl mx-auto px-4">
      <div className="text-center mb-16">
        <h2 className="text-4xl font-bold text-slate-900 mb-4">Challenge Types</h2>
        <p className="text-xl text-slate-600 max-w-2xl mx-auto">
          Choose from crypto habits verified on-chain or lifestyle goals with social accountability
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Crypto Challenges */}
        <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
          <div className="flex items-center gap-4 mb-6">
            <div className="bg-blue-100 p-3 rounded-xl">
              <TrendingUp className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-slate-900">Crypto Challenges</h3>
              <p className="text-slate-600">On-chain verified goals</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
              <Coins className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-slate-900">Daily DCA</h4>
                <p className="text-sm text-slate-600">Buy crypto every day for 30 days</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
              <PiggyBank className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-slate-900">HODL Streak</h4>
                <p className="text-sm text-slate-600">Don't sell your tokens for X days</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
              <DollarSign className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-slate-900">Staking Goals</h4>
                <p className="text-sm text-slate-600">Maintain staking positions</p>
              </div>
            </div>
          </div>
        </div>

        {/* Lifestyle Challenges */}
        <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
          <div className="flex items-center gap-4 mb-6">
            <div className="bg-emerald-100 p-3 rounded-xl">
              <Activity className="w-8 h-8 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-slate-900">Lifestyle Goals</h3>
              <p className="text-slate-600">Social accountability challenges</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-emerald-50 rounded-lg">
              <Smartphone className="w-5 h-5 text-emerald-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-slate-900">Screen Time Limit</h4>
                <p className="text-sm text-slate-600">Reduce daily screen time</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-emerald-50 rounded-lg">
              <Eye className="w-5 h-5 text-emerald-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-slate-900">App Abstinence</h4>
                <p className="text-sm text-slate-600">Quit addictive apps cold turkey</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-emerald-50 rounded-lg">
              <Calendar className="w-5 h-5 text-emerald-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-slate-900">Habit Building</h4>
                <p className="text-sm text-slate-600">Exercise, reading, meditation</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const CTA = () => (
  <div className="py-20 bg-gradient-to-r from-emerald-600 to-teal-600">
    <div className="max-w-4xl mx-auto text-center px-4">
      <h2 className="text-4xl font-bold text-white mb-6">
        Ready to Transform Your Commitments?
      </h2>
      <p className="text-xl text-emerald-100 mb-8 max-w-2xl mx-auto">
        Join thousands who have turned their goals into competitive games with real stakes.
        Your future self will thank you.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link
          href="/pools"
          className="bg-white text-emerald-600 px-8 py-4 rounded-xl font-bold text-lg shadow-xl hover:bg-gray-50 transition-all transform hover:-translate-y-1"
        >
          Browse Active Challenges
        </Link>
        <Link
          href="/create"
          className="border-2 border-white text-white hover:bg-white hover:text-emerald-600 px-8 py-4 rounded-xl font-bold text-lg transition-all"
        >
          Create Your Challenge
        </Link>
      </div>
    </div>
  </div>
);

const Footer = () => (
  <footer className="bg-slate-900 text-white py-16">
    <div className="max-w-7xl mx-auto px-4">
      <div className="grid md:grid-cols-4 gap-8">
        <div className="md:col-span-2">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-emerald-600 p-2 rounded-lg">
              <Leaf className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold">Commitment Agent</span>
          </div>
          <p className="text-slate-400 mb-6 max-w-md">
            AI-powered accountability platform that transforms personal commitments into competitive games with real financial stakes on Solana.
          </p>
          <div className="flex gap-4">
            <a href="#" className="text-slate-400 hover:text-white transition-colors">
              <Twitter className="w-5 h-5" />
            </a>
            <a href="#" className="text-slate-400 hover:text-white transition-colors">
              <Github className="w-5 h-5" />
            </a>
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-4">Platform</h3>
          <ul className="space-y-2 text-slate-400">
            <li><Link href="/pools" className="hover:text-white transition-colors">Browse Challenges</Link></li>
            <li><Link href="/create" className="hover:text-white transition-colors">Create Challenge</Link></li>
            <li><Link href="/leaderboard" className="hover:text-white transition-colors">Leaderboard</Link></li>
            <li><Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="font-semibold mb-4">Company</h3>
          <ul className="space-y-2 text-slate-400">
            <li><Link href="/about" className="hover:text-white transition-colors">About</Link></li>
            <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Terms</a></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-slate-800 mt-12 pt-8 text-center text-slate-400">
        <p>&copy; 2025 Commitment Agent. Built for University Blockchain Conference Hackathon.</p>
      </div>
    </div>
  </footer>
);

// --- Main Application Component ---

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);

  // Solana State
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [balance, setBalance] = useState<number | null>(null);

  // Initialize Auth
  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        setUser(session.user);
      } else {
        const { data } = await supabase.auth.signInAnonymously();
        if (data?.user) {
          setUser(data.user);
        } else {
          setUser({ id: 'anon-user' });
        }
      }
    };
    initAuth();
  }, []);

  // Fetch featured pools
  useEffect(() => {
    const fetchPools = async () => {
      const { data, error } = await supabase
        .from('pools')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(6);

      if (data) {
        setPools(data as Pool[]);
        setLoading(false);
      } else {
        setLoading(false);
      }
    };

    fetchPools();
  }, []);

  const handleConnectWallet = async () => {
    if (walletConnected) {
      setWalletConnected(false);
      setWalletAddress('');
      setBalance(null);
      return;
    }

    try {
      const windowWithSolana = window as WindowWithSolana;
      const { solana } = windowWithSolana;
      if (!solana) {
        alert("Please install Phantom Wallet.");
        return;
      }

      const response = await solana.connect();
      const pubKey = response.publicKey.toString();
      setWalletAddress(pubKey);
      setWalletConnected(true);
      setBalance(2.45);

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
        <Features />
        <ChallengeTypes />

        {/* Featured Pools Preview */}
        <div className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-slate-900 mb-4">Featured Challenges</h2>
              <p className="text-xl text-slate-600">Join active challenges and start competing</p>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1,2,3].map(i => (
                  <div key={i} className="h-64 bg-slate-100 rounded-xl animate-pulse"></div>
                ))}
              </div>
            ) : pools.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                  {pools.slice(0, 3).map(pool => (
                    <div key={pool.id} className="bg-white rounded-2xl border border-gray-200 p-6 hover:border-emerald-300 hover:shadow-lg transition-all">
                      <div className="flex justify-between items-start mb-4">
                        <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase border ${
                          pool.goalType === 'Crypto'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {pool.goalType}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 mb-2">{pool.name}</h3>
                      <p className="text-sm text-slate-600 mb-4 line-clamp-2">{pool.description}</p>
                      <div className="flex justify-between text-sm mb-4">
                        <span className="text-slate-500">{pool.stakeAmount} SOL stake</span>
                        <span className="text-slate-500">{pool.durationDays} days</span>
                      </div>
                      <Link
                        href={`/pools/${pool.id}`}
                        className="w-full bg-emerald-600 text-white py-2 rounded-lg font-medium text-center hover:bg-emerald-700 transition-colors"
                      >
                        View Pool
                      </Link>
                    </div>
                  ))}
                </div>
                <div className="text-center">
                  <Link
                    href="/pools"
                    className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors inline-flex items-center gap-2"
                  >
                    View All Challenges <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Target className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-medium text-slate-900 mb-2">No pools yet</h3>
                <p className="text-slate-600 mb-6">Be the first to create a commitment pool!</p>
                <Link
                  href="/create"
                  className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors"
                >
                  Create First Pool
                </Link>
              </div>
            )}
          </div>
        </div>

        <CTA />
      </main>

      {/* Quick Actions Section */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Get Started in Seconds</h2>
            <p className="text-xl text-slate-600">Choose your challenge type and start building better habits</p>
          </div>

          {/* Browse by Category */}
          <div className="mb-16">
            <h3 className="text-2xl font-bold text-slate-900 text-center mb-8">Browse by Category</h3>
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <Link
                href="/pools?category=crypto"
                className="group bg-white rounded-2xl p-8 border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all text-left"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="bg-blue-100 p-3 rounded-xl group-hover:bg-blue-200 transition-colors">
                    <TrendingUp className="w-8 h-8 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Crypto Challenges</h3>
                    <p className="text-slate-600">DCA, HODL, staking goals</p>
                  </div>
                </div>
                <p className="text-slate-600 mb-4">
                  Turn your crypto habits into competitive games with on-chain verification.
                </p>
                <div className="flex items-center text-blue-600 font-medium">
                  Browse Crypto Challenges <ArrowRight className="w-4 h-4 ml-2" />
                </div>
              </Link>

              <Link
                href="/pools?category=lifestyle"
                className="group bg-white rounded-2xl p-8 border border-gray-200 hover:border-emerald-300 hover:shadow-lg transition-all text-left"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="bg-emerald-100 p-3 rounded-xl group-hover:bg-emerald-200 transition-colors">
                    <Activity className="w-8 h-8 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Lifestyle Goals</h3>
                    <p className="text-slate-600">Fitness, reading, screen time</p>
                  </div>
                </div>
                <p className="text-slate-600 mb-4">
                  Build healthy habits with social accountability and financial stakes.
                </p>
                <div className="flex items-center text-emerald-600 font-medium">
                  Browse Lifestyle Goals <ArrowRight className="w-4 h-4 ml-2" />
                </div>
              </Link>
            </div>
          </div>

          {/* User's Active Challenges (if logged in) */}
          {walletConnected && (
            <div className="mb-16">
              <h3 className="text-2xl font-bold text-slate-900 text-center mb-8">Your Active Challenges</h3>
              {loading ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1,2,3].map(i => (
                    <div key={i} className="h-32 bg-slate-100 rounded-xl animate-pulse"></div>
                  ))}
                </div>
              ) : pools.filter(p => Math.random() > 0.7).length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {pools.filter(p => Math.random() > 0.7).slice(0, 3).map(pool => (
                    <div key={pool.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:border-emerald-300 hover:shadow-md transition-all">
                      <div className="flex justify-between items-start mb-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          pool.goalType === 'Crypto'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {pool.goalType}
                        </span>
                        <span className="text-xs text-slate-500">Active</span>
                      </div>
                      <h4 className="font-bold text-slate-900 mb-2">{pool.name}</h4>
                      <div className="flex justify-between text-sm text-slate-600 mb-4">
                        <span>{pool.stakeAmount} SOL staked</span>
                        <span>{pool.durationDays} days left</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                        <div
                          className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${Math.floor(Math.random() * 80) + 20}%` }}
                        ></div>
                      </div>
                      <Link
                        href={`/pools/${pool.id}`}
                        className="w-full bg-emerald-600 text-white py-2 px-4 rounded-lg font-medium text-center hover:bg-emerald-700 transition-colors"
                      >
                        View Challenge
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-300 shadow-sm">
                  <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Target className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No active challenges yet</h3>
                  <p className="text-slate-600 mb-6">Join or create your first challenge to get started!</p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link
                      href="/pools"
                      className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors"
                    >
                      Browse Challenges
                    </Link>
                    <Link
                      href="/create"
                      className="border border-emerald-600 text-emerald-600 hover:bg-emerald-600 hover:text-white px-6 py-3 rounded-xl font-bold transition-colors"
                    >
                      Create Challenge
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Create Challenge CTA */}
          <div className="text-center bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-8 text-white">
            <h3 className="text-2xl font-bold mb-4">Ready to Transform Your Habits?</h3>
            <p className="text-emerald-100 mb-6 max-w-md mx-auto">
              Create your own challenge and invite others to join. Set your goals, stake your SOL, and build better habits together.
            </p>
            <Link
              href="/create"
              className="inline-flex items-center gap-2 bg-white text-emerald-600 px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-gray-50 transition-all transform hover:-translate-y-1"
            >
              <Plus className="w-5 h-5" />
              Create Your Challenge
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}