'use client';

import Link from 'next/link';
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { getPools, getUserParticipations } from '@/lib/api';
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
  TrendingDown,
  Award,
  Star,
  Crown,
  Settings,
  Bell,
  History
} from 'lucide-react';

// --- CONFIGURATION ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// --- Types ---
interface UserStats {
  totalStaked: number;
  activePools: number;
  completedPools: number;
  successRate: number;
  totalEarned: number;
  currentRank: number;
}

interface UserPool {
  id: string;
  name: string;
  goalType: 'Crypto' | 'Lifestyle';
  stakeAmount: number;
  status: 'active' | 'completed' | 'failed';
  progress: number;
  daysLeft: number;
  joinedAt: string;
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

const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  trend
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: any;
  color: string;
  trend?: { value: number; isPositive: boolean };
}) => (
  <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between mb-4">
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      {trend && (
        <div className={`flex items-center gap-1 text-sm font-medium ${
          trend.isPositive ? 'text-emerald-600' : 'text-red-600'
        }`}>
          {trend.isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          {trend.value}%
        </div>
      )}
    </div>
    <div className="text-2xl font-bold text-slate-900 mb-1">{value}</div>
    <div className="text-sm font-medium text-slate-900 mb-1">{title}</div>
    <div className="text-xs text-slate-600">{subtitle}</div>
  </div>
);

const PoolCard = ({ pool }: { pool: UserPool }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-6 hover:border-emerald-200 hover:shadow-md transition-all">
    <div className="flex items-start justify-between mb-4">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            pool.goalType === 'Crypto'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-emerald-100 text-emerald-700'
          }`}>
            {pool.goalType}
          </span>
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            pool.status === 'completed'
              ? 'bg-emerald-100 text-emerald-700'
              : pool.status === 'failed'
              ? 'bg-red-100 text-red-700'
              : 'bg-blue-100 text-blue-700'
          }`}>
            {pool.status}
          </span>
        </div>
        <h3 className="font-bold text-slate-900 mb-1">{pool.name}</h3>
        <p className="text-sm text-slate-600">Joined {new Date(pool.joinedAt).toLocaleDateString()}</p>
      </div>
      <div className="text-right">
        <div className="text-lg font-bold text-slate-900">{pool.stakeAmount} SOL</div>
        <div className="text-xs text-slate-600">Staked</div>
      </div>
    </div>

    {pool.status === 'active' && (
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-slate-600">Progress</span>
          <span className="font-medium text-slate-900">{pool.progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${pool.progress}%` }}
          ></div>
        </div>
        <div className="text-xs text-slate-600 mt-1">
          {pool.daysLeft} days remaining
        </div>
      </div>
    )}

    <Link
      href={`/pools/${pool.id}`}
      className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 px-4 rounded-lg font-medium text-center transition-colors inline-block"
    >
      View Pool
    </Link>
  </div>
);

const AchievementBadge = ({
  title,
  description,
  earned,
  icon: Icon
}: {
  title: string;
  description: string;
  earned: boolean;
  icon: any;
}) => (
  <div className={`p-4 rounded-xl border transition-all ${
    earned
      ? 'border-emerald-200 bg-emerald-50'
      : 'border-gray-200 bg-gray-50'
  }`}>
    <div className={`w-12 h-12 rounded-lg mb-3 flex items-center justify-center ${
      earned ? 'bg-emerald-100' : 'bg-gray-100'
    }`}>
      <Icon className={`w-6 h-6 ${earned ? 'text-emerald-600' : 'text-gray-400'}`} />
    </div>
    <h4 className={`font-semibold mb-1 ${earned ? 'text-slate-900' : 'text-slate-500'}`}>
      {title}
    </h4>
    <p className={`text-sm ${earned ? 'text-slate-600' : 'text-slate-400'}`}>
      {description}
    </p>
  </div>
);

// --- Main Component ---

export default function DashboardPage() {
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [userPools, setUserPools] = useState<UserPool[]>([]);
  const [loading, setLoading] = useState(true);

  // Solana State
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    // Auto-connect from persisted wallet (no popup if trusted)
    const savedAddress = getPersistedWalletAddress();
    if (savedAddress) {
      setWalletConnected(true);
      setWalletAddress(savedAddress);
      // Balance can be fetched later; keep UX snappy
    }
  }, []);

  useEffect(() => {
    const loadUserData = async () => {
      if (!walletConnected || !walletAddress) {
        setUserStats(null);
        setUserPools([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Get user's participations (pools they joined)
        const participations = await getUserParticipations(walletAddress);
        console.log('Dashboard: Fetched participations:', participations);
        console.log('Dashboard: Number of participations:', participations.length);

        const mappedPools: UserPool[] = participations.map(p => ({
          id: p.pool_id.toString(),
          name: p.name,
          goalType: p.goal_type.includes('Lifestyle') || p.goal_type.includes('lifestyle') ? 'Lifestyle' : 'Crypto',
          stakeAmount: p.stake_amount,
          status: (p.status === 'pending' || p.status === 'active') ? 'active' : 'completed',
          progress: p.progress,
          daysLeft: p.days_remaining,
          joinedAt: p.joined_at || new Date(p.start_timestamp * 1000).toISOString(),
        }));

        setUserPools(mappedPools);

        const totalStaked = participations.reduce((sum, p) => sum + p.stake_amount, 0);
        const activePools = mappedPools.filter(p => p.status === 'active').length;
        const completedPools = mappedPools.filter(p => p.status === 'completed').length;
        const totalPools = mappedPools.length || 1;
        const successRate = Math.round((completedPools / totalPools) * 100);

        const stats: UserStats = {
          totalStaked,
          activePools,
          completedPools,
          successRate,
          totalEarned: 0, // requires more detailed payout data
          currentRank: 0, // requires leaderboard data
        };

        setUserStats(stats);
      } catch (err) {
        console.error('Error loading dashboard data:', err);
        setUserStats(null);
        setUserPools([]);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [walletConnected, walletAddress]);

  const handleConnectWallet = async () => {
    if (walletConnected) {
      setWalletConnected(false);
      setWalletAddress('');
      setBalance(null);
      setUserStats(null);
      setUserPools([]);
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

  const achievements = [
    {
      title: "First Win",
      description: "Complete your first pool successfully",
      earned: true,
      icon: Trophy
    },
    {
      title: "Consistency King",
      description: "Complete 5 pools in a row",
      earned: true,
      icon: Target
    },
    {
      title: "High Roller",
      description: "Stake 10+ SOL in total",
      earned: true,
      icon: DollarSign
    },
    {
      title: "Century Club",
      description: "Reach 100% success rate",
      earned: false,
      icon: Star
    },
    {
      title: "Pool Creator",
      description: "Create your first commitment pool",
      earned: false,
      icon: Sparkles
    },
    {
      title: "Top 10",
      description: "Reach top 10 on the leaderboard",
      earned: false,
      icon: Crown
    }
  ];

  if (!walletConnected) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar
          walletConnected={walletConnected}
          walletAddress={walletAddress}
          onConnect={handleConnectWallet}
          balance={balance}
        />

        <main className="max-w-4xl mx-auto px-4 py-16 text-center">
          <div className="bg-white rounded-2xl border border-gray-200 p-12 shadow-lg">
            <div className="bg-slate-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <UserIcon className="w-10 h-10 text-slate-400" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-4">Connect Your Wallet</h1>
            <p className="text-xl text-slate-600 mb-8 max-w-md mx-auto">
              Connect your Solana wallet to view your dashboard and track your commitment progress.
            </p>
            <button
              onClick={handleConnectWallet}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg shadow-emerald-200 transition-all transform hover:-translate-y-1 flex items-center gap-2 mx-auto"
            >
              <Wallet className="w-6 h-6" />
              Connect Wallet
            </button>
          </div>
        </main>
      </div>
    );
  }

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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Your Dashboard</h1>
          <p className="text-slate-600">
            Track your commitment progress and achievements
          </p>
        </div>

        {/* Stats Grid */}
        {userStats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <StatCard
              title="Total Staked"
              value={`${userStats.totalStaked.toFixed(1)} SOL`}
              subtitle="Across all pools"
              icon={DollarSign}
              color="bg-blue-500"
              trend={{ value: 12, isPositive: true }}
            />
            <StatCard
              title="Active Pools"
              value={userStats.activePools.toString()}
              subtitle="Currently participating"
              icon={Activity}
              color="bg-emerald-500"
            />
            <StatCard
              title="Completed"
              value={userStats.completedPools.toString()}
              subtitle="Pools finished"
              icon={CheckCircle}
              color="bg-green-500"
            />
            <StatCard
              title="Success Rate"
              value={`${userStats.successRate}%`}
              subtitle="Completion rate"
              icon={Target}
              color="bg-purple-500"
              trend={{ value: 5, isPositive: true }}
            />
            <StatCard
              title="Total Earned"
              value={`+${userStats.totalEarned.toFixed(1)} SOL`}
              subtitle="From winnings"
              icon={TrendingUp}
              color="bg-amber-500"
            />
            <StatCard
              title="Current Rank"
              value={`#${userStats.currentRank}`}
              subtitle="On leaderboard"
              icon={Trophy}
              color="bg-slate-500"
              trend={{ value: 8, isPositive: false }}
            />
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Active Pools */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-900">Your Pools</h2>
                <Link
                  href="/pools"
                  className="text-emerald-600 hover:text-emerald-700 font-medium text-sm flex items-center gap-1"
                >
                  View All <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {loading ? (
                <div className="space-y-4">
                  {[1,2,3].map(i => (
                    <div key={i} className="h-32 bg-slate-100 rounded-xl animate-pulse"></div>
                  ))}
                </div>
              ) : userPools.length > 0 ? (
                <div className="grid gap-4">
                  {userPools.map(pool => (
                    <PoolCard key={pool.id} pool={pool} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Target className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-slate-600 mb-4">You haven't joined any pools yet</p>
                  <Link
                    href="/pools"
                    className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors"
                  >
                    Browse Pools
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Quick Actions */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="font-bold text-slate-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Link
                  href="/create"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 px-4 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create Pool
                </Link>
                <Link
                  href="/pools"
                  className="w-full border border-gray-300 hover:border-emerald-300 text-slate-700 hover:text-emerald-600 py-3 px-4 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Search className="w-4 h-4" />
                  Find Pools
                </Link>
              </div>
            </div>

            {/* Achievements */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="font-bold text-slate-900 mb-4">Achievements</h3>
              <div className="grid grid-cols-2 gap-3">
                {achievements.map((achievement, index) => (
                  <AchievementBadge
                    key={index}
                    title={achievement.title}
                    description={achievement.description}
                    earned={achievement.earned}
                    icon={achievement.icon}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
