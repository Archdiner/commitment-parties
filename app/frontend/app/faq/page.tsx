'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { SectionLabel } from '@/components/ui/SectionLabel';

interface FAQItem {
  question: string;
  answer: string;
}

const faqCategories = {
  'Getting Started': [
    {
      question: 'What is Commitment Agent?',
      answer: 'Commitment Agent is an AI-powered accountability platform built on Solana. You stake SOL (Solana\'s cryptocurrency) on your goals, and our system automatically verifies your progress. Complete your challenge and win money, or fail and lose your stake.'
    },
    {
      question: 'Do I need to know about cryptocurrency to use this?',
      answer: 'Not at all! While we use Solana blockchain technology, we\'ve designed the platform to be accessible to everyone. You just need to install a free wallet app called Phantom (like a digital bank account) and you\'re ready to go. We provide helpful explanations throughout the app.'
    },
    {
      question: 'How do I get started?',
      answer: 'First, install the Phantom wallet browser extension (it\'s free and takes 2 minutes). Then connect your wallet on our site, browse available challenges or create your own, and put down your stake to join. That\'s it!'
    },
    {
      question: 'What is SOL and how do I get it?',
      answer: 'SOL is Solana\'s digital currency (like dollars, but digital). You can buy SOL on exchanges like Coinbase, Binance, or directly in your Phantom wallet. You\'ll need some SOL to stake on challenges and pay for transaction fees (which are very low, usually less than a cent).'
    },
    {
      question: 'Is Commitment Agent free to use?',
      answer: 'Yes, the platform is free to use. However, you\'ll need SOL to stake on challenges and pay for blockchain transaction fees (typically less than $0.01 per transaction). Creating a challenge also costs a small fee (about 0.05 SOL) to cover the on-chain transaction.'
    }
  ],
  'How It Works': [
    {
      question: 'How does the verification process work?',
      answer: 'Our AI agents automatically verify your progress based on the challenge type. For lifestyle challenges (like gym attendance), you upload photos as proof. For crypto challenges, we check your wallet activity on-chain automatically. For developer challenges, we verify GitHub commits. You need to verify daily - missing a day means you\'re eliminated.'
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
      question: 'How do I win money?',
      answer: 'If you successfully complete your challenge (verify every day for the entire duration), you split the prize pool with all other winners. The prize pool consists of all the staked SOL from participants who failed or were eliminated. More participants who fail = bigger prize pool for winners.'
    },
    {
      question: 'What types of challenges can I create?',
      answer: 'You can create three types of challenges: Lifestyle (photo/GPS verification for habits like gym, screen time, etc.), Crypto (automatic on-chain verification for trading habits), and Developer (GitHub commit verification). Each type has different verification methods.'
    }
  ],
  'Safety & Security': [
    {
      question: 'Is my money safe?',
      answer: 'Yes. Your funds are secured by smart contracts on the Solana blockchain. Once you stake SOL, it\'s locked in the contract until the challenge ends - no one, including us, can access it. The code is open source and auditable.'
    },
    {
      question: 'Can Commitment Agent steal my money?',
      answer: 'No. We cannot access your staked funds. They\'re locked in smart contracts that execute automatically based on the challenge rules. Even if our company disappeared, the smart contracts would continue to function and your funds would be safe.'
    },
    {
      question: 'What if the AI verification makes a mistake?',
      answer: 'Our AI verification system is designed to be fair and accurate. If you believe there\'s been an error, contact our support team immediately. We review disputed verifications on a case-by-case basis. However, the system is generally very reliable.'
    },
    {
      question: 'What happens if the website goes down?',
      answer: 'Since everything runs on the Solana blockchain, the smart contracts continue to function even if our website is temporarily unavailable. Your funds remain safe in the blockchain. You can always interact with the contracts directly if needed.'
    }
  ],
  'Challenges & Pools': [
    {
      question: 'How long do challenges last?',
      answer: 'You can create challenges lasting anywhere from 1 to 30 days. Most challenges are 7, 14, or 30 days. The duration is set when the challenge is created and cannot be changed.'
    },
    {
      question: 'How many people can join a challenge?',
      answer: 'The challenge creator sets the maximum number of participants (between 1 and 100). Once a challenge is full, no one else can join. More participants typically mean a bigger prize pool for winners.'
    },
    {
      question: 'Can I join a challenge after it has started?',
      answer: 'It depends on the challenge status. If a challenge is still in "pending" status (recruitment phase) or just started and is "active", you can usually still join. Once a challenge is well underway, joining may be restricted. Check the challenge details for specific rules.'
    },
    {
      question: 'What happens if not enough people join my challenge?',
      answer: 'If your challenge doesn\'t reach the minimum number of participants (if one is set), it may not start, and participants can get their stake back. Check the specific challenge rules when creating it.'
    },
    {
      question: 'Can I create a private challenge?',
      answer: 'Yes! When creating a challenge, you can set it to "Private" mode, which means only people with the invite link can see and join it. This is great for challenges with friends or specific groups.'
    }
  ],
  'Technical Issues': [
    {
      question: 'My wallet won\'t connect. What should I do?',
      answer: 'First, make sure you have Phantom wallet installed. If it\'s installed, try refreshing the page, disconnecting and reconnecting, or restarting your browser. Make sure you\'re approving the connection request in the Phantom popup window.'
    },
    {
      question: 'The transaction failed. Did I lose my money?',
      answer: 'No. If a transaction fails on the blockchain, your SOL is not deducted. Failed transactions just mean the action didn\'t complete - your funds remain in your wallet. You may have lost a tiny transaction fee (less than a cent), but your main stake is safe.'
    },
    {
      question: 'I can\'t submit my daily verification. Help!',
      answer: 'Make sure you\'re submitting within the verification window (usually 24 hours). Check that your wallet is connected and you have a small amount of SOL for transaction fees. If the problem persists, contact support immediately - we can help resolve verification issues.'
    },
    {
      question: 'What if I lose access to my wallet?',
      answer: 'This is why it\'s crucial to save your wallet\'s seed phrase when you create it. If you lose access to your wallet and don\'t have the seed phrase, you cannot recover it - and any SOL staked in challenges will be lost. Always back up your seed phrase securely.'
    },
    {
      question: 'The website is slow or not loading. What\'s wrong?',
      answer: 'Try refreshing the page or clearing your browser cache. If the issue persists, it might be a temporary server issue. Remember, your funds are safe on the blockchain even if the website has issues. You can check your wallet directly in Phantom to see your balances.'
    }
  ],
  'Money & Stakes': [
    {
      question: 'How much SOL should I stake?',
      answer: 'That\'s entirely up to you! Stake an amount that\'s meaningful enough to motivate you, but not so much that losing it would cause financial hardship. Most people stake between 0.1 and 5 SOL. Remember, you can lose this amount if you fail the challenge.'
    },
    {
      question: 'When do I get my money back?',
      answer: 'If you successfully complete the challenge, you receive your stake back plus your share of the prize pool automatically when the challenge ends. The funds are sent directly to your wallet. If you fail, you lose your stake and it goes to the winners.'
    },
    {
      question: 'Are there any fees?',
      answer: 'There are minimal blockchain transaction fees (usually less than $0.01 per transaction). Creating a challenge costs about 0.05 SOL to cover the on-chain transaction. There are no platform fees or hidden costs - what you see is what you pay.'
    },
    {
      question: 'Can I stake more than the required amount?',
      answer: 'No, each participant stakes the same amount set by the challenge creator. This ensures fairness - everyone has the same financial commitment and potential reward.'
    },
    {
      question: 'What if I don\'t have enough SOL in my wallet?',
      answer: 'You need enough SOL to cover both your stake amount and transaction fees. If you don\'t have enough, you\'ll need to add more SOL to your wallet before you can join a challenge. You can buy SOL directly in Phantom or transfer it from an exchange.'
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
            Everything you need to know about Commitment Agent. Can't find what you're looking for? 
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
            Can't find the answer you're looking for? We're here to help.
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

