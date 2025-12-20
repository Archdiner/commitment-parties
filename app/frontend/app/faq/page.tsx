'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { SectionLabel } from '@/components/ui/SectionLabel';

interface FAQItem {
  question: string;
  answer: string;
}

const faqCategories = {
  'The Mission': [
    {
      question: 'What is CommitMint?',
      answer: 'CommitMint is an AI-powered accountability platform. You put your money where your mouth is by staking SOL on your goals. Our AI "Commitment Agent" monitors you. If you succeed, you win. If you quit, you lose your stake to the people who didn\'t.'
    },
    {
      question: 'Do I need a crypto wallet to start?',
      answer: 'No. You can sign in with your Google or Email account. We use Privy technology to create a secure "invisible" wallet for you in the background. You can connect a professional wallet like Phantom later if you want.'
    },
    {
      question: 'What types of challenges can I create?',
      answer: 'You can create Crypto challenges (HODL or DCA trading habits verified automatically on-chain) and Social challenges (GitHub commits or screen time limits verified by our AI agent). Each challenge type has different verification methods tailored to the goal.'
    },
    {
      question: 'How long do challenges last?',
      answer: 'Challenges can last anywhere from 1 to 30 days. Most challenges are 7, 14, or 30 days. The duration is set when the challenge is created and cannot be changed. You must verify your progress every single day during this period.'
    }
  ],
  'The Money Flow': [
    {
      question: 'How do I get my money out?',
      answer: 'Once a challenge ends and you are verified as a winner, your original stake plus your share of the reward pool is sent to your account. You can then withdraw this to any external Solana wallet or, once our Apple Pay integration is live, off-ramp it directly to your bank.'
    },
    {
      question: 'How do I win rewards?',
      answer: 'Rewards come from "The Loser\'s Pot." Every time a participant in your challenge fails to verify, their stake is locked into the winner\'s pool. At the end, the survivors split that pot equally.'
    },
    {
      question: 'What happens if I miss a day?',
      answer: 'If you miss a daily verification, you\'re automatically eliminated from the challenge. Your staked SOL goes to the prize pool for the winners. This strict accountability is what makes the system effective - real money creates real motivation.'
    },
    {
      question: 'Can I withdraw my stake early?',
      answer: 'No. Once you stake SOL on a challenge, it\'s locked in a smart contract until the challenge ends. This ensures everyone stays committed and prevents people from backing out when things get tough. This is a core feature, not a bug!'
    },
    {
      question: 'How much SOL should I stake?',
      answer: 'Stake an amount that\'s meaningful enough to motivate you, but not so much that losing it would cause financial hardship. Most people stake between 0.1 and 5 SOL. Remember, you can lose this amount if you fail the challenge.'
    },
    {
      question: 'Are there any fees?',
      answer: 'There are minimal blockchain transaction fees (usually less than $0.01 per transaction). Creating a challenge costs a small fee (about 0.001-0.002 SOL) to cover the on-chain transaction. There are no platform fees or hidden costs - what you see is what you pay.'
    }
  ],
  'Privacy & Security': [
    {
      question: 'Can CommitMint steal my funds?',
      answer: 'No. Your funds are held in a decentralized smart contract on Solana. We do not have a "withdraw" button for your money. Only the logic of the challenge (Success or Failure) can move those funds.'
    },
    {
      question: 'What happens if the website goes down?',
      answer: 'Since everything runs on the Solana blockchain, the smart contracts continue to function even if our website is temporarily unavailable. Your funds remain safe in the blockchain. You can always interact with the contracts directly if needed.'
    },
    {
      question: 'What if the AI verification makes a mistake?',
      answer: 'Our AI verification system is designed to be fair and accurate. If you believe there\'s been an error, contact our support team immediately. We review disputed verifications on a case-by-case basis. However, the system is generally very reliable.'
    },
    {
      question: 'What if I lose access to my wallet?',
      answer: 'If you signed in with Google or Email, your wallet is managed by Privy and you can recover access through your account. If you connected an external wallet like Phantom, you must save your seed phrase when you create it. Without the seed phrase, you cannot recover an external wallet - and any SOL staked in challenges will be lost.'
    }
  ],
  'The Technical': [
    {
      question: 'How do I verify the Smart Contract?',
      answer: 'Transparency is our core. You can view all challenge logic and pool transactions on Solscan. We use the Solana blockchain to ensure that the rules of the game are immutable and cannot be tampered with by anyone.'
    },
    {
      question: 'How does the AI verify GitHub or Screen Time?',
      answer: 'Our backend uses official APIs (GitHub OAuth) and OCR (Optical Character Recognition) for screenshots. The "Commitment Agent" parses the data to ensure the activity happened within the 24-hour window.'
    },
    {
      question: 'How do I verify daily?',
      answer: 'For GitHub challenges, verification happens automatically - our agent checks your commits daily. For screen time challenges, you upload a screenshot of your screen time data and our AI verifies it. For crypto challenges (HODL/DCA), verification is fully automatic - we check your wallet on-chain. You must verify every day within the 24-hour window.'
    },
    {
      question: 'My wallet won\'t connect. What should I do?',
      answer: 'If you\'re using an embedded wallet (signed in with Google/Email), make sure you\'re signed in. If you\'re using Phantom or another external wallet, try refreshing the page, disconnecting and reconnecting, or restarting your browser. Make sure you\'re approving the connection request in the wallet popup.'
    },
    {
      question: 'The transaction failed. Did I lose my money?',
      answer: 'No. If a transaction fails on the blockchain, your SOL is not deducted. Failed transactions just mean the action didn\'t complete - your funds remain in your wallet. You may have lost a tiny transaction fee (less than a cent), but your main stake is safe.'
    },
    {
      question: 'I can\'t submit my daily verification. Help!',
      answer: 'Make sure you\'re submitting within the verification window (usually 24 hours). Check that your wallet is connected and you have a small amount of SOL for transaction fees. If the problem persists, contact support immediately - we can help resolve verification issues.'
    }
  ]
};

export default function FAQPage() {
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});

  const toggleItem = (category: string, index: number) => {
    const key = `${category}-${index}`;
    setOpenItems(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white pt-32 px-6 pb-20">
      <div className="max-w-4xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <SectionLabel>FAQ</SectionLabel>
          <h1 className="text-5xl md:text-6xl font-light tracking-tighter mb-6">
            Frequently Asked<br/>
            <span className="text-emerald-500 font-serif italic font-light">Questions</span>
          </h1>
          <p className="text-lg text-gray-400 leading-relaxed max-w-2xl mx-auto">
            Everything you need to know about CommitMint. Can't find what you're looking for? 
            <a href="/contact" className="text-emerald-400 hover:text-emerald-300 ml-1">Contact us</a>.
          </p>
        </div>

        {/* FAQ Categories */}
        <div className="space-y-12">
          {Object.entries(faqCategories).map(([category, items]) => (
            <div key={category} className="space-y-4">
              <h2 className="text-2xl font-light text-emerald-400 mb-6">{category}</h2>
              {items.map((item: FAQItem, index: number) => {
                const key = `${category}-${index}`;
                const isOpen = openItems[key];
                return (
                  <div 
                    key={index}
                    className="border border-white/10 bg-white/[0.01] rounded-xl overflow-hidden"
                  >
                    <button
                      onClick={() => toggleItem(category, index)}
                      className="w-full flex items-center justify-between p-6 text-left hover:bg-white/[0.02] transition-colors"
                    >
                      <h3 className="text-lg font-medium pr-8">{item.question}</h3>
                      {isOpen ? (
                        <ChevronUp className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="px-6 pb-6 pt-2 border-t border-white/5">
                        <p className="text-gray-400 leading-relaxed">{item.answer}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Still Have Questions */}
        <div className="mt-20 p-8 border border-white/10 bg-white/[0.01] rounded-xl text-center">
          <h2 className="text-2xl font-light mb-4">Still Have Questions?</h2>
          <p className="text-gray-400 mb-6">
            Our agent is standing by on <a href="https://x.com/CommitmentAgent" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300">X</a> to help you clear the path to your goals.
          </p>
          <a 
            href="/contact" 
            className="inline-block px-6 py-3 text-xs font-medium tracking-widest uppercase border border-emerald-500 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all"
          >
            Contact Support
          </a>
        </div>
      </div>
    </div>
  );
}

