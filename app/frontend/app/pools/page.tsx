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
  Filter,
  SlidersHorizontal,
  Grid3X3,
  List,
  SortAsc,
  Calendar,
  DollarSign,
  Menu,
  Home,
  Grid,
  Medal,
  User,
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
            <Link href="/pools" className="text-slate-700 hover:text-emerald-600 font-medium transition-colors">Challenges</Link>
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
              Create Challenge
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
                <Grid3X3 className="w-4 h-4" /> Challenges
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
                <Plus className="w-4 h-4" /> Create Challenge
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

const PoolCard = ({
  pool,
  onJoin,
  joining
}: {
  pool: Pool;
  onJoin: (id: string, onChainAddr?: string, currentParticipants?: number) => void;
  joining: string | null;
}) => (
  <div className="group bg-white rounded-2xl border border-gray-200 p-6 hover:border-emerald-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300 relative overflow-hidden flex flex-col h-full shadow-sm">
    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-100 transition-opacity duration-500 transform group-hover:scale-110">
      {pool.goalType === 'Crypto' ? (
        <TrendingUp className="w-24 h-24 text-blue-500 -mt-4 -mr-4" />
      ) : (
        <Activity className="w-24 h-24 text-emerald-500 -mt-4 -mr-4" />
      )}
    </div>

    <div className="flex justify-between items-start mb-5 relative z-10">
      <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border shadow-sm ${
        pool.goalType === 'Crypto'
          ? 'bg-blue-50 text-blue-700 border-blue-200'
          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
      }`}>
        {pool.goalType}
      </span>
      {pool.onChainAddress && (
        <a
          href={`https://explorer.solana.com/address/${pool.onChainAddress}?cluster=devnet`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-[10px] font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 hover:bg-emerald-100 transition"
        >
          ON-CHAIN <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </div>

    <Link href={`/pools/${pool.id}`} className="flex-1">
      <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-emerald-700 transition-colors relative z-10">
        {pool.name}
      </h3>
      <p className="text-sm text-slate-600 mb-6 line-clamp-2 min-h-[40px] relative z-10 leading-relaxed font-light">
        {pool.description}
      </p>
    </Link>

    <div className="mt-auto space-y-4 relative z-10 bg-slate-50 p-4 rounded-xl border border-gray-100">
      <div className="flex justify-between text-sm">
        <span className="text-slate-500 flex items-center gap-2 font-medium">
          <Wallet className="w-4 h-4" /> Stake
        </span>
        <span className="font-bold text-slate-900 font-mono">{pool.stakeAmount} SOL</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-slate-500 flex items-center gap-2 font-medium">
          <Clock className="w-4 h-4" /> Duration
        </span>
        <span className="font-medium text-slate-900">{pool.durationDays} Days</span>
      </div>

      <div className="space-y-2 pt-2 border-t border-gray-200">
        <div className="flex justify-between text-xs uppercase tracking-wider font-bold text-slate-500">
          <span>Capacity</span>
          <span className={pool.participants >= pool.maxParticipants ? 'text-red-600 bg-red-50 px-1 rounded' : 'text-slate-900'}>
            {pool.participants} / {pool.maxParticipants}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              pool.participants >= pool.maxParticipants ? 'bg-red-500' : 'bg-emerald-500'
            }`}
            style={{ width: `${(pool.participants / pool.maxParticipants) * 100}%` }}
          ></div>
        </div>
      </div>
    </div>

    <button
      onClick={() => onJoin(pool.id, pool.onChainAddress, pool.participants)}
      disabled={pool.participants >= pool.maxParticipants || !!joining}
      className={`w-full mt-4 py-3 font-bold rounded-xl transition-all duration-200 flex justify-center items-center gap-2 relative z-10 shadow-md ${
        pool.participants >= pool.maxParticipants
          ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200 shadow-none'
          : 'bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-200'
      }`}
    >
      {joining === pool.id ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" /> Confirming Tx...
        </>
      ) : pool.participants >= pool.maxParticipants ? (
        'Pool Full'
      ) : (
        'Join Pool'
      )}
    </button>
  </div>
);

const FiltersSidebar = ({
  filters,
  onFilterChange,
  sortBy,
  onSortChange,
  isOpen,
  onClose
}: {
  filters: {
    goalTypes: string[];
    stakeRanges: { min: number; max: number }[];
    durationRanges: { min: number; max: number }[];
  };
  onFilterChange: (key: string, value: any, checked?: boolean) => void;
  sortBy: string;
  onSortChange: (value: string) => void;
  isOpen: boolean;
  onClose: () => void;
}) => (
  <div className={`fixed inset-y-0 right-0 z-50 w-80 bg-white shadow-xl transform transition-transform duration-300 ${
    isOpen ? 'translate-x-0' : 'translate-x-full'
  } md:relative md:translate-x-0 md:w-64 md:shadow-none border-l border-gray-200`}>
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-slate-900">Filters</h3>
        <button onClick={onClose} className="md:hidden p-2 text-slate-400 hover:text-slate-600">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Goal Type Filter */}
      <div className="mb-6">
        <h4 className="font-semibold text-slate-900 mb-3">Goal Type</h4>
        <div className="space-y-2">
          {['Crypto', 'Lifestyle'].map((type) => (
            <label key={type} className="flex items-center">
              <input
                type="checkbox"
                checked={filters.goalTypes.includes(type)}
                onChange={(e) => onFilterChange('goalType', type, (e.target as HTMLInputElement).checked)}
                className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="ml-2 text-sm text-slate-700">{type}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Stake Amount Filter */}
      <div className="mb-6">
        <h4 className="font-semibold text-slate-900 mb-3">Stake Amount</h4>
        <div className="space-y-2">
          {[
            { label: 'Under 0.1 SOL', min: 0, max: 0.1 },
            { label: '0.1 - 1 SOL', min: 0.1, max: 1 },
            { label: '1+ SOL', min: 1, max: Infinity }
          ].map((range) => (
            <label key={range.label} className="flex items-center">
              <input
                type="checkbox"
                checked={filters.stakeRanges.some(r => r.min === range.min && r.max === range.max)}
                onChange={(e) => onFilterChange('stakeRange', range, (e.target as HTMLInputElement).checked)}
                className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="ml-2 text-sm text-slate-700">{range.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Duration Filter */}
      <div className="mb-6">
        <h4 className="font-semibold text-slate-900 mb-3">Duration</h4>
        <div className="space-y-2">
          {[
            { label: '1-7 Days', min: 1, max: 7 },
            { label: '1-4 Weeks', min: 8, max: 28 },
            { label: '1+ Month', min: 29, max: Infinity }
          ].map((range) => (
            <label key={range.label} className="flex items-center">
              <input
                type="checkbox"
                checked={filters.durationRanges.some(r => r.min === range.min && r.max === range.max)}
                onChange={(e) => onFilterChange('durationRange', range, (e.target as HTMLInputElement).checked)}
                className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="ml-2 text-sm text-slate-700">{range.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Sort Options */}
      <div className="mb-6">
        <h4 className="font-semibold text-slate-900 mb-3">Sort By</h4>
        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-lg text-slate-700 focus:ring-2 focus:ring-emerald-500"
        >
          <option value="newest">Newest First</option>
          <option value="gaining">Gaining Momentum</option>
          <option value="oldest">Oldest First</option>
          <option value="stake-high">Highest Stake</option>
          <option value="stake-low">Lowest Stake</option>
          <option value="participants">Most Participants</option>
          <option value="duration">Longest Duration</option>
        </select>
      </div>

      <button
        onClick={() => {
          onFilterChange('reset', null);
          onSortChange('newest');
        }}
        className="w-full bg-slate-100 text-slate-700 py-2 rounded-lg font-medium hover:bg-slate-200 transition-colors"
      >
        Clear All Filters
      </button>
    </div>
  </div>
);

// --- Main Application Component ---

export default function PoolsPage() {
  const [user, setUser] = useState<any>(null);
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    goalTypes: [] as string[],
    stakeRanges: [] as { min: number; max: number }[],
    durationRanges: [] as { min: number; max: number }[]
  });
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);

  // Solana State
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [balance, setBalance] = useState<number | null>(null);
  const [joiningPoolId, setJoiningPoolId] = useState<string | null>(null);

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

  // Fetch Pools
  useEffect(() => {
    const fetchPools = async () => {
      const { data, error } = await supabase
        .from('pools')
        .select('*')
        .order('created_at', { ascending: false });

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

  const handleFilterChange = (key: string, value: any, checked?: boolean) => {
    if (key === 'reset') {
      setFilters({
        goalTypes: [],
        stakeRanges: [],
        durationRanges: []
      });
      return;
    }

    if (key === 'goalType') {
      setFilters(prev => ({
        ...prev,
        goalTypes: checked
          ? [...prev.goalTypes, value]
          : prev.goalTypes.filter(type => type !== value)
      }));
    } else if (key === 'stakeRange') {
      setFilters(prev => ({
        ...prev,
        stakeRanges: checked
          ? [...prev.stakeRanges, value]
          : prev.stakeRanges.filter(range => range.min !== value.min || range.max !== value.max)
      }));
    } else if (key === 'durationRange') {
      setFilters(prev => ({
        ...prev,
        durationRanges: checked
          ? [...prev.durationRanges, value]
          : prev.durationRanges.filter(range => range.min !== value.min || range.max !== value.max)
      }));
    }
  };

  const handleJoinPool = async (poolId: string, onChainAddress?: string, currentParticipants?: number) => {
    if (!walletConnected) {
      handleConnectWallet();
      return;
    }

    setJoiningPoolId(poolId);

    try {
      // Simulate Solana transaction
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Update participants count
      const { error } = await supabase
        .from('pools')
        .update({ participants: (currentParticipants || 0) + 1 })
        .eq('id', poolId);

      if (error) throw error;

      setJoiningPoolId(null);
    } catch (err) {
      console.error("Error joining pool:", err);
      setJoiningPoolId(null);
    }
  };

  // Filter and sort pools
  const filteredAndSortedPools = pools
    .filter(pool => {
      const matchesSearch = pool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          pool.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesGoalType = filters.goalTypes.length === 0 || filters.goalTypes.includes(pool.goalType);

      const matchesStake = filters.stakeRanges.length === 0 ||
        filters.stakeRanges.some(range => pool.stakeAmount >= range.min && pool.stakeAmount <= range.max);

      const matchesDuration = filters.durationRanges.length === 0 ||
        filters.durationRanges.some(range => pool.durationDays >= range.min && pool.durationDays <= range.max);

      return matchesSearch && matchesGoalType && matchesStake && matchesDuration;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'stake-high':
          return b.stakeAmount - a.stakeAmount;
        case 'stake-low':
          return a.stakeAmount - b.stakeAmount;
        case 'participants':
          return b.participants - a.participants;
        case 'duration':
          return b.durationDays - a.durationDays;
        case 'gaining':
          // Sort by recent activity (newest creation + participant count for momentum)
          const aScore = new Date(a.created_at).getTime() + (a.participants * 1000);
          const bScore = new Date(b.created_at).getTime() + (b.participants * 1000);
          return bScore - aScore;
        default: // newest
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar
        walletConnected={walletConnected}
        walletAddress={walletAddress}
        onConnect={handleConnectWallet}
        balance={balance}
      />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">Browse Pools</h1>
          <p className="text-xl text-slate-600">Find and join commitment pools that match your goals</p>
        </div>

        {/* Search and Controls */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8 shadow-sm">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search pools..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl text-slate-900 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            {/* View Mode */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-3 rounded-lg border transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
                    : 'border-gray-300 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Grid3X3 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-3 rounded-lg border transition-colors ${
                  viewMode === 'list'
                    ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
                    : 'border-gray-300 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>

            {/* Filters Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`lg:hidden flex items-center gap-2 px-4 py-3 rounded-xl border transition-colors ${
                showFilters
                  ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
                  : 'border-gray-300 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <SlidersHorizontal className="w-5 h-5" />
              Filters
            </button>
          </div>
        </div>

        <div className="flex gap-8">
          {/* Filters Sidebar */}
          <FiltersSidebar
            filters={filters}
            onFilterChange={handleFilterChange}
            sortBy={sortBy}
            onSortChange={setSortBy}
            isOpen={showFilters}
            onClose={() => setShowFilters(false)}
          />

          {/* Main Content */}
          <div className="flex-1">
            {/* Results Summary */}
            <div className="flex items-center justify-between mb-6">
              <p className="text-slate-600">
                {filteredAndSortedPools.length} pool{filteredAndSortedPools.length !== 1 ? 's' : ''} found
              </p>
              <Link
                href="/create"
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-emerald-200 transition-all transform hover:-translate-y-1 flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Create Pool
              </Link>
            </div>

            {/* Pools Grid/List */}
            {loading ? (
              <div className={`grid gap-6 ${
                viewMode === 'grid'
                  ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                  : 'grid-cols-1'
              }`}>
                {[1,2,3,4,5,6].map(i => (
                  <div key={i} className="h-64 bg-slate-100 rounded-xl animate-pulse"></div>
                ))}
              </div>
            ) : filteredAndSortedPools.length > 0 ? (
              <div className={`grid gap-6 ${
                viewMode === 'grid'
                  ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                  : 'grid-cols-1'
              }`}>
                {filteredAndSortedPools.map(pool => (
                  <PoolCard
                    key={pool.id}
                    pool={pool}
                    onJoin={handleJoinPool}
                    joining={joiningPoolId}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300 shadow-sm">
                <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-200">
                  <Search className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-medium text-slate-900">No pools found</h3>
                <p className="text-slate-500 mt-2 mb-6">Try adjusting your filters or search terms</p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    handleFilterChange('reset', null);
                    setSortBy('newest');
                  }}
                  className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
