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
  Flame,
  Leaf,
  Loader2,
  AlertCircle,
  ExternalLink,
  ArrowRight,
  Medal,
  Award,
  Star,
  Crown,
  TrendingDown,
  BarChart3,
  Filter,
  Calendar,
  DollarSign,
  Menu,
  Home,
  Grid,
  User,
  Info
} from 'lucide-react';

// --- CONFIGURATION ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// --- Types ---
interface LeaderboardEntry {
  id: string;
  name: string;
  address: string;
  totalStaked: number;
  poolsWon: number;
  successRate: number;
  totalEarned: number;
  rank: number;
}

interface Pool {
  id: string;
  name: string;
  goalType: 'Crypto' | 'Lifestyle';
  stakeAmount: number;
  participants: number;
  maxParticipants: number;
  created_at: string;
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
                <Grid className="w-4 h-4" /> Pools
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

const RankBadge = ({ rank }: { rank: number }) => {
  if (rank === 1) {
    return (
      <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full shadow-lg">
        <Crown className="w-6 h-6 text-white" />
      </div>
    );
  } else if (rank === 2) {
    return (
      <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-slate-300 to-slate-500 rounded-full shadow-lg">
        <Medal className="w-6 h-6 text-white" />
      </div>
    );
  } else if (rank === 3) {
    return (
      <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-amber-600 to-amber-800 rounded-full shadow-lg">
        <Award className="w-6 h-6 text-white" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center w-12 h-12 bg-slate-100 rounded-full">
      <span className="text-lg font-bold text-slate-600">#{rank}</span>
    </div>
  );
};

const LeaderboardCard = ({ entry, isCurrentUser }: { entry: LeaderboardEntry; isCurrentUser?: boolean }) => (
  <div className={`p-6 rounded-2xl border transition-all ${
    isCurrentUser
      ? 'border-emerald-300 bg-emerald-50 shadow-lg'
      : 'border-gray-200 bg-white hover:border-emerald-200 hover:shadow-md'
  }`}>
    <div className="flex items-center gap-6">
      <RankBadge rank={entry.rank} />

      <div className="flex-1">
        <div className="flex items-center gap-3 mb-2">
          <h3 className="text-lg font-bold text-slate-900">
            {entry.address.slice(0, 6)}...{entry.address.slice(-4)}
          </h3>
          {isCurrentUser && (
            <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
              You
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-slate-600">Total Staked</span>
            <div className="font-bold text-slate-900">{entry.totalStaked.toFixed(2)} SOL</div>
          </div>
          <div>
            <span className="text-slate-600">Pools Won</span>
            <div className="font-bold text-slate-900">{entry.poolsWon}</div>
          </div>
          <div>
            <span className="text-slate-600">Success Rate</span>
            <div className="font-bold text-slate-900">{entry.successRate}%</div>
          </div>
          <div>
            <span className="text-slate-600">Total Earned</span>
            <div className="font-bold text-emerald-600">+{entry.totalEarned.toFixed(2)} SOL</div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const TopPerformers = ({ leaderboard }: { leaderboard: LeaderboardEntry[] }) => (
  <div className="grid md:grid-cols-3 gap-6 mb-12">
    {leaderboard.slice(0, 3).map((entry, index) => (
      <div key={entry.id} className={`text-center p-6 rounded-2xl ${
        index === 0 ? 'bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200' :
        index === 1 ? 'bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200' :
        'bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200'
      }`}>
        <div className="flex justify-center mb-4">
          <RankBadge rank={entry.rank} />
        </div>
        <h3 className="font-bold text-slate-900 mb-2">
          {entry.address.slice(0, 6)}...{entry.address.slice(-4)}
        </h3>
        <div className="text-2xl font-bold text-slate-900 mb-2">
          {entry.totalEarned.toFixed(2)} SOL
        </div>
        <p className="text-sm text-slate-600">
          {entry.poolsWon} pools won • {entry.successRate}% success
        </p>
      </div>
    ))}
  </div>
);

const StatsOverview = () => (
  <div className="grid md:grid-cols-4 gap-6 mb-12">
    <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
      <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
        <Users className="w-6 h-6 text-blue-600" />
      </div>
      <div className="text-2xl font-bold text-slate-900">12,847</div>
      <div className="text-sm text-slate-600">Total Participants</div>
    </div>

    <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
      <div className="bg-emerald-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
        <DollarSign className="w-6 h-6 text-emerald-600" />
      </div>
      <div className="text-2xl font-bold text-slate-900">$2.4M</div>
      <div className="text-sm text-slate-600">Total Value Locked</div>
    </div>

    <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
      <div className="bg-purple-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
        <Target className="w-6 h-6 text-purple-600" />
      </div>
      <div className="text-2xl font-bold text-slate-900">567</div>
      <div className="text-sm text-slate-600">Active Pools</div>
    </div>

    <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
      <div className="bg-amber-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
        <Trophy className="w-6 h-6 text-amber-600" />
      </div>
      <div className="text-2xl font-bold text-slate-900">94.2%</div>
      <div className="text-sm text-slate-600">Average Success Rate</div>
    </div>
  </div>
);

// --- Main Component ---

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'all' | 'month' | 'week'>('all');
  const [category, setCategory] = useState<'all' | 'crypto' | 'lifestyle'>('all');

  // Solana State
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    // Generate mock leaderboard data
    const mockLeaderboard: LeaderboardEntry[] = Array.from({ length: 50 }, (_, i) => ({
      id: `user-${i}`,
      name: `User ${i + 1}`,
      address: `111111111111111111111111111111${(i + 1).toString().padStart(2, '0')}`,
      totalStaked: Math.random() * 50 + 5,
      poolsWon: Math.floor(Math.random() * 15) + 1,
      successRate: Math.floor(Math.random() * 40) + 60,
      totalEarned: Math.random() * 30 + 2,
      rank: i + 1
    })).sort((a, b) => b.totalEarned - a.totalEarned);

    // Reassign ranks after sorting
    mockLeaderboard.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    setLeaderboard(mockLeaderboard);
    setLoading(false);
  }, [timeframe, category]);

  const handleConnectWallet = async () => {
    if (walletConnected) {
      setWalletConnected(false);
      setWalletAddress('');
      setBalance(null);
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

    } catch (err) {
      console.error(err);
    }
  };

  const currentUserEntry = leaderboard.find(entry =>
    walletConnected && entry.address === walletAddress
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar
        walletConnected={walletConnected}
        walletAddress={walletAddress}
        onConnect={handleConnectWallet}
        balance={balance}
      />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 border border-amber-200 text-amber-700 text-sm font-semibold mb-4">
            <Trophy className="w-4 h-4" />
            Hall of Fame
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-4">Leaderboard</h1>
          <p className="text-xl text-slate-600">Top performers who turned commitments into success</p>
        </div>

        {/* Stats Overview */}
        <StatsOverview />

        {/* Top 3 Performers */}
        <TopPerformers leaderboard={leaderboard} />

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <div className="flex bg-white p-1 rounded-xl border border-gray-200">
            {[
              { label: 'All Time', value: 'all' },
              { label: 'This Month', value: 'month' },
              { label: 'This Week', value: 'week' }
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setTimeframe(option.value as any)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  timeframe === option.value
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="flex bg-white p-1 rounded-xl border border-gray-200">
            {[
              { label: 'All Categories', value: 'all' },
              { label: 'Crypto', value: 'crypto' },
              { label: 'Lifestyle', value: 'lifestyle' }
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setCategory(option.value as any)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  category === option.value
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Current User Highlight */}
        {currentUserEntry && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Your Ranking</h2>
            <LeaderboardCard entry={currentUserEntry} isCurrentUser />
          </div>
        )}

        {/* Full Leaderboard */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-slate-900">Full Rankings</h2>
          </div>

          <div className="divide-y divide-gray-100">
            {loading ? (
              <div className="p-8 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-slate-400" />
                <p className="text-slate-600">Loading leaderboard...</p>
              </div>
            ) : (
              leaderboard.map((entry) => (
                <div key={entry.id} className="p-4">
                  <LeaderboardCard
                    entry={entry}
                    isCurrentUser={walletConnected && entry.address === walletAddress}
                  />
                </div>
              ))
            )}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-8 text-white">
            <h2 className="text-2xl font-bold mb-4">Ready to Join the Leaderboard?</h2>
            <p className="text-emerald-100 mb-6 max-w-md mx-auto">
              Start your commitment journey and compete with the best performers in the community.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/pools"
                className="bg-white text-emerald-600 px-6 py-3 rounded-xl font-bold hover:bg-gray-50 transition-colors"
              >
                Browse Active Pools
              </Link>
              <Link
                href="/create"
                className="border-2 border-white text-white hover:bg-white hover:text-emerald-600 px-6 py-3 rounded-xl font-bold transition-colors"
              >
                Create Your Pool
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
