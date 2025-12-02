'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
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
  ArrowLeft,
  Share2,
  Heart,
  MessageCircle,
  Calendar,
  DollarSign,
  CheckCircle,
  User as UserIcon,
  Award,
  BarChart3,
  Timer,
  Shield,
  Menu,
  Home,
  Grid,
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
  creatorId?: string;
}

interface Participant {
  id: string;
  name?: string;
  address: string;
  joinedAt: string;
  progress?: number;
  status: 'active' | 'completed' | 'failed';
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

const PoolHeader = ({ pool, onJoin, joining, walletConnected }: {
  pool: Pool;
  onJoin: () => void;
  joining: boolean;
  walletConnected: boolean;
}) => (
  <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-lg mb-8">
    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
      <div className="flex-1">
        <div className="flex items-center gap-4 mb-4">
          <span className={`px-4 py-2 rounded-xl text-sm font-bold uppercase border ${
            pool.goalType === 'Crypto'
              ? 'bg-blue-50 text-blue-700 border-blue-200'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          }`}>
            {pool.goalType}
          </span>
          <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-lg">
            {pool.participants}/{pool.maxParticipants} participants
          </span>
        </div>

        <h1 className="text-4xl font-bold text-slate-900 mb-4">{pool.name}</h1>
        <p className="text-xl text-slate-600 mb-6 leading-relaxed">{pool.description}</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-900">{pool.stakeAmount}</div>
            <div className="text-sm text-slate-600">SOL Stake</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-900">{pool.durationDays}</div>
            <div className="text-sm text-slate-600">Days</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-900">
              {Math.round((pool.participants / pool.maxParticipants) * 100)}%
            </div>
            <div className="text-sm text-slate-600">Capacity</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-900">
              {new Date(pool.created_at).toLocaleDateString()}
            </div>
            <div className="text-sm text-slate-600">Created</div>
          </div>
        </div>
      </div>

      <div className="lg:w-80">
        {pool.onChainAddress && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">Smart Contract</span>
              <Shield className="w-4 h-4 text-emerald-600" />
            </div>
            <a
              href={`https://explorer.solana.com/address/${pool.onChainAddress}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono text-slate-600 hover:text-emerald-600 break-all"
            >
              {pool.onChainAddress}
            </a>
          </div>
        )}

        <button
          onClick={onJoin}
          disabled={pool.participants >= pool.maxParticipants || joining || !walletConnected}
          className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all transform hover:-translate-y-1 shadow-lg ${
            pool.participants >= pool.maxParticipants
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
              : !walletConnected
              ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-200'
              : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200'
          }`}
        >
          {joining ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
              Joining Pool...
            </>
          ) : pool.participants >= pool.maxParticipants ? (
            'Pool Full'
          ) : !walletConnected ? (
            'Connect Wallet to Join'
          ) : (
            `Join Pool (${pool.stakeAmount} SOL)`
          )}
        </button>

        <div className="flex gap-3 mt-4">
          <button className="flex-1 flex items-center justify-center gap-2 py-2 px-4 border border-gray-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors">
            <Share2 className="w-4 h-4" />
            Share
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 py-2 px-4 border border-gray-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors">
            <Heart className="w-4 h-4" />
            Favorite
          </button>
        </div>
      </div>
    </div>
  </div>
);

const ProgressSection = ({ pool }: { pool: Pool }) => {
  const totalStaked = pool.participants * pool.stakeAmount;
  const potentialPrize = totalStaked * 0.8; // 80% goes to winners
  const daysRemaining = Math.max(0, pool.durationDays - Math.floor((Date.now() - new Date(pool.created_at).getTime()) / (1000 * 60 * 60 * 24)));

  return (
    <div className="grid md:grid-cols-3 gap-6 mb-8">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-blue-100 p-3 rounded-lg">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Participants</h3>
            <p className="text-sm text-slate-600">Pool capacity</p>
          </div>
        </div>
        <div className="text-3xl font-bold text-slate-900 mb-2">
          {pool.participants}/{pool.maxParticipants}
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${(pool.participants / pool.maxParticipants) * 100}%` }}
          ></div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-emerald-100 p-3 rounded-lg">
            <DollarSign className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Total Staked</h3>
            <p className="text-sm text-slate-600">Prize pool</p>
          </div>
        </div>
        <div className="text-3xl font-bold text-slate-900 mb-2">
          {totalStaked.toFixed(2)} SOL
        </div>
        <p className="text-sm text-slate-600">
          ~${(totalStaked * 150).toFixed(0)} USD
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-amber-100 p-3 rounded-lg">
            <Timer className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Time Remaining</h3>
            <p className="text-sm text-slate-600">Challenge period</p>
          </div>
        </div>
        <div className="text-3xl font-bold text-slate-900 mb-2">
          {daysRemaining} days
        </div>
        <p className="text-sm text-slate-600">
          Ends {new Date(Date.now() + daysRemaining * 24 * 60 * 60 * 1000).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
};

const ParticipantsList = ({ participants }: { participants: Participant[] }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-6">
    <h3 className="text-xl font-bold text-slate-900 mb-6">Participants</h3>

    {participants.length === 0 ? (
      <div className="text-center py-8 text-slate-500">
        <UserIcon className="w-12 h-12 mx-auto mb-3 text-slate-300" />
        <p>No participants yet</p>
      </div>
    ) : (
      <div className="space-y-4">
        {participants.map((participant) => (
          <div key={participant.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-100 p-2 rounded-full">
                <UserIcon className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="font-medium text-slate-900">
                  {participant.address.slice(0, 6)}...{participant.address.slice(-4)}
                </p>
                <p className="text-sm text-slate-600">
                  Joined {new Date(participant.joinedAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {participant.progress !== undefined && (
                <div className="text-right mr-3">
                  <div className="text-sm font-medium text-slate-900">{participant.progress}%</div>
                  <div className="text-xs text-slate-600">Progress</div>
                </div>
              )}

              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                participant.status === 'completed'
                  ? 'bg-emerald-100 text-emerald-700'
                  : participant.status === 'failed'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-blue-100 text-blue-700'
              }`}>
                {participant.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

// --- Main Component ---

export default function PoolDetailPage() {
  const params = useParams();
  const poolId = params.id as string;

  const [pool, setPool] = useState<Pool | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  // Solana State
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    const fetchPool = async () => {
      const { data, error } = await supabase
        .from('pools')
        .select('*')
        .eq('id', poolId)
        .single();

      if (data) {
        setPool(data as Pool);
        // Generate mock participants based on participant count
        const mockParticipants: Participant[] = Array.from({ length: data.participants }, (_, i) => ({
          id: `participant-${i}`,
          address: `111111111111111111111111111111${i.toString().padStart(2, '0')}`,
          joinedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
          progress: Math.floor(Math.random() * 100),
          status: Math.random() > 0.8 ? 'completed' : Math.random() > 0.6 ? 'failed' : 'active'
        }));
        setParticipants(mockParticipants);
      }
      setLoading(false);
    };

    if (poolId) {
      fetchPool();
    }
  }, [poolId]);

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

  const handleJoinPool = async () => {
    if (!walletConnected) {
      handleConnectWallet();
      return;
    }

    if (!pool) return;

    setJoining(true);

    try {
      // Simulate Solana transaction
      await new Promise(resolve => setTimeout(resolve, 2500));

      // Update participants count
      const { error } = await supabase
        .from('pools')
        .update({ participants: pool.participants + 1 })
        .eq('id', poolId);

      if (error) throw error;

      // Update local state
      setPool(prev => prev ? { ...prev, participants: prev.participants + 1 } : null);

      setJoining(false);
    } catch (err) {
      console.error("Error joining pool:", err);
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar
          walletConnected={walletConnected}
          walletAddress={walletAddress}
          onConnect={handleConnectWallet}
          balance={balance}
        />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-64 bg-white rounded-2xl mb-8"></div>
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              {[1,2,3].map(i => <div key={i} className="h-32 bg-white rounded-xl"></div>)}
            </div>
            <div className="h-96 bg-white rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!pool) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar
          walletConnected={walletConnected}
          walletAddress={walletAddress}
          onConnect={handleConnectWallet}
          balance={balance}
        />
        <div className="max-w-4xl mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-4">Pool Not Found</h1>
          <p className="text-slate-600 mb-6">The pool you're looking for doesn't exist.</p>
          <Link
            href="/pools"
            className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors"
          >
            Browse All Pools
          </Link>
        </div>
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

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Back Button */}
        <Link
          href="/pools"
          className="inline-flex items-center gap-2 text-slate-600 hover:text-emerald-600 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Pools
        </Link>

        {/* Pool Header */}
        <PoolHeader
          pool={pool}
          onJoin={handleJoinPool}
          joining={joining}
          walletConnected={walletConnected}
        />

        {/* Progress Stats */}
        <ProgressSection pool={pool} />

        {/* Participants */}
        <ParticipantsList participants={participants} />
      </main>
    </div>
  );
}
