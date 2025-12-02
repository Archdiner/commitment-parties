'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  goalType: 'Crypto' | 'Lifestyle';
  stakeAmount: number;
  durationDays: number;
  maxParticipants: number;
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

const PoolTypeSelector = ({ selectedType, onSelect }: {
  selectedType: 'Crypto' | 'Lifestyle' | null;
  onSelect: (type: 'Crypto' | 'Lifestyle') => void;
}) => (
  <div className="grid md:grid-cols-2 gap-6 mb-8">
    <button
      onClick={() => onSelect('Crypto')}
      className={`p-6 rounded-2xl border-2 transition-all text-left ${
        selectedType === 'Crypto'
          ? 'border-blue-500 bg-blue-50 shadow-lg'
          : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
      }`}
    >
      <div className="flex items-center gap-4 mb-4">
        <div className={`p-3 rounded-xl ${selectedType === 'Crypto' ? 'bg-blue-100' : 'bg-slate-100'}`}>
          <TrendingUp className={`w-8 h-8 ${selectedType === 'Crypto' ? 'text-blue-600' : 'text-slate-600'}`} />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-900">Crypto Challenges</h3>
          <p className="text-slate-600">On-chain verified goals</p>
        </div>
      </div>
      <ul className="space-y-2 text-sm text-slate-600">
        <li>• Daily DCA challenges</li>
        <li>• HODL streak tracking</li>
        <li>• Staking commitments</li>
        <li>• Automated verification</li>
      </ul>
    </button>

    <button
      onClick={() => onSelect('Lifestyle')}
      className={`p-6 rounded-2xl border-2 transition-all text-left ${
        selectedType === 'Lifestyle'
          ? 'border-emerald-500 bg-emerald-50 shadow-lg'
          : 'border-gray-200 hover:border-emerald-300 hover:bg-emerald-50'
      }`}
    >
      <div className="flex items-center gap-4 mb-4">
        <div className={`p-3 rounded-xl ${selectedType === 'Lifestyle' ? 'bg-emerald-100' : 'bg-slate-100'}`}>
          <Activity className={`w-8 h-8 ${selectedType === 'Lifestyle' ? 'text-emerald-600' : 'text-slate-600'}`} />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-900">Lifestyle Goals</h3>
          <p className="text-slate-600">Social accountability</p>
        </div>
      </div>
      <ul className="space-y-2 text-sm text-slate-600">
        <li>• Screen time limits</li>
        <li>• Exercise routines</li>
        <li>• Reading goals</li>
        <li>• Habit building</li>
      </ul>
    </button>
  </div>
);

const ChallengeTemplates = ({ goalType, onSelectTemplate }: {
  goalType: 'Crypto' | 'Lifestyle';
  onSelectTemplate: (template: { name: string; description: string }) => void;
}) => {
  const cryptoTemplates = [
    {
      name: "30-Day DCA Challenge",
      description: "Buy crypto every day for 30 days. Build consistent investment habits."
    },
    {
      name: "HODL Streak - 90 Days",
      description: "Don't sell any tokens for 90 days. Test your long-term conviction."
    },
    {
      name: "Staking Commitment",
      description: "Maintain staking positions and earn rewards while building habits."
    }
  ];

  const lifestyleTemplates = [
    {
      name: "Screen Time Limit",
      description: "Limit daily screen time to build healthier digital habits."
    },
    {
      name: "Daily Exercise",
      description: "Commit to daily physical activity and build fitness habits."
    },
    {
      name: "Reading Challenge",
      description: "Read for 30 minutes daily and expand your knowledge."
    }
  ];

  const templates = goalType === 'Crypto' ? cryptoTemplates : lifestyleTemplates;

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
    stakeAmount: 0.1,
    durationDays: 7,
    maxParticipants: 10
  });

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

  const handleTemplateSelect = (template: { name: string; description: string }) => {
    setFormData(prev => ({
      ...prev,
      name: template.name,
      description: template.description
    }));
  };

  const handleSubmit = async () => {
    if (!walletConnected) {
      handleConnectWallet();
      return;
    }

    setIsDeploying(true);

    try {
      // Simulate smart contract deployment
      console.log("Creating pool on chain with args:", formData);
      await new Promise(resolve => setTimeout(resolve, 3000));

      const mockOnChainAddress = "8x" + Array(40).fill(0).map(()=>Math.floor(Math.random()*16).toString(16)).join('');
      const mockTxHash = "5" + Array(87).fill(0).map(()=>Math.floor(Math.random()*16).toString(16)).join('');

      // Create pool in database
      const { data, error } = await supabase
        .from('pools')
        .insert([
          {
            name: formData.name,
            description: formData.description,
            goalType: formData.goalType,
            stakeAmount: formData.stakeAmount,
            durationDays: formData.durationDays,
            maxParticipants: formData.maxParticipants,
            participants: 1, // Creator joins automatically
            creatorId: user?.id || 'anon',
            onChainAddress: mockOnChainAddress,
            txHash: mockTxHash
          }
        ])
        .select()
        .single();

      if (error) throw error;

      // Redirect to the created pool
      router.push(`/pools/${data.id}`);
    } catch (err: any) {
      console.error("Error creating pool:", err);
      alert("Error creating pool: " + err.message);
      setIsDeploying(false);
    }
  };

  const steps = [
    {
      title: "Choose Challenge Type",
      component: (
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">What type of challenge is this?</h2>
          <PoolTypeSelector
            selectedType={formData.goalType}
            onSelect={(type) => setFormData(prev => ({ ...prev, goalType: type }))}
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
              You'll automatically join as the first participant.
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
                  <span className="font-medium">{formData.goalType}</span>
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
            </div>
          </div>

          {!walletConnected && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
              <p className="text-blue-700 font-medium">Connect your wallet to continue</p>
            </div>
          )}
        </div>
      )
    }
  ];

  const isStepValid = () => {
    switch (currentStep) {
      case 0:
        return formData.goalType !== null;
      case 1:
        return formData.name.trim() && formData.description.trim();
      case 2:
        return formData.stakeAmount > 0 && formData.durationDays > 0 && formData.maxParticipants >= 2;
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
                  Create Challenge & Stake
                </>
              )}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
