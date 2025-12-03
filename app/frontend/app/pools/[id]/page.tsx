'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { PublicKey } from '@solana/web3.js';
import {
  buildJoinPoolInstruction,
  getConnection,
  signAndSendTransaction,
  getBalance,
  getCluster,
  requestAirdrop,
} from '@/lib/solana';
import { getPersistedWalletAddress, persistWalletAddress, clearPersistedWalletAddress } from '@/lib/wallet';
import { confirmPoolJoin, getPool, submitCheckIn, getUserCheckIns, CheckInResponse, getUserParticipations, getGitHubUsername, getParticipantVerifications } from '@/lib/api';
import { useRouter } from 'next/navigation';
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
  Info,
  Image as ImageIcon,
  Upload as UploadIcon
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
  start_timestamp?: number;
  scheduled_start_time?: number;
  recruitment_period_hours?: number;
  status?: string;
  goal_metadata?: Record<string, any>;
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
  balance,
  githubUsername
}: {
  walletConnected: boolean;
  walletAddress: string;
  onConnect: () => void;
  balance: number | null;
  githubUsername?: string | null;
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

            {walletConnected && (
              githubUsername ? (
                <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
                  <svg className="w-4 h-4 text-slate-700" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium text-slate-700">@{githubUsername}</span>
                </div>
              ) : (
                <Link
                  href="/verify-github"
                  className="hidden md:flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg text-slate-700 hover:text-slate-900 transition-colors text-sm font-medium"
                  title="Connect GitHub account"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                  </svg>
                  <span>Connect GitHub</span>
                </Link>
              )
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

const PoolHeader = ({
  pool,
  onJoin,
  joining,
  walletConnected,
  error,
  setError,
  transactionSignature,
  isParticipant,
}: {
  pool: Pool;
  onJoin: () => void;
  joining: boolean;
  walletConnected: boolean;
  error: string | null;
  setError: (value: string | null) => void;
  transactionSignature: string | null;
  isParticipant: boolean;
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
          disabled={isParticipant || pool.participants >= pool.maxParticipants || joining || !walletConnected}
          className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all transform hover:-translate-y-1 shadow-lg ${
            isParticipant
              ? 'bg-blue-600 text-white cursor-not-allowed shadow-none'
              : pool.participants >= pool.maxParticipants
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
          ) : isParticipant ? (
            <>
              <CheckCircle className="w-5 h-5 inline mr-2" />
              Already Joined
            </>
          ) : pool.participants >= pool.maxParticipants ? (
            'Pool Full'
          ) : !walletConnected ? (
            'Connect Wallet to Join'
          ) : (
            `Join Pool (${pool.stakeAmount} SOL)`
          )}
        </button>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-red-700 font-medium text-sm">Error: {error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {transactionSignature && (
          <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <p className="text-emerald-700 font-medium text-sm mb-2">Join Successful!</p>
            <a
              href={`https://solscan.io/tx/${transactionSignature}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-emerald-600 hover:text-emerald-800 underline flex items-center gap-2"
            >
              <ExternalLink className="w-3 h-3" />
              View Transaction on Solscan
            </a>
          </div>
        )}

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

const UserProgressSection = ({ 
  participation,
  pool
}: { 
  participation: any;
  pool?: Pool;
}) => {
  if (!participation) return null;

  const isFailed = participation.participant_status === 'failed';
  const isSuccess = participation.participant_status === 'success';

  // Determine failure reason based on pool type
  const getFailureMessage = () => {
    if (!pool) return "You did not meet the daily requirements for this challenge.";
    
    const goalMetadata = pool.goal_metadata || {};
    const habitType = goalMetadata.habit_type;
    
    if (habitType === 'github_commits') {
      const minCommits = goalMetadata.min_commits_per_day || 1;
      const repo = goalMetadata.repo;
      return `You did not make at least ${minCommits} commit${minCommits > 1 ? 's' : ''} on one or more days. ${repo ? `Required commits to: ${repo}` : 'Commits to any repository count.'}`;
    }
    
    return "You did not meet the daily requirements for this challenge.";
  };

  return (
    <div className={`rounded-2xl border-2 p-8 mb-8 ${
      isFailed 
        ? 'bg-gradient-to-br from-red-50 to-orange-50 border-red-300' 
        : isSuccess
        ? 'bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-300'
        : 'bg-gradient-to-br from-blue-50 to-emerald-50 border-blue-200'
    }`}>
      {/* Failed Status Banner */}
      {isFailed && (
        <div className="bg-red-100 border-2 border-red-400 rounded-xl p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="bg-red-500 p-3 rounded-full">
              <X className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-red-900 mb-2">Challenge Failed</h3>
              <p className="text-red-800 mb-3">
                {getFailureMessage()}
              </p>
              <p className="text-sm text-red-700">
                Your stake will be distributed to successful participants or charity at the end of the challenge.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Success Status Banner */}
      {isSuccess && (
        <div className="bg-emerald-100 border-2 border-emerald-400 rounded-xl p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="bg-emerald-500 p-3 rounded-full">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-emerald-900 mb-2">Challenge Completed!</h3>
              <p className="text-emerald-800">
                Congratulations! You successfully completed all {participation.duration_days} days of the challenge.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 mb-6">
        <div className={`p-3 rounded-xl ${
          isFailed ? 'bg-red-600' : isSuccess ? 'bg-emerald-600' : 'bg-blue-600'
        }`}>
          <BarChart3 className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Your Progress</h2>
          <p className="text-sm text-slate-600">Track your challenge performance</p>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="text-sm text-slate-600 mb-1">Progress</div>
          <div className={`text-3xl font-bold mb-2 ${
            isFailed ? 'text-red-600' : isSuccess ? 'text-emerald-600' : 'text-blue-600'
          }`}>
            {participation.progress}%
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${
                isFailed ? 'bg-red-600' : isSuccess ? 'bg-emerald-600' : 'bg-blue-600'
              }`}
              style={{ width: `${participation.progress}%` }}
            ></div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="text-sm text-slate-600 mb-1">Days Verified</div>
          <div className={`text-3xl font-bold ${
            isFailed ? 'text-red-600' : 'text-emerald-600'
          }`}>
            {participation.days_verified || 0}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            of {participation.duration_days} days
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="text-sm text-slate-600 mb-1">Days Remaining</div>
          <div className="text-3xl font-bold text-amber-600">
            {participation.days_remaining || 0}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {isFailed ? 'Challenge ended' : isSuccess ? 'Completed!' : 'Keep going!'}
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="text-sm text-slate-600 mb-1">Status</div>
          <div className={`text-lg font-bold ${
            isSuccess 
              ? 'text-emerald-600' 
              : isFailed
              ? 'text-red-600'
              : 'text-blue-600'
          }`}>
            {participation.participant_status || 'active'}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {participation.joined_at 
              ? `Joined ${new Date(participation.joined_at).toLocaleDateString()}`
              : 'Active participant'}
          </div>
        </div>
      </div>
    </div>
  );
};

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

const GitHubStatusSection = ({
  pool,
  walletAddress,
  isParticipant
}: {
  pool: Pool;
  walletAddress: string;
  isParticipant: boolean;
}) => {
  const [githubUsername, setGithubUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState<any>(null);
  const [loadingVerifications, setLoadingVerifications] = useState(false);

  useEffect(() => {
    const fetchGitHubStatus = async () => {
      try {
        const data = await getGitHubUsername(walletAddress);
        setGithubUsername(data.verified_github_username);
      } catch (err) {
        console.error('Error fetching GitHub status:', err);
      } finally {
        setLoading(false);
      }
    };

    if (walletAddress) {
      fetchGitHubStatus();
    }
  }, [walletAddress]);

  // Fetch verification status if participant
  useEffect(() => {
    // Only fetch if user is actually a participant
    if (!isParticipant || !walletAddress || !pool.id) {
      setVerificationStatus(null);
      return;
    }
    
    const fetchVerificationStatus = async () => {
      setLoadingVerifications(true);
      try {
        const poolIdNum = parseInt(pool.id);
        const status = await getParticipantVerifications(poolIdNum, walletAddress);
        setVerificationStatus(status);
      } catch (err: any) {
        // Handle 404 gracefully - user might not be a participant yet
        if (err?.status === 404 || err?.message?.includes('not found')) {
          console.debug('Participant not found (user may not have joined yet)');
          setVerificationStatus(null);
        } else {
          console.error('Error fetching verification status:', err);
        }
      } finally {
        setLoadingVerifications(false);
      }
    };

    fetchVerificationStatus();
    // Refresh every 30 seconds to show latest verifications
    const interval = setInterval(fetchVerificationStatus, 30000);
    return () => clearInterval(interval);
  }, [isParticipant, walletAddress, pool.id]);

  const repo = pool.goal_metadata?.repo;
  const minCommits = pool.goal_metadata?.min_commits_per_day || 1;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-emerald-100 p-3 rounded-lg">
          <Activity className="w-6 h-6 text-emerald-600" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-900">GitHub Commit Tracking</h3>
          <p className="text-sm text-slate-600">Automatic verification via GitHub API</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-slate-600">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Checking GitHub connection...</span>
        </div>
      ) : githubUsername ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-emerald-600">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">GitHub account connected: @{githubUsername}</span>
          </div>
          
          <div className="bg-slate-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-600">Repository:</span>
              <span className="font-medium text-slate-900">
                {repo ? repo : 'Any repository (all commits tracked)'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Minimum commits per day:</span>
              <span className="font-medium text-slate-900">{minCommits}</span>
            </div>
          </div>

          {isParticipant && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-700 text-sm">
                  <strong>Note:</strong> Your commits are automatically verified daily. No manual check-in required!
                  The system tracks your commits and verifies them automatically.
                </p>
              </div>
              
              {loadingVerifications ? (
                <div className="bg-slate-50 rounded-lg p-4 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                  <span className="text-sm text-slate-600">Loading verification status...</span>
                </div>
              ) : verificationStatus && (
                <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">Current Day:</span>
                    <span className="text-sm font-bold text-slate-900">
                      {verificationStatus.current_day ? `Day ${verificationStatus.current_day}` : 'Not started'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">Days Verified:</span>
                    <span className="text-sm font-bold text-emerald-600">
                      {verificationStatus.days_verified} / {pool.durationDays}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">Verifications Recorded:</span>
                    <span className="text-sm font-bold text-slate-900">
                      {verificationStatus.passed_verifications} passed, {verificationStatus.total_verifications} total
                    </span>
                  </div>
                  
                  {verificationStatus.verifications && verificationStatus.verifications.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-200">
                      <p className="text-xs font-semibold text-slate-600 mb-2">Recent Verifications:</p>
                      <div className="space-y-1">
                        {verificationStatus.verifications
                          .sort((a: any, b: any) => b.day - a.day)
                          .slice(0, 5)
                          .map((v: any) => (
                            <div key={v.day} className="flex items-center justify-between text-xs">
                              <span className="text-slate-600">Day {v.day}</span>
                              <span className={`font-medium ${v.passed ? 'text-emerald-600' : 'text-red-600'}`}>
                                {v.passed ? '✓ Passed' : '✗ Failed'}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                  
                  {verificationStatus.total_verifications === 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-200">
                      <p className="text-xs text-amber-600">
                        <AlertCircle className="w-3 h-3 inline mr-1" />
                        No verifications yet. The agent checks commits every 5 minutes. Make sure you've pushed commits today!
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-amber-700 font-medium mb-2">GitHub account not connected</p>
              <p className="text-amber-600 text-sm mb-3">
                You need to verify your GitHub account to participate in this challenge.
              </p>
              <Link
                href="/verify-github"
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Connect GitHub Account
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const CheckInSection = ({
  pool,
  walletAddress,
  walletConnected
}: {
  pool: Pool;
  walletAddress: string;
  walletConnected: boolean;
}) => {
  const [checkIns, setCheckIns] = useState<CheckInResponse[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Calculate current day
  // Use scheduled_start_time if available, otherwise use start_timestamp
  const getCurrentDay = (): number | null => {
    const actualStartTime = pool.scheduled_start_time || pool.start_timestamp;
    if (!actualStartTime) return null;
    const now = Math.floor(Date.now() / 1000);
    if (now < actualStartTime) return null;
    const secondsElapsed = now - actualStartTime;
    const daysElapsed = Math.floor(secondsElapsed / 86400);
    return daysElapsed + 1;
  };

  const currentDay = getCurrentDay();
  const isScreenTime = pool.goal_metadata?.habit_type === 'screen_time';
  const isGitHub = pool.goal_metadata?.habit_type === 'github_commits';

  useEffect(() => {
    if (walletConnected && walletAddress && pool.id) {
      const fetchCheckIns = async () => {
        try {
          const poolIdNum = parseInt(pool.id);
          const data = await getUserCheckIns(poolIdNum, walletAddress);
          setCheckIns(data);
        } catch (err) {
          console.error('Error fetching check-ins:', err);
        }
      };
      fetchCheckIns();
    }
  }, [walletConnected, walletAddress, pool.id]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleSubmitCheckIn = async () => {
    if (!walletConnected || !walletAddress || !currentDay) return;
    if (isScreenTime && !selectedFile) {
      alert('Please upload a screenshot for screen-time challenges');
      return;
    }

    setUploading(true);
    try {
      const poolIdNum = parseInt(pool.id);
      
      // For MVP: convert image to base64 (in production, upload to Supabase Storage)
      let screenshotUrl: string | undefined;
      if (selectedFile) {
        const reader = new FileReader();
        screenshotUrl = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(selectedFile);
        });
      }

      const checkIn = await submitCheckIn({
        pool_id: poolIdNum,
        participant_wallet: walletAddress,
        day: currentDay,
        success: true,
        screenshot_url: screenshotUrl,
      });

      setCheckIns(prev => [...prev.filter(c => c.day !== currentDay), checkIn]);
      setSelectedFile(null);
      setPreviewUrl(null);
      
      // Reset file input
      const fileInput = document.getElementById('screenshot-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (err: any) {
      console.error('Error submitting check-in:', err);
      alert(`Failed to submit check-in: ${err.message || 'Unknown error'}`);
    } finally {
      setUploading(false);
    }
  };

  // Don't show manual check-in for GitHub challenges (they're auto-verified)
  if (!walletConnected || pool.goalType !== 'Lifestyle' || isGitHub) return null;

  const hasCheckInToday = checkIns.some(c => c.day === currentDay);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
      <h3 className="text-xl font-bold text-slate-900 mb-4">Daily Check-In</h3>
      
      {currentDay ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div>
              <p className="text-sm text-slate-600">Current Day</p>
              <p className="text-2xl font-bold text-slate-900">Day {currentDay} / {pool.durationDays}</p>
            </div>
            {hasCheckInToday && (
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Checked in today</span>
              </div>
            )}
          </div>

          {isScreenTime && (
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-slate-700">
                Upload Screen Time Screenshot
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-emerald-400 transition-colors">
                <input
                  id="screenshot-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <label
                  htmlFor="screenshot-upload"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="max-h-48 rounded-lg border border-gray-200"
                    />
                  ) : (
                    <>
                      <UploadIcon className="w-12 h-12 text-slate-400" />
                      <span className="text-sm text-slate-600">
                        Click to upload or drag and drop
                      </span>
                      <span className="text-xs text-slate-500">
                        PNG, JPG up to 10MB
                      </span>
                    </>
                  )}
                </label>
              </div>
              {selectedFile && (
                <button
                  onClick={() => {
                    setSelectedFile(null);
                    setPreviewUrl(null);
                  }}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Remove image
                </button>
              )}
            </div>
          )}

          <button
            onClick={handleSubmitCheckIn}
            disabled={uploading || hasCheckInToday || (isScreenTime && !selectedFile)}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 px-4 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Submitting...
              </>
            ) : hasCheckInToday ? (
              <>
                <CheckCircle className="w-5 h-5" />
                Already checked in today
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                Submit Check-In
              </>
            )}
          </button>

          {checkIns.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-semibold text-slate-700 mb-3">Check-In History</h4>
              <div className="space-y-2">
                {checkIns
                  .sort((a, b) => b.day - a.day)
                  .map((checkIn) => (
                    <div
                      key={checkIn.id}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-emerald-600" />
                        <span className="font-medium">Day {checkIn.day}</span>
                        {checkIn.screenshot_url && (
                          <ImageIcon className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                      <span className="text-sm text-slate-600">
                        {new Date(checkIn.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="text-slate-600">Pool hasn't started yet</p>
      )}
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
  const searchParams = useSearchParams();
  const router = useRouter();
  const poolId = params.id as string;

  const [pool, setPool] = useState<Pool | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [isParticipant, setIsParticipant] = useState(false);
  const [userParticipation, setUserParticipation] = useState<any>(null);

  // Solana State
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [balance, setBalance] = useState<number | null>(null);
  const [transactionSignature, setTransactionSignature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [githubUsername, setGithubUsername] = useState<string | null>(null);

  useEffect(() => {
    const fetchPool = async () => {
      try {
        const poolIdNum = parseInt(poolId as string);
        const poolData = await getPool(poolIdNum);
        
        // Convert backend response to frontend Pool format
        const frontendPool: Pool = {
          id: poolData.pool_id.toString(),
          name: poolData.name,
          goalType: poolData.goal_type.includes('Lifestyle') || poolData.goal_type.includes('lifestyle') ? 'Lifestyle' : 'Crypto',
          description: poolData.description || '',
          stakeAmount: poolData.stake_amount,
          durationDays: poolData.duration_days,
          participants: poolData.participant_count,
          maxParticipants: poolData.max_participants,
          created_at: poolData.created_at,
          onChainAddress: poolData.pool_pubkey,
          creatorId: poolData.creator_wallet,
          start_timestamp: poolData.start_timestamp,
          scheduled_start_time: poolData.scheduled_start_time,
          recruitment_period_hours: poolData.recruitment_period_hours,
          status: poolData.status,
          goal_metadata: poolData.goal_metadata,
        };
        
        setPool(frontendPool);
        
        // Generate mock participants based on participant count
        const mockParticipants: Participant[] = Array.from({ length: poolData.participant_count }, (_, i) => ({
          id: `participant-${i}`,
          address: `111111111111111111111111111111${i.toString().padStart(2, '0')}`,
          joinedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
          progress: Math.floor(Math.random() * 100),
          status: Math.random() > 0.8 ? 'completed' : Math.random() > 0.6 ? 'failed' : 'active'
        }));
        setParticipants(mockParticipants);
      } catch (err) {
        console.error("Error fetching pool:", err);
      } finally {
        setLoading(false);
      }
    };

    if (poolId) {
      fetchPool();
    }
  }, [poolId]);

  // Check if user is a participant and fetch their participation data
  useEffect(() => {
    const checkParticipation = async () => {
      if (!walletConnected || !walletAddress || !poolId) {
        setIsParticipant(false);
        setUserParticipation(null);
        return;
      }

      try {
        const participations = await getUserParticipations(walletAddress);
        const poolIdNum = parseInt(poolId);
        const participation = participations.find(p => p.pool_id === poolIdNum);
        
        if (participation) {
          setIsParticipant(true);
          setUserParticipation(participation);
        } else {
          setIsParticipant(false);
          setUserParticipation(null);
        }
      } catch (err) {
        console.error("Error checking participation:", err);
        setIsParticipant(false);
        setUserParticipation(null);
      }
    };

    checkParticipation();
  }, [walletConnected, walletAddress, poolId]);

  // Handle verify_github query param (from auto-join flow)
  useEffect(() => {
    const verifyGitHub = searchParams?.get('verify_github');
    if (verifyGitHub === 'true' && walletConnected && walletAddress && pool) {
      const goalMetadata = pool.goal_metadata || {};
      if (goalMetadata.habit_type === 'github_commits') {
        // Small delay to let page render
        setTimeout(() => {
          const shouldVerify = confirm(
            'This pool requires GitHub commit verification. You need to verify your GitHub account first.\n\n' +
            'Would you like to verify your GitHub account now?'
          );
          if (shouldVerify) {
            router.push('/verify-github');
          }
          // Remove query param
          router.replace(`/pools/${poolId}`);
        }, 500);
      }
    }
  }, [searchParams, walletConnected, walletAddress, pool, poolId, router]);

  // Restore wallet connection from localStorage
  useEffect(() => {
    const saved = getPersistedWalletAddress();
    if (saved) {
      setWalletConnected(true);
      setWalletAddress(saved);
    }
  }, []);

  // Check GitHub status when wallet is connected
  useEffect(() => {
    const checkGitHubStatus = async () => {
      if (!walletConnected || !walletAddress) {
        setGithubUsername(null);
        return;
      }

      try {
        const githubData = await getGitHubUsername(walletAddress);
        setGithubUsername(githubData.verified_github_username || null);
      } catch (err) {
        console.error('Error checking GitHub status:', err);
        setGithubUsername(null);
      }
    };

    checkGitHubStatus();
  }, [walletConnected, walletAddress]);

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
        alert("Please install Phantom Wallet. Make sure it's set to Devnet mode for testing!");
        return;
      }

      const cluster = getCluster();
      if (cluster === 'devnet') {
        try {
          await solana.connect({ onlyIfTrusted: false });
        } catch (e) {
          // User might have rejected, continue anyway
        }
      }

      const response = await solana.connect();
      const pubKey = response.publicKey.toString();
      setWalletAddress(pubKey);
      setWalletConnected(true);
      
      // Get actual balance
      const connection = getConnection();
      const publicKey = new PublicKey(pubKey);
      const balanceLamports = await connection.getBalance(publicKey);
      const balanceSol = balanceLamports / 1e9;
      setBalance(balanceSol);
      persistWalletAddress(pubKey);

      // If on devnet and balance is low, offer airdrop
      if (cluster === 'devnet' && balanceSol < 0.1) {
        const requestAirdrop = confirm(
          `Your devnet balance is low (${balanceSol.toFixed(4)} SOL). Would you like to request a free airdrop?`
        );
        if (requestAirdrop) {
          try {
            await handleAirdrop(pubKey);
          } catch (err) {
            console.error('Airdrop failed:', err);
            alert('Airdrop failed. You can manually request SOL from https://faucet.solana.com/');
          }
        }
      }

    } catch (err) {
      console.error(err);
      alert('Failed to connect wallet. Make sure Phantom is installed and set to Devnet mode.');
    }
  };

  const handleAirdrop = async (walletAddress: string) => {
    try {
      const signature = await requestAirdrop(walletAddress, 2);
      alert(`Airdrop successful! Transaction: ${signature}\n\nRefresh to see updated balance.`);
      // Refresh balance
      const connection = getConnection();
      const publicKey = new PublicKey(walletAddress);
      const balanceLamports = await connection.getBalance(publicKey);
      setBalance(balanceLamports / 1e9);
    } catch (err: any) {
      throw new Error(`Airdrop failed: ${err.message}`);
    }
  };

  const handleJoinPool = async () => {
    if (!walletConnected || !walletAddress) {
      handleConnectWallet();
      return;
    }

    if (!pool) return;

    // Check if already a participant
    if (isParticipant) {
      alert('You are already a participant in this pool!');
      return;
    }

    // Check if this is a GitHub commit pool and verify GitHub account
    const goalMetadata = pool.goal_metadata || {};
    if (goalMetadata.habit_type === 'github_commits') {
      try {
        const githubCheck = await getGitHubUsername(walletAddress);
        if (!githubCheck.verified_github_username) {
          const shouldVerify = confirm(
            'This pool requires GitHub commit verification. You need to verify your GitHub account first.\n\n' +
            'Would you like to verify your GitHub account now?'
          );
          if (shouldVerify) {
            router.push('/verify-github');
          }
          return;
        }
      } catch (err) {
        console.error('Error checking GitHub verification:', err);
        // Continue anyway - backend will handle it
      }
    }

    setJoining(true);

    try {
      // Get Phantom wallet
      const { solana } = window as any;
      if (!solana || !solana.isPhantom) {
        throw new Error('Phantom wallet not found');
      }

      // Get pool_id from pool (assuming it's stored in the pool object)
      // If pool.id is a string, we need to get the actual pool_id from backend
      const poolIdNum = typeof pool.id === 'string' ? parseInt(pool.id) : pool.id;
      
      // Build join instruction
      const instruction = await buildJoinPoolInstruction(
        poolIdNum,
        new PublicKey(walletAddress)
      );
      
      // Sign and send transaction
      const connection = getConnection();
      // Pass solana object directly - it already has the methods we need
      const walletAdapter = {
        publicKey: new PublicKey(walletAddress),
        sendTransaction: solana.sendTransaction,
        signTransaction: solana.signTransaction,
      };
      const signature = await signAndSendTransaction(connection, instruction, walletAdapter);
      
      // Confirm with backend
      const updatedPool = await confirmPoolJoin(poolIdNum, {
        transaction_signature: signature,
        participant_wallet: walletAddress,
      });

      // Store transaction signature for display
      setTransactionSignature(signature);
      
      // Update local state
      setPool({
        ...pool,
        participants: updatedPool.participant_count,
      });

      // Mark as participant
      setIsParticipant(true);

      setJoining(false);
    } catch (err: any) {
      console.error("Error joining pool:", err);
      const errorMessage = err.message || 'Unknown error';
      setError(errorMessage);
      setJoining(false);
      
      // Show error alert
      setTimeout(() => {
        alert("Error joining pool: " + errorMessage);
      }, 100);
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
          githubUsername={githubUsername}
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
          githubUsername={githubUsername}
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

  // Determine if this is a GitHub challenge
  const isGitHub = pool.goal_metadata?.habit_type === 'github_commits';

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar
        walletConnected={walletConnected}
        walletAddress={walletAddress}
        onConnect={handleConnectWallet}
        balance={balance}
        githubUsername={githubUsername}
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
          error={error}
          setError={setError}
          transactionSignature={transactionSignature}
          isParticipant={isParticipant}
        />

        {/* User Progress Section (if participant) */}
        {isParticipant && userParticipation && (
          <UserProgressSection participation={userParticipation} pool={pool} />
        )}

        {/* GitHub Verification Status (for GitHub challenges) */}
        {isGitHub && walletConnected && walletAddress && (
          <GitHubStatusSection
            pool={pool}
            walletAddress={walletAddress}
            isParticipant={isParticipant}
          />
        )}

        {/* Progress Stats */}
        <ProgressSection pool={pool} />

        {/* Check-In Section (for lifestyle pools, excluding GitHub) */}
        {walletConnected && walletAddress && (
          <CheckInSection
            pool={pool}
            walletAddress={walletAddress}
            walletConnected={walletConnected}
          />
        )}

        {/* Participants */}
        <ParticipantsList participants={participants} />
      </main>
    </div>
  );
}
