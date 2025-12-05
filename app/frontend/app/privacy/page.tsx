'use client';

import React from 'react';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { Shield, Lock, Eye, FileText } from 'lucide-react';

export default function PrivacyPolicyPage() {
  const lastUpdated = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="min-h-screen bg-[#050505] text-white pt-32 px-6 pb-20">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <SectionLabel>Privacy Policy</SectionLabel>
          <h1 className="text-5xl md:text-6xl font-light tracking-tighter mb-6">
            Your Privacy<br/>
            <span className="text-emerald-500 font-serif italic font-light">Matters</span>
          </h1>
          <p className="text-lg text-gray-400 leading-relaxed">
            Last updated: {lastUpdated}
          </p>
        </div>

        {/* Introduction */}
        <div className="mb-12 space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-6 h-6 text-emerald-500" />
            <h2 className="text-2xl font-light">Introduction</h2>
          </div>
          <p className="text-gray-400 leading-relaxed">
            CommitMint ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy 
            explains how we collect, use, disclose, and safeguard your information when you use our platform. 
            By using CommitMint, you agree to the collection and use of information in accordance with this policy.
          </p>
          <p className="text-gray-400 leading-relaxed">
            We believe in complete transparency. That's why we tell you exactly what we collect and what we do with it. 
            We are committed to transparency and believe users should know exactly how their data is being used. 
            We don't hide anything—everything is clearly explained in this policy.
          </p>
        </div>

        {/* Information We Collect */}
        <div className="mb-12 space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <FileText className="w-6 h-6 text-emerald-500" />
            <h2 className="text-2xl font-light">Information We Collect</h2>
          </div>
          
          <div className="space-y-4">
            <div className="p-6 border border-white/10 bg-white/[0.01] rounded-xl">
              <h3 className="text-lg font-medium mb-3 text-emerald-400">Wallet Address</h3>
              <p className="text-gray-400 leading-relaxed">
                We collect your Solana wallet address when you connect your wallet to our platform. 
                This is necessary to facilitate transactions and track your participation in challenges.
              </p>
            </div>

            <div className="p-6 border border-white/10 bg-white/[0.01] rounded-xl">
              <h3 className="text-lg font-medium mb-3 text-emerald-400">On-Chain Data</h3>
              <p className="text-gray-400 leading-relaxed">
                All transactions and challenge data are stored on the Solana blockchain, which is public by nature. 
                This includes your wallet address, stake amounts, challenge participation, and verification status.
              </p>
            </div>

            <div className="p-6 border border-white/10 bg-white/[0.01] rounded-xl">
              <h3 className="text-lg font-medium mb-3 text-emerald-400">Verification Data</h3>
              <p className="text-gray-400 leading-relaxed">
                For lifestyle challenges, you may upload photos or other proof of progress. This data is processed 
                by our AI verification system and may be stored temporarily for verification purposes.
              </p>
            </div>
          </div>
        </div>

        {/* How We Use Information */}
        <div className="mb-12 space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <Eye className="w-6 h-6 text-emerald-500" />
            <h2 className="text-2xl font-light">How We Use Your Information</h2>
          </div>
          <ul className="space-y-3 text-gray-400">
            <li className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-2 flex-shrink-0" />
              <span>To facilitate and process transactions on the Solana blockchain</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-2 flex-shrink-0" />
              <span>To verify your progress in challenges using AI-powered systems</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-2 flex-shrink-0" />
              <span>To display your participation and performance on leaderboards</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-2 flex-shrink-0" />
              <span>To communicate with you about your account and challenges</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-2 flex-shrink-0" />
              <span>To detect, prevent, and address technical issues and fraud</span>
            </li>
          </ul>
        </div>

        {/* Blockchain Transparency */}
        <div className="mb-12 space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <Lock className="w-6 h-6 text-emerald-500" />
            <h2 className="text-2xl font-light">Blockchain Transparency</h2>
          </div>
          <p className="text-gray-400 leading-relaxed">
            It's important to understand that the Solana blockchain is public and transparent. All transactions, 
            including your wallet address and the amounts you stake, are visible on the blockchain. This is a 
            fundamental characteristic of blockchain technology and cannot be changed. We cannot hide or anonymize 
            your on-chain activity.
          </p>
        </div>

        {/* Data Sharing */}
        <div className="mb-12 space-y-6">
          <h2 className="text-2xl font-light mb-6">Data Sharing and Disclosure</h2>
          <p className="text-gray-400 leading-relaxed mb-4">
            We do not sell your personal information. We may share your information only in the following circumstances:
          </p>
          <ul className="space-y-3 text-gray-400">
            <li className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-2 flex-shrink-0" />
              <span><strong className="text-white">Public Blockchain:</strong> Your wallet address and transaction data are publicly visible on the Solana blockchain</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-2 flex-shrink-0" />
              <span><strong className="text-white">Service Providers:</strong> We may share data with third-party service providers who assist in operating our platform</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-2 flex-shrink-0" />
              <span><strong className="text-white">Legal Requirements:</strong> We may disclose information if required by law or to protect our rights</span>
            </li>
          </ul>
        </div>

        {/* Data Security */}
        <div className="mb-12 space-y-6">
          <h2 className="text-2xl font-light mb-6">Data Security</h2>
          <p className="text-gray-400 leading-relaxed">
            We implement appropriate technical and organizational measures to protect your information. However, 
            no method of transmission over the internet or electronic storage is 100% secure. Your funds are secured 
            by Solana smart contracts, but you are responsible for keeping your wallet private keys secure.
          </p>
          <div className="p-6 border border-amber-500/30 bg-amber-500/5 rounded-xl mt-4">
            <p className="text-sm text-amber-300 leading-relaxed">
              <strong className="text-amber-400">Important:</strong> Never share your wallet seed phrase or private keys with anyone. 
              CommitMint will never ask for your private keys or seed phrase.
            </p>
          </div>
        </div>

        {/* Your Rights */}
        <div className="mb-12 space-y-6">
          <h2 className="text-2xl font-light mb-6">Your Rights</h2>
          <p className="text-gray-400 leading-relaxed mb-4">
            Depending on your jurisdiction, you may have certain rights regarding your personal information:
          </p>
          <ul className="space-y-3 text-gray-400">
            <li className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-2 flex-shrink-0" />
              <span><strong className="text-white">Access:</strong> Request access to your personal information</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-2 flex-shrink-0" />
              <span><strong className="text-white">Correction:</strong> Request correction of inaccurate information</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-2 flex-shrink-0" />
              <span><strong className="text-white">Deletion:</strong> Request deletion of your information (subject to blockchain immutability)</span>
            </li>
          </ul>
          <p className="text-gray-400 leading-relaxed mt-4">
            Note: Due to the immutable nature of blockchain technology, on-chain data cannot be deleted or modified.
          </p>
        </div>

        {/* Changes to Policy */}
        <div className="mb-12 space-y-6">
          <h2 className="text-2xl font-light mb-6">Changes to This Privacy Policy</h2>
          <p className="text-gray-400 leading-relaxed">
            We may update this Privacy Policy from time to time. We will notify you of any changes by posting 
            the new Privacy Policy on this page and updating the "Last updated" date. You are advised to review 
            this Privacy Policy periodically for any changes.
          </p>
        </div>

        {/* Contact */}
        <div className="p-8 border border-white/10 bg-white/[0.01] rounded-xl">
          <h2 className="text-2xl font-light mb-4">Contact Us</h2>
          <p className="text-gray-400 leading-relaxed mb-4">
            If you have any questions about this Privacy Policy, please contact us:
          </p>
          <ul className="space-y-2 text-gray-400">
            <li>Email: <a href="mailto:Accountability-Agent@googlegroups.com" className="text-emerald-400 hover:text-emerald-300">Accountability-Agent@googlegroups.com</a></li>
            <li>Website: <a href="/contact" className="text-emerald-400 hover:text-emerald-300">Contact Page</a></li>
          </ul>
        </div>
      </div>
    </div>
  );
}

