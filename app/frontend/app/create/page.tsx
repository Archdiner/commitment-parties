'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { PublicKey } from '@solana/web3.js';
import {
  buildCreatePoolInstruction,
  getConnection,
  signAndSendTransaction,
  solToLamports,
  derivePoolPDA,
  getBalance,
  getCluster,
  requestAirdrop,
} from '@/lib/solana';
import { getPersistedWalletAddress, persistWalletAddress, clearPersistedWalletAddress } from '@/lib/wallet';
import { confirmPoolCreation, createPoolInvite, confirmPoolJoin, getGitHubUsername, getGitHubRepos, initiateGitHubOAuth, type GitHubRepo } from '@/lib/api';
import { buildJoinPoolInstruction } from '@/lib/solana';
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
  User,
  InfoIcon
} from 'lucide-react';

// --- CONFIGURATION ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// --- Types ---
interface PoolFormData {
  name: string;
  description: string;
  // High-level family: crypto vs lifestyle
  goalType: 'Crypto' | 'Lifestyle';
  // Concrete verification type within the family
  verificationType: 'HODL' | 'DCA' | 'GitHub' | 'ScreenTime';
  // Shared economic config
  stakeAmount: number;
  durationDays: number;
  maxParticipants: number;
  // Crypto-specific fields
  tokenType: 'SOL' | 'USDC' | 'CUSTOM';
  customTokenMint: string;
  minBalanceTokens: number;       // For HODL, in token units
  dcaMinTradesPerDay: number;     // For DCA
  // Lifestyle – GitHub fields
  githubUsername: string;
  githubRepo: string;             // owner/repo
  githubMinCommitsPerDay: number;
  // Lifestyle – Screen-time fields
  screenTimeMaxHours: number;
  // Pool visibility
  isPublic: boolean;
  inviteWallets: string;  // Comma-separated wallet addresses
  // Auto-join after creation
  autoJoin: boolean;  // Join the pool immediately after creating it
  // Recruitment period
  recruitmentPeriodHours: number;  // 0=immediate, 1=1hour, 24=1day, 168=1week
  requireMinParticipants: boolean;  // Require minimum participants before starting
  gracePeriodMinutes: number;  // Grace period in minutes after pool starts before verification begins
}

const TOKEN_OPTIONS = [
  {
    value: 'SOL' as const,
    label: 'SOL (Native)',
    mint: 'So11111111111111111111111111111111111111112',
  },
  {
    value: 'USDC' as const,
    label: 'USDC (example mint)',
    // For demo purposes only; on devnet this may differ
    mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4Etgpy8nE5qD5',
  },
  {
    value: 'CUSTOM' as const,
    label: 'Custom SPL Token',
    mint: '',
  },
];

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
                <User className="w-4 h-4" /> Dashboard
              </Link>
              <Link href="/about" className="flex items-center gap-2 text-slate-700 hover:text-emerald-600 font-medium">
                <InfoIcon className="w-4 h-4" /> About
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

const StepIndicator = ({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) => (
  <div className="flex items-center justify-center mb-8">
    {Array.from({ length: totalSteps }, (_, i) => (
      <React.Fragment key={i}>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
          i < currentStep
            ? 'bg-emerald-600 text-white'
            : i === currentStep
            ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-600'
            : 'bg-slate-100 text-slate-400'
        }`}>
          {i < currentStep ? <CheckCircle className="w-5 h-5" /> : i + 1}
        </div>
        {i < totalSteps - 1 && (
          <div className={`w-12 h-0.5 mx-2 ${
            i < currentStep ? 'bg-emerald-600' : 'bg-slate-200'
          }`} />
        )}
      </React.Fragment>
    ))}
  </div>
);

const ChallengeTypeSelector = ({
  goalType,
  verificationType,
  onSelect,
}: {
  goalType: 'Crypto' | 'Lifestyle';
  verificationType: 'HODL' | 'DCA' | 'GitHub' | 'ScreenTime';
  onSelect: (goalType: 'Crypto' | 'Lifestyle', verificationType: 'HODL' | 'DCA' | 'GitHub' | 'ScreenTime') => void;
}) => {
  const isCrypto = goalType === 'Crypto';

  return (
    <div className="grid md:grid-cols-3 gap-6 mb-8">
      {/* Crypto: HODL / DCA */}
      <button
        type="button"
        onClick={() => onSelect('Crypto', verificationType === 'DCA' ? 'DCA' : 'HODL')}
        className={`p-6 rounded-2xl border-2 transition-all text-left ${
          isCrypto
            ? 'border-blue-500 bg-blue-50 shadow-lg'
            : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
        }`}
      >
        <div className="flex items-center gap-4 mb-4">
          <div className={`p-3 rounded-xl ${isCrypto ? 'bg-blue-100' : 'bg-slate-100'}`}>
            <TrendingUp className={`w-8 h-8 ${isCrypto ? 'text-blue-600' : 'text-slate-600'}`} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">Crypto: HODL / DCA</h3>
            <p className="text-slate-600 text-sm">On-chain verified trading goals</p>
          </div>
        </div>
        <div className="flex gap-2 mb-3">
          <span
            onClick={(e) => {
              e.stopPropagation();
              onSelect('Crypto', 'HODL');
            }}
            className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer ${
              verificationType === 'HODL' && isCrypto
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700'
            }`}
          >
            HODL
          </span>
          <span
            onClick={(e) => {
              e.stopPropagation();
              onSelect('Crypto', 'DCA');
            }}
            className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer ${
              verificationType === 'DCA' && isCrypto
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700'
            }`}
          >
            DCA
          </span>
        </div>
        <ul className="space-y-1 text-sm text-slate-600">
          <li>• Daily DCA or HODL commitments</li>
          <li>• Crypto-native verification</li>
        </ul>
      </button>

      {/* Lifestyle: GitHub Coding */}
      <button
        type="button"
        onClick={() => onSelect('Lifestyle', 'GitHub')}
        className={`p-6 rounded-2xl border-2 transition-all text-left ${
          goalType === 'Lifestyle' && verificationType === 'GitHub'
            ? 'border-emerald-500 bg-emerald-50 shadow-lg'
            : 'border-gray-200 hover:border-emerald-300 hover:bg-emerald-50'
        }`}
      >
        <div className="flex items-center gap-4 mb-4">
          <div
            className={`p-3 rounded-xl ${
              goalType === 'Lifestyle' && verificationType === 'GitHub' ? 'bg-emerald-100' : 'bg-slate-100'
            }`}
          >
            <Activity
              className={`w-8 h-8 ${
                goalType === 'Lifestyle' && verificationType === 'GitHub' ? 'text-emerald-600' : 'text-slate-600'
              }`}
            />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">Lifestyle: GitHub Coding</h3>
            <p className="text-slate-600 text-sm">Daily commits to your repo</p>
          </div>
        </div>
        <ul className="space-y-1 text-sm text-slate-600">
          <li>• Track daily GitHub commits</li>
          <li>• Repo + author based verification</li>
        </ul>
      </button>

      {/* Lifestyle: Screen Time */}
      <button
        type="button"
        onClick={() => onSelect('Lifestyle', 'ScreenTime')}
        className={`p-6 rounded-2xl border-2 transition-all text-left ${
          goalType === 'Lifestyle' && verificationType === 'ScreenTime'
            ? 'border-emerald-500 bg-emerald-50 shadow-lg'
            : 'border-gray-200 hover:border-emerald-300 hover:bg-emerald-50'
        }`}
      >
        <div className="flex items-center gap-4 mb-4">
          <div
            className={`p-3 rounded-xl ${
              goalType === 'Lifestyle' && verificationType === 'ScreenTime' ? 'bg-emerald-100' : 'bg-slate-100'
            }`}
          >
            <Clock
              className={`w-8 h-8 ${
                goalType === 'Lifestyle' && verificationType === 'ScreenTime' ? 'text-emerald-600' : 'text-slate-600'
              }`}
            />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">Lifestyle: Screen Time</h3>
            <p className="text-slate-600 text-sm">Upload daily screen-time screenshot</p>
          </div>
        </div>
        <ul className="space-y-1 text-sm text-slate-600">
          <li>• Max hours/day limit</li>
          <li>• Screenshot-based check-ins</li>
        </ul>
      </button>
    </div>
  );
};

const ChallengeTemplates = ({
  goalType,
  verificationType,
  onSelectTemplate,
}: {
  goalType: 'Crypto' | 'Lifestyle';
  verificationType: 'HODL' | 'DCA' | 'GitHub' | 'ScreenTime';
  onSelectTemplate: (template: { name: string; description: string }) => void;
}) => {
  let templates: { name: string; description: string }[] = [];

  if (goalType === 'Crypto' && verificationType === 'DCA') {
    templates = [
      {
        name: "30-Day DCA into SOL",
        description: "Buy a fixed amount of SOL every day for 30 days. Build a consistent DCA habit.",
      },
      {
        name: "7-Day DeFi DCA Sprint",
        description: "Make at least one trade per day for a week to stay active in the market.",
      },
      {
        name: "Weekend Trader",
        description: "Trade every Saturday and Sunday for a month. Perfect for part-time DCA.",
      },
    ];
  } else if (goalType === 'Crypto') {
    // Crypto – HODL defaults
    templates = [
      {
        name: "HODL 1 SOL for 30 Days",
        description: "Keep at least 1 SOL in your wallet for 30 days without dropping below the threshold.",
      },
      {
        name: "Quarterly HODL Streak",
        description: "Maintain a long-term position for 90 days and avoid panic selling.",
      },
      {
        name: "Stablecoin Safety Net",
        description: "Keep a minimum USDC balance as your 'emergency fund' for 60 days.",
      },
    ];
  } else if (verificationType === 'GitHub') {
    templates = [
      {
        name: "Daily GitHub Commit",
        description: "Ship at least one commit every day to stay in motion and avoid long breaks.",
      },
      {
        name: "Weekend Hacker",
        description: "Commit code every weekend for a month. Great for side projects.",
      },
      {
        name: "Open Source Streak",
        description: "Contribute daily to any repo (personal or OSS) for 14 days straight.",
      },
    ];
  } else {
    // Lifestyle – Screen Time
    templates = [
      {
        name: "2 Hours Max Screen Time",
        description: "Keep your daily screen time under 2 hours and reclaim your focus.",
      },
      {
        name: "Social Media Detox",
        description: "Reduce screen time by 50% for 14 days and track it with daily screenshots.",
      },
      {
        name: "Evening Wind Down",
        description: "No screens after 9pm for 21 days. Upload your daily system screenshot as proof.",
      },
    ];
  }

  return (
    <div className="mb-8">
      <h3 className="text-lg font-bold text-slate-900 mb-4">Choose a Template (Optional)</h3>
      <div className="grid gap-4">
        {templates.map((template, index) => (
          <button
            key={index}
            onClick={() => onSelectTemplate(template)}
            className="p-4 border border-gray-200 rounded-xl hover:border-emerald-300 hover:bg-emerald-50 transition-all text-left"
          >
            <h4 className="font-semibold text-slate-900 mb-1">{template.name}</h4>
            <p className="text-sm text-slate-600">{template.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
};

// --- Main Component ---

export default function CreatePoolPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isDeploying, setIsDeploying] = useState(false);

  const [formData, setFormData] = useState<PoolFormData>({
    name: '',
    description: '',
    goalType: 'Crypto',
    verificationType: 'HODL',
    stakeAmount: 0.1,
    durationDays: 7,
    maxParticipants: 10,
    tokenType: 'SOL',
    customTokenMint: '',
    minBalanceTokens: 1,
    dcaMinTradesPerDay: 1,
    githubUsername: '',
    githubRepo: '',
    githubMinCommitsPerDay: 1,
    screenTimeMaxHours: 2,
    isPublic: true,
    inviteWallets: '',
    autoJoin: true,  // Default: join pool after creating
    recruitmentPeriodHours: 24,  // Default: 1 day recruitment
    requireMinParticipants: false,  // Default: start with any participants
    gracePeriodMinutes: 5,  // Default: 5 minutes grace period
  });

  // Solana State
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [balance, setBalance] = useState<number | null>(null);
  const [transactionSignature, setTransactionSignature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validatingRepo, setValidatingRepo] = useState(false);
  const [repoValidationError, setRepoValidationError] = useState<string | null>(null);
  const [githubVerified, setGithubVerified] = useState(false);
  const [githubUsername, setGithubUsername] = useState<string | null>(null);
  const [githubRepos, setGithubRepos] = useState<GitHubRepo[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);

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

  // Restore wallet connection from localStorage
  useEffect(() => {
    const saved = getPersistedWalletAddress();
    if (saved) {
      setWalletConnected(true);
      setWalletAddress(saved);
    }
  }, []);

  // Check GitHub verification when wallet is connected (for navbar display)
  // This runs independently to always show GitHub status in navbar
  useEffect(() => {
    if (!walletConnected || !walletAddress) {
      // Only clear if wallet is disconnected
      if (!walletConnected) {
        setGithubUsername(null);
      }
      return;
    }

    let cancelled = false;

    const checkGitHubStatus = async () => {
      try {
        const githubData = await getGitHubUsername(walletAddress);
        if (!cancelled) {
          const username = githubData.verified_github_username || null;
          setGithubUsername(username);
        }
      } catch (err) {
        console.error('Error checking GitHub status:', err);
        // On error, set to null so button shows (user can try connecting)
        if (!cancelled) {
          setGithubUsername(null);
        }
      }
    };

    // Small delay to ensure wallet is fully connected
    const timeoutId = setTimeout(() => {
      checkGitHubStatus();
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [walletConnected, walletAddress]);

  // Check GitHub verification when wallet is connected and GitHub challenge is selected
  // This is for form-specific logic (repos, verification status)
  useEffect(() => {
    const checkGitHubVerification = async () => {
      if (!walletConnected || !walletAddress || formData.verificationType !== 'GitHub') {
        setGithubVerified(false);
        setGithubRepos([]);
        // Don't clear githubUsername here - it's managed by the navbar useEffect
        return;
      }

      try {
        const githubData = await getGitHubUsername(walletAddress);
        if (githubData.verified_github_username) {
          setGithubVerified(true);
          // Update githubUsername if not already set (for navbar)
          if (!githubUsername) {
            setGithubUsername(githubData.verified_github_username);
          }
          // Auto-populate username in form
          setFormData(prev => ({ ...prev, githubUsername: githubData.verified_github_username }));
          
          // Fetch repositories
          setLoadingRepos(true);
          try {
            const reposData = await getGitHubRepos(walletAddress);
            setGithubRepos(reposData.repositories || []);
            // If there's a message about token expiration, log it but don't fail
            if (reposData.message) {
              console.warn('GitHub repos:', reposData.message);
            }
          } catch (err: any) {
            console.error('Error fetching repos:', err);
            // If token expired or not found, still allow user to proceed with "any repo"
            // Don't unset githubVerified - they're still verified, just can't load repos
            setGithubRepos([]);
          } finally {
            setLoadingRepos(false);
          }
        } else {
          setGithubVerified(false);
          setGithubRepos([]);
          // Don't clear githubUsername here - let navbar useEffect handle it
        }
      } catch (err) {
        console.error('Error checking GitHub verification:', err);
        setGithubVerified(false);
        setGithubRepos([]);
        // Don't clear githubUsername on error
      }
    };

    checkGitHubVerification();
  }, [walletConnected, walletAddress, formData.verificationType]);

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

      // Check if on devnet
      const cluster = getCluster();
      if (cluster === 'devnet') {
        // Try to connect to devnet
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
      persistWalletAddress(pubKey);
    } catch (err: any) {
      throw new Error(`Airdrop failed: ${err.message}`);
    }
  };

  const handleTemplateSelect = (template: { name: string; description: string }) => {
    setFormData(prev => ({
      ...prev,
      name: template.name,
      description: template.description
    }));
  };


  const handleSubmit = async () => {
    if (!walletConnected || !walletAddress) {
      handleConnectWallet();
      return;
    }

    setIsDeploying(true);

    try {
      // Get Phantom wallet
      const { solana } = window as any;
      if (!solana || !solana.isPhantom) {
        throw new Error('Phantom wallet not found');
      }

      // Generate pool_id (use timestamp for uniqueness)
      const poolId = Math.floor(Date.now() / 1000);
      
      // Derive pool PDA
      const [poolPubkey] = await derivePoolPDA(poolId);
      
      // Prepare goal type and metadata
      let goalType: string;
      let goalMetadata: Record<string, any> = {};

      if (formData.goalType === 'Crypto') {
        // Resolve token mint
        const selectedToken = TOKEN_OPTIONS.find((t) => t.value === formData.tokenType);
        const tokenMint =
          formData.tokenType === 'CUSTOM'
            ? formData.customTokenMint.trim()
            : selectedToken?.mint ?? TOKEN_OPTIONS[0].mint;

        if (formData.verificationType === 'DCA') {
          goalType = 'DailyDCA';
          goalMetadata = {
            token_mint: tokenMint,
            min_trades_per_day: formData.dcaMinTradesPerDay || 1,
          };
        } else {
          // Default crypto type: HODL
          goalType = 'hodl_token';
          const minBalanceLamports = Math.max(
            0,
            Math.floor((formData.minBalanceTokens || 0) * 1e9),
          );
          goalMetadata = {
            token_mint: tokenMint,
            min_balance: minBalanceLamports,
            check_frequency: 'hourly',
          };
        }
      } else {
        // Lifestyle family
        goalType = 'lifestyle_habit';
        if (formData.verificationType === 'GitHub') {
          goalMetadata = {
            habit_type: 'github_commits',
            github_username: formData.githubUsername.trim(),
            repo: formData.githubRepo.trim() || undefined, // Only include if provided
            min_commits_per_day: formData.githubMinCommitsPerDay || 1,
          };
        } else {
          // Screen time
          goalMetadata = {
            habit_type: 'screen_time',
            max_hours: formData.screenTimeMaxHours || 2,
            verification_method: 'screenshot_upload',
          };
        }
      }
      
      // Calculate timestamps based on recruitment period
      // For on-chain, we still use immediate start (smart contract doesn't know about recruitment)
      // Backend will handle the scheduled start time
      const currentTime = Math.floor(Date.now() / 1000);
      const startTimestamp = currentTime; // On-chain uses current time
      const endTimestamp = startTimestamp + (formData.durationDays * 24 * 60 * 60);
      
      // Default charity address (can be updated later)
      const charityAddress = walletAddress; // For now, use creator's wallet
      
      // Build instruction
      const instruction = await buildCreatePoolInstruction(
        poolId,
        new PublicKey(walletAddress),
        goalType,
        goalMetadata,
        solToLamports(formData.stakeAmount),
        formData.durationDays,
        formData.maxParticipants,
        1, // min_participants
        charityAddress,
        'competitive', // distribution_mode
        100 // winner_percent
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
      // Calculate start and end timestamps based on recruitment period
      const now = Math.floor(Date.now() / 1000);
      const recruitmentSeconds = formData.recruitmentPeriodHours * 3600;
      const actualStartTimestamp = now + recruitmentSeconds; // When challenge actually starts
      const actualEndTimestamp = actualStartTimestamp + (formData.durationDays * 86400);

      const poolData = await confirmPoolCreation({
        pool_id: poolId,
        pool_pubkey: poolPubkey.toString(),
        transaction_signature: signature,
        creator_wallet: walletAddress,
        name: formData.name,
        description: formData.description,
        goal_type: goalType,
        goal_metadata: goalMetadata,
        stake_amount: formData.stakeAmount,
        duration_days: formData.durationDays,
        max_participants: formData.maxParticipants,
        min_participants: 1,
        distribution_mode: 'competitive',
        split_percentage_winners: 100,
        charity_address: charityAddress,
        start_timestamp: actualStartTimestamp, // When challenge actually starts
        end_timestamp: actualEndTimestamp,
        is_public: formData.isPublic,
        recruitment_period_hours: formData.recruitmentPeriodHours,
        require_min_participants: formData.requireMinParticipants,
        grace_period_minutes: formData.gracePeriodMinutes,
      });

      // Create invites if pool is private and invite wallets provided
      if (!formData.isPublic && formData.inviteWallets.trim()) {
        const inviteWallets = formData.inviteWallets
          .split(',')
          .map(w => w.trim())
          .filter(w => w.length > 0);
        
        for (const inviteWallet of inviteWallets) {
          try {
            await createPoolInvite(poolId, {
              pool_id: poolId,
              invitee_wallet: inviteWallet,
            });
          } catch (err) {
            console.error(`Failed to create invite for ${inviteWallet}:`, err);
            // Continue with other invites even if one fails
          }
        }
      }

      // Store transaction signature for display
      setTransactionSignature(signature);
      
      // Auto-join pool if enabled
      if (formData.autoJoin) {
        try {
          // Check GitHub verification if needed
          if (goalMetadata.habit_type === 'github_commits') {
            const githubCheck = await getGitHubUsername(walletAddress);
            if (!githubCheck.verified_github_username) {
              const shouldVerify = confirm(
                'This pool requires GitHub commit verification. You need to verify your GitHub account first.\n\n' +
                'Would you like to verify your GitHub account now? (You can join the pool after verification)'
              );
              if (shouldVerify) {
                router.push(`/pools/${poolData.pool_id}?verify_github=true`);
                return;
              }
              // Continue without joining if user cancels verification
              router.push(`/pools/${poolData.pool_id}`);
              return;
            }
          }

          // Build join instruction
          const joinInstruction = await buildJoinPoolInstruction(
            poolId,
            new PublicKey(walletAddress)
          );
          
          // Sign and send join transaction
          const joinSignature = await signAndSendTransaction(
            connection,
            joinInstruction,
            walletAdapter
          );
          
          // Confirm join with backend
          await confirmPoolJoin(poolId, {
            transaction_signature: joinSignature,
            participant_wallet: walletAddress,
          });
          
          console.log('Auto-joined pool successfully');
        } catch (joinErr: any) {
          console.error('Error auto-joining pool:', joinErr);
          // Don't fail pool creation if auto-join fails
          // User can join manually later
          alert(
            `Pool created successfully, but failed to auto-join: ${joinErr.message}\n\n` +
            'You can join the pool manually from the pool page.'
          );
        }
      }
      
      // Redirect to the created pool
      router.push(`/pools/${poolData.pool_id}`);
    } catch (err: any) {
      console.error("Error creating pool:", err);
      const errorMessage = err.message || 'Unknown error';
      setError(errorMessage);
      setIsDeploying(false);
      
      // Show error alert
      setTimeout(() => {
        alert("Error creating pool: " + errorMessage);
      }, 100);
    }
  };

  const steps = [
    {
      title: "Choose Challenge Type",
      component: (
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">What type of challenge is this?</h2>
          <ChallengeTypeSelector
            goalType={formData.goalType}
            verificationType={formData.verificationType}
            onSelect={(goalType, verificationType) =>
              setFormData(prev => ({ ...prev, goalType, verificationType }))
            }
          />
        </div>
      )
    },
    {
      title: "Challenge Details",
      component: (
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Tell us about your challenge</h2>

          <ChallengeTemplates
            goalType={formData.goalType}
            verificationType={formData.verificationType}
            onSelectTemplate={handleTemplateSelect}
          />

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 uppercase tracking-wider mb-2">
                Challenge Name *
              </label>
              <input
                type="text"
                className="w-full p-4 border border-gray-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                placeholder="e.g., 30 Days HODL Challenge"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 uppercase tracking-wider mb-2">
                Description *
              </label>
              <textarea
                className="w-full p-4 border border-gray-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition resize-none"
                rows={4}
                placeholder="Describe your commitment goal and what participants will do..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
              <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Challenge Settings",
      component: (
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Configure your challenge</h2>

          {/* Goal-type specific settings */}
          {formData.goalType === 'Crypto' ? (
            <div className="mb-8 p-4 border border-blue-100 rounded-xl bg-blue-50/60">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3">
                Crypto Verification Settings ({formData.verificationType === 'DCA' ? 'DCA Trading' : 'HODL Balance'})
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Token
                  </label>
                  <select
                    className="w-full p-3 border border-gray-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    value={formData.tokenType}
                    onChange={(e) =>
                      setFormData(prev => ({ ...prev, tokenType: e.target.value as PoolFormData['tokenType'] }))
                    }
                  >
                    {TOKEN_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  {formData.tokenType === 'CUSTOM' && (
                    <input
                      type="text"
                      className="mt-2 w-full p-3 border border-gray-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder="Custom SPL token mint address"
                      value={formData.customTokenMint}
                      onChange={(e) =>
                        setFormData(prev => ({ ...prev, customTokenMint: e.target.value }))
                      }
                    />
                  )}
                </div>

                {formData.verificationType === 'DCA' ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                      Min trades per day
                    </label>
                    <input
                      type="number"
                      min={1}
                      className="w-full p-3 border border-gray-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      value={formData.dcaMinTradesPerDay}
                      onChange={(e) =>
                        setFormData(prev => ({
                          ...prev,
                          dcaMinTradesPerDay: parseInt(e.target.value || '1', 10),
                        }))
                      }
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      Agent checks you made at least this many transactions today.
                    </p>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                      Min balance (token units)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      className="w-full p-3 border border-gray-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      value={formData.minBalanceTokens}
                      onChange={(e) =>
                        setFormData(prev => ({
                          ...prev,
                          minBalanceTokens: parseFloat(e.target.value || '0'),
                        }))
                      }
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      Converted to lamports using 9 decimals for verification.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : formData.verificationType === 'GitHub' ? (
            <div className="mb-8 p-4 border border-emerald-100 rounded-xl bg-emerald-50/60">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3">
                Lifestyle – GitHub Settings
              </h3>
              
              {!walletConnected ? (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-blue-700 font-medium mb-2">Connect your wallet first</p>
                  <p className="text-blue-600 text-sm">
                    You need to connect your wallet before setting up a GitHub challenge.
                  </p>
                </div>
              ) : !githubVerified ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-amber-700 font-medium mb-2">GitHub account not connected</p>
                      <p className="text-amber-600 text-sm mb-4">
                        You need to verify your GitHub account before creating a GitHub challenge. This ensures we can track your commits automatically.
                      </p>
                      <button
                        onClick={async () => {
                          try {
                            const { auth_url } = await initiateGitHubOAuth(walletAddress);
                            window.location.href = auth_url;
                          } catch (err: any) {
                            alert(`Failed to initiate GitHub connection: ${err.message || 'Unknown error'}`);
                          }
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Connect GitHub Account
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                      GitHub username
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        className="w-full p-3 border border-gray-300 rounded-lg text-slate-900 bg-gray-50 text-sm"
                        value={githubUsername || ''}
                        readOnly
                        disabled
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-emerald-600 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Connected and verified
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                      Repository <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    {loadingRepos ? (
                      <div className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                        <span className="text-sm text-slate-500">Loading repositories...</span>
                      </div>
                    ) : githubRepos.length === 0 ? (
                      <div className="space-y-2">
                        <select
                          className="w-full p-3 border border-gray-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                          value={formData.githubRepo}
                          onChange={(e) => {
                            setFormData(prev => ({ ...prev, githubRepo: e.target.value }));
                            setRepoValidationError(null);
                          }}
                        >
                          <option value="">Any repository (track all commits)</option>
                        </select>
                        <p className="text-xs text-amber-600 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Repository list unavailable. You can still create a challenge that tracks all repositories.
                        </p>
                      </div>
                    ) : (
                      <select
                        className="w-full p-3 border border-gray-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                        value={formData.githubRepo}
                        onChange={(e) => {
                          setFormData(prev => ({ ...prev, githubRepo: e.target.value }));
                          setRepoValidationError(null);
                        }}
                      >
                        <option value="">Any repository (track all commits)</option>
                        {githubRepos.map((repo) => (
                          <option key={repo.full_name} value={repo.full_name}>
                            {repo.full_name} {repo.private ? '(Private)' : ''}
                          </option>
                        ))}
                      </select>
                    )}
                    {!formData.githubRepo && githubRepos.length > 0 && (
                      <p className="mt-1 text-xs text-slate-500">
                        Select a repository or leave as "Any repository" to track all commits
                      </p>
                    )}
                    {formData.githubRepo && (
                      <p className="mt-1 text-xs text-emerald-600 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Tracking commits in {formData.githubRepo}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                      Min commits per day
                    </label>
                    <input
                      type="number"
                      min={1}
                      className="w-full p-3 border border-gray-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                      value={formData.githubMinCommitsPerDay}
                      onChange={(e) =>
                        setFormData(prev => ({
                          ...prev,
                          githubMinCommitsPerDay: parseInt(e.target.value || '1', 10),
                        }))
                      }
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="mb-8 p-4 border border-emerald-100 rounded-xl bg-emerald-50/60">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3">
                Lifestyle – Screen Time Settings
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Max hours per day
                  </label>
                  <input
                    type="number"
                    min={0.5}
                    step={0.5}
                    className="w-full p-3 border border-gray-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                    value={formData.screenTimeMaxHours}
                    onChange={(e) =>
                      setFormData(prev => ({
                        ...prev,
                        screenTimeMaxHours: parseFloat(e.target.value || '0'),
                      }))
                    }
                  />
                </div>
                <div className="flex items-center">
                  <p className="text-xs text-slate-600">
                    Upload an iOS/Android screen-time screenshot daily. The agent checks that a
                    successful check-in with a screenshot exists for each day.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 uppercase tracking-wider mb-2">
                Stake Amount (SOL) *
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  className="w-full pl-12 pr-4 py-4 border border-gray-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition font-mono"
                  value={formData.stakeAmount}
                  onChange={(e) => setFormData(prev => ({ ...prev, stakeAmount: parseFloat(e.target.value) }))}
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">Each participant stakes this amount</p>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 uppercase tracking-wider mb-2">
                Duration (Days) *
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="number"
                  min="1"
                  max="365"
                  className="w-full pl-12 pr-4 py-4 border border-gray-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                  value={formData.durationDays}
                  onChange={(e) => setFormData(prev => ({ ...prev, durationDays: parseInt(e.target.value) }))}
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 uppercase tracking-wider mb-2">
                Max Participants *
              </label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="number"
                  min="2"
                  max="100"
                  className="w-full pl-12 pr-4 py-4 border border-gray-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                  value={formData.maxParticipants}
                  onChange={(e) => setFormData(prev => ({ ...prev, maxParticipants: parseInt(e.target.value) }))}
                />
              </div>
            </div>
          </div>

          {/* Private/Public Toggle */}
          <div className="mt-8 p-6 bg-slate-50 rounded-xl border border-slate-200">
            <h3 className="font-bold text-slate-900 mb-4">Pool Visibility</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, isPublic: true }))}
                  className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                    formData.isPublic
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${formData.isPublic ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                      <Users className={`w-5 h-5 ${formData.isPublic ? 'text-emerald-600' : 'text-gray-400'}`} />
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-slate-900">Public Pool</div>
                      <div className="text-sm text-slate-600">Anyone can discover and join</div>
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, isPublic: false }))}
                  className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                    !formData.isPublic
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${!formData.isPublic ? 'bg-blue-100' : 'bg-gray-100'}`}>
                      <Shield className={`w-5 h-5 ${!formData.isPublic ? 'text-blue-600' : 'text-gray-400'}`} />
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-slate-900">Private Pool</div>
                      <div className="text-sm text-slate-600">Only invited wallets can join</div>
                    </div>
                  </div>
                </button>
              </div>

              {!formData.isPublic && (
                <div className="mt-4">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Invite Wallet Addresses (comma-separated)
                  </label>
                  <textarea
                    className="w-full p-3 border border-gray-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono"
                    rows={3}
                    placeholder="ABC123..., XYZ789..., ..."
                    value={formData.inviteWallets}
                    onChange={(e) =>
                      setFormData(prev => ({ ...prev, inviteWallets: e.target.value }))
                    }
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Enter wallet addresses separated by commas. These users will be able to join your private pool.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Recruitment Period */}
          <div className="mt-8 p-6 bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl border-2 border-purple-200">
            <div className="flex items-start gap-3 mb-4">
              <div className="bg-purple-100 p-2 rounded-lg">
                <Clock className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-900 mb-1">When Should the Challenge Start?</h3>
                <p className="text-sm text-slate-600">
                  Choose how long people have to join before the challenge begins. Everyone starts together for fairness.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {[
                { hours: 0, label: 'Immediate', icon: Zap, desc: 'Start now', colorClass: 'emerald' },
                { hours: 1, label: '1 Hour', icon: Clock, desc: 'Quick start', colorClass: 'blue' },
                { hours: 24, label: '1 Day', icon: Calendar, desc: 'Standard', colorClass: 'purple' },
                { hours: 168, label: '1 Week', icon: Sparkles, desc: 'Build hype', colorClass: 'amber' },
              ].map(({ hours, label, icon: Icon, desc, colorClass }) => {
                const isSelected = formData.recruitmentPeriodHours === hours;
                const borderColor = isSelected 
                  ? colorClass === 'emerald' ? 'border-emerald-500 bg-emerald-50'
                  : colorClass === 'blue' ? 'border-blue-500 bg-blue-50'
                  : colorClass === 'purple' ? 'border-purple-500 bg-purple-50'
                  : 'border-amber-500 bg-amber-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white';
                const textColor = isSelected
                  ? colorClass === 'emerald' ? 'text-emerald-600 text-emerald-700'
                  : colorClass === 'blue' ? 'text-blue-600 text-blue-700'
                  : colorClass === 'purple' ? 'text-purple-600 text-purple-700'
                  : 'text-amber-600 text-amber-700'
                  : 'text-slate-400 text-slate-700';
                const iconColor = isSelected
                  ? colorClass === 'emerald' ? 'text-emerald-600'
                  : colorClass === 'blue' ? 'text-blue-600'
                  : colorClass === 'purple' ? 'text-purple-600'
                  : 'text-amber-600'
                  : 'text-slate-400';
                const labelColor = isSelected
                  ? colorClass === 'emerald' ? 'text-emerald-700'
                  : colorClass === 'blue' ? 'text-blue-700'
                  : colorClass === 'purple' ? 'text-purple-700'
                  : 'text-amber-700'
                  : 'text-slate-700';
                const descColor = isSelected
                  ? colorClass === 'emerald' ? 'text-emerald-600'
                  : colorClass === 'blue' ? 'text-blue-600'
                  : colorClass === 'purple' ? 'text-purple-600'
                  : 'text-amber-600'
                  : 'text-slate-500';
                
                return (
                  <button
                    key={hours}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, recruitmentPeriodHours: hours }))}
                    className={`p-4 rounded-xl border-2 transition-all text-left shadow-sm ${borderColor} ${isSelected ? 'shadow-lg' : ''}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className={`w-4 h-4 ${iconColor}`} />
                      <span className={`font-bold text-sm ${labelColor}`}>
                        {label}
                      </span>
                    </div>
                    <p className={`text-xs ${descColor}`}>
                      {desc}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Start Time Preview */}
            {formData.recruitmentPeriodHours > 0 && (() => {
              const startTime = new Date(Date.now() + formData.recruitmentPeriodHours * 3600 * 1000);
              const timeStr = startTime.toLocaleString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              });
              return (
                <div className="bg-white rounded-lg p-4 border border-purple-200">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-purple-600" />
                    <span className="text-slate-600">Challenge starts:</span>
                    <span className="font-bold text-purple-700">{timeStr}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    People can join until then. After that, the challenge begins and no new participants can join.
                  </p>
                </div>
              );
            })()}

            {formData.recruitmentPeriodHours === 0 && (
              <div className="bg-white rounded-lg p-4 border border-emerald-200">
                <div className="flex items-center gap-2 text-sm">
                  <Zap className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold text-emerald-700">Challenge starts immediately</span>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Perfect for private challenges with friends who are ready to start now.
                </p>
              </div>
            )}

            {/* Minimum Participants Option */}
            <div className="mt-4 pt-4 border-t border-purple-200">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.requireMinParticipants}
                  onChange={(e) =>
                    setFormData(prev => ({ ...prev, requireMinParticipants: e.target.checked }))
                  }
                  className="mt-1 w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <div className="flex-1">
                  <div className="font-semibold text-slate-900 text-sm">
                    Require minimum participants before starting
                  </div>
                  <div className="text-xs text-slate-600 mt-1">
                    {formData.requireMinParticipants
                      ? `Challenge won't start until at least 2 people join. If minimum not met, recruitment extends by 24 hours.`
                      : 'Challenge will start even if only 1 person joins (you).'}
                  </div>
                </div>
              </label>
            </div>

            {/* Grace Period */}
            <div className="mt-4 pt-4 border-t border-purple-200">
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Grace Period (minutes)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="0"
                  max="1440"
                  value={formData.gracePeriodMinutes}
                  onChange={(e) =>
                    setFormData(prev => ({ ...prev, gracePeriodMinutes: parseInt(e.target.value) || 5 }))
                  }
                  className="w-24 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
                <div className="flex-1">
                  <div className="text-xs text-slate-600">
                    Time after challenge starts before verification begins. 
                    Default: 5 minutes (good for testing and real-world use).
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Cost Breakdown */}
          <div className="mt-8 p-6 bg-slate-50 rounded-xl border border-slate-200">
            <h3 className="font-bold text-slate-900 mb-4">Challenge Summary</h3>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-slate-600">Your Stake:</span>
                <div className="font-bold text-slate-900">{formData.stakeAmount} SOL</div>
              </div>
              <div>
                <span className="text-slate-600">Prize Pool:</span>
                <div className="font-bold text-slate-900">
                  Up to {(formData.stakeAmount * formData.maxParticipants * 0.8).toFixed(2)} SOL
                </div>
              </div>
              <div>
                <span className="text-slate-600">Duration:</span>
                <div className="font-bold text-slate-900">{formData.durationDays} days</div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Deploy Contract",
      component: (
        <div className="text-center">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 mb-8">
            <AlertTriangle className="w-16 h-16 text-amber-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-900 mb-2">Ready to Deploy</h3>
            <p className="text-slate-600 mb-6">
              This will deploy a smart contract on Solana and create your commitment pool.
              You can choose to join immediately or join later.
            </p>

            <div className="bg-white rounded-xl p-6 border border-gray-200 text-left max-w-md mx-auto">
              <h4 className="font-bold text-slate-900 mb-4">Final Details</h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Challenge:</span>
                  <span className="font-medium">{formData.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Type:</span>
                  <span className="font-medium">
                    {formData.goalType === 'Crypto'
                      ? formData.verificationType === 'DCA'
                        ? 'Crypto – DCA Trading'
                        : 'Crypto – HODL'
                      : formData.verificationType === 'GitHub'
                      ? 'Lifestyle – GitHub Coding'
                      : 'Lifestyle – Screen Time'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Stake:</span>
                  <span className="font-medium">{formData.stakeAmount} SOL</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Duration:</span>
                  <span className="font-medium">{formData.durationDays} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Max Participants:</span>
                  <span className="font-medium">{formData.maxParticipants}</span>
                </div>
              </div>

              {/* Auto-join option */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.autoJoin}
                    onChange={(e) =>
                      setFormData(prev => ({ ...prev, autoJoin: e.target.checked }))
                    }
                    className="mt-1 w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                  />
                  <div>
                    <div className="font-semibold text-slate-900">
                      Join this challenge after creating
                    </div>
                    <div className="text-xs text-slate-600 mt-1">
                      {formData.autoJoin
                        ? `You'll automatically join and stake ${formData.stakeAmount} SOL`
                        : 'You can join the challenge later from the pool page'}
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {!walletConnected && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
              <p className="text-blue-700 font-medium mb-2">Connect your wallet to continue</p>
              <p className="text-blue-600 text-sm">
                <strong>Note:</strong> Make sure Phantom Wallet is set to <strong>Devnet</strong> mode for testing.
                You can get free devnet SOL from <a href="https://faucet.solana.com/" target="_blank" rel="noopener noreferrer" className="underline">the faucet</a>.
              </p>
            </div>
          )}

          {walletConnected && getCluster() === 'devnet' && balance !== null && balance < 0.1 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
              <p className="text-amber-700 font-medium mb-2">Low Devnet Balance</p>
              <p className="text-amber-600 text-sm mb-2">
                Your balance is {balance.toFixed(4)} SOL. You may need more for transaction fees.
              </p>
              <button
                onClick={() => walletAddress && handleAirdrop(walletAddress)}
                className="text-sm bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors"
              >
                Request 2 SOL Airdrop
              </button>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <p className="text-red-700 font-medium">Error: {error}</p>
              <button
                onClick={() => setError(null)}
                className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {transactionSignature && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6">
              <p className="text-emerald-700 font-medium mb-2">Transaction Successful!</p>
              <a
                href={`https://solscan.io/tx/${transactionSignature}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-emerald-600 hover:text-emerald-800 underline flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                View on Solscan
              </a>
            </div>
          )}
        </div>
      )
    }
  ];

  const isStepValid = () => {
    switch (currentStep) {
      case 0:
        return !!formData.goalType && !!formData.verificationType;
      case 1:
        return formData.name.trim() && formData.description.trim();
      case 2:
        if (!(formData.stakeAmount > 0 && formData.durationDays > 0 && formData.maxParticipants >= 2)) {
          return false;
        }
        if (formData.goalType === 'Crypto') {
          // HODL or DCA need their specific fields
          if (!formData.tokenType) return false;
          if (formData.tokenType === 'CUSTOM' && !formData.customTokenMint.trim()) return false;
          if (formData.verificationType === 'DCA') {
            return formData.dcaMinTradesPerDay >= 1;
          }
          return formData.minBalanceTokens >= 0;
        } else if (formData.verificationType === 'GitHub') {
          return (
            walletConnected && // Wallet must be connected
            githubVerified && // GitHub must be verified
            !!githubUsername && // GitHub username must be available
            formData.githubMinCommitsPerDay >= 1 &&
            !loadingRepos // Don't allow progression while loading repos
          );
        } else {
          return formData.screenTimeMaxHours > 0;
        }
      case 3:
        return walletConnected;
      default:
        return false;
    }
  };

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
        {/* Header */}
        <div className="text-center mb-8">
          <Link
            href="/pools"
            className="inline-flex items-center gap-2 text-slate-600 hover:text-emerald-600 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Pools
          </Link>
          <h1 className="text-4xl font-bold text-slate-900 mb-4">Create Commitment Challenge</h1>
          <p className="text-xl text-slate-600">Turn your goals into competitive games with real stakes</p>
        </div>

        {/* Progress Indicator */}
        <StepIndicator currentStep={currentStep} totalSteps={steps.length} />

        {/* Form Content */}
        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-lg mb-8">
          {steps[currentStep].component}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
            disabled={currentStep === 0}
            className="px-6 py-3 border border-gray-300 rounded-xl font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>

          {currentStep < steps.length - 1 ? (
            <button
              onClick={() => setCurrentStep(prev => Math.min(steps.length - 1, prev + 1))}
              disabled={!isStepValid()}
              className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              Next <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isDeploying || !isStepValid()}
              className="px-8 py-4 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all transform hover:-translate-y-1 shadow-lg shadow-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2"
            >
              {isDeploying ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Deploying Contract...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  {formData.autoJoin ? 'Create & Join Challenge' : 'Create Challenge'}
                </>
              )}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
