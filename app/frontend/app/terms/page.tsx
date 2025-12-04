'use client';

import React from 'react';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { Scale, AlertTriangle, FileCheck, Gavel } from 'lucide-react';

export default function TermsOfServicePage() {
  const lastUpdated = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="min-h-screen bg-[#050505] text-white pt-32 px-6 pb-20">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <SectionLabel>Terms of Service</SectionLabel>
          <h1 className="text-5xl md:text-6xl font-light tracking-tighter mb-6">
            Terms &<br/>
            <span className="text-emerald-500 font-serif italic font-light">Conditions</span>
          </h1>
          <p className="text-lg text-gray-400 leading-relaxed">
            Last updated: {lastUpdated}
          </p>
        </div>

        {/* Introduction */}
        <div className="mb-12 space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <FileCheck className="w-6 h-6 text-emerald-500" />
            <h2 className="text-2xl font-light">Agreement to Terms</h2>
          </div>
          <p className="text-gray-400 leading-relaxed">
            By accessing or using Commitment Agent ("the Platform"), you agree to be bound by these Terms of Service 
            and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited 
            from using or accessing this platform.
          </p>
        </div>

        {/* Eligibility */}
        <div className="mb-12 space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <Scale className="w-6 h-6 text-emerald-500" />
            <h2 className="text-2xl font-light">Eligibility</h2>
          </div>
          <div className="space-y-4">
            <p className="text-gray-400 leading-relaxed">
              You must be at least 18 years old to use Commitment Agent. By using the Platform, you represent and warrant that:
            </p>
            <ul className="space-y-3 text-gray-400">
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-2 flex-shrink-0" />
                <span>You are at least 18 years of age</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-2 flex-shrink-0" />
                <span>You have the legal capacity to enter into binding agreements</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-2 flex-shrink-0" />
                <span>You are not located in a jurisdiction where cryptocurrency transactions are prohibited</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-2 flex-shrink-0" />
                <span>You will comply with all applicable laws and regulations</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Platform Description */}
        <div className="mb-12 space-y-6">
          <h2 className="text-2xl font-light mb-6">Platform Description</h2>
          <p className="text-gray-400 leading-relaxed">
            Commitment Agent is an AI-powered accountability platform built on the Solana blockchain. Users can 
            create or join challenges, stake SOL (Solana's cryptocurrency), and have their progress automatically 
            verified. Successful participants split the prize pool; unsuccessful participants forfeit their stake.
          </p>
        </div>

        {/* User Responsibilities */}
        <div className="mb-12 space-y-6">
          <h2 className="text-2xl font-light mb-6">User Responsibilities</h2>
          <div className="space-y-4">
            <div className="p-6 border border-white/10 bg-white/[0.01] rounded-xl">
              <h3 className="text-lg font-medium mb-3 text-emerald-400">Wallet Security</h3>
              <p className="text-gray-400 leading-relaxed">
                You are solely responsible for maintaining the security of your wallet and private keys. 
                Commitment Agent cannot recover lost wallets or stolen funds. Never share your seed phrase or 
                private keys with anyone.
              </p>
            </div>
            <div className="p-6 border border-white/10 bg-white/[0.01] rounded-xl">
              <h3 className="text-lg font-medium mb-3 text-emerald-400">Accurate Information</h3>
              <p className="text-gray-400 leading-relaxed">
                You agree to provide accurate and truthful information when creating challenges or submitting 
                verification proofs. Providing false information may result in disqualification and loss of stake.
              </p>
            </div>
            <div className="p-6 border border-white/10 bg-white/[0.01] rounded-xl">
              <h3 className="text-lg font-medium mb-3 text-emerald-400">Compliance with Challenge Rules</h3>
              <p className="text-gray-400 leading-relaxed">
                You agree to comply with all challenge rules and requirements. Failure to meet daily verification 
                requirements will result in automatic elimination and forfeiture of your stake.
              </p>
            </div>
          </div>
        </div>

        {/* Financial Terms */}
        <div className="mb-12 space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <Gavel className="w-6 h-6 text-emerald-500" />
            <h2 className="text-2xl font-light">Financial Terms</h2>
          </div>
          <div className="space-y-4">
            <div className="p-6 border border-amber-500/30 bg-amber-500/5 rounded-xl">
              <h3 className="text-lg font-medium mb-3 text-amber-400">Staking and Forfeiture</h3>
              <p className="text-gray-400 leading-relaxed">
                When you join a challenge, your staked SOL is locked in a smart contract until the challenge ends. 
                If you fail to complete the challenge (e.g., miss daily verifications), you forfeit your stake. 
                This is an inherent risk of using the platform.
              </p>
            </div>
            <div className="p-6 border border-white/10 bg-white/[0.01] rounded-xl">
              <h3 className="text-lg font-medium mb-3 text-emerald-400">Transaction Fees</h3>
              <p className="text-gray-400 leading-relaxed">
                All blockchain transactions incur fees (typically less than $0.01 per transaction on Solana). 
                Creating a challenge costs approximately 0.001-0.002 SOL. These fees are separate from your stake 
                and are non-refundable.
              </p>
            </div>
            <div className="p-6 border border-white/10 bg-white/[0.01] rounded-xl">
              <h3 className="text-lg font-medium mb-3 text-emerald-400">No Refunds</h3>
              <p className="text-gray-400 leading-relaxed">
                Once you stake SOL on a challenge, it cannot be withdrawn until the challenge ends. There are no 
                refunds for failed challenges, missed verifications, or technical issues on your end.
              </p>
            </div>
            <div className="p-6 border border-white/10 bg-white/[0.01] rounded-xl">
              <h3 className="text-lg font-medium mb-3 text-emerald-400">Tax Obligations</h3>
              <p className="text-gray-400 leading-relaxed">
                You are solely responsible for any tax obligations arising from your use of Commitment Agent. 
                We do not provide tax advice. Consult a tax professional regarding cryptocurrency transactions.
              </p>
            </div>
          </div>
        </div>

        {/* Risks and Disclaimers */}
        <div className="mb-12 space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
            <h2 className="text-2xl font-light">Risks and Disclaimers</h2>
          </div>
          <div className="space-y-4">
            <div className="p-6 border border-red-500/30 bg-red-500/5 rounded-xl">
              <h3 className="text-lg font-medium mb-3 text-red-400">Financial Risk</h3>
              <p className="text-gray-400 leading-relaxed">
                You may lose your entire stake if you fail to complete a challenge. Only stake amounts you can 
                afford to lose. Cryptocurrency values are volatile and may fluctuate significantly.
              </p>
            </div>
            <div className="p-6 border border-white/10 bg-white/[0.01] rounded-xl">
              <h3 className="text-lg font-medium mb-3 text-emerald-400">Smart Contract Risk</h3>
              <p className="text-gray-400 leading-relaxed">
                While we strive for security, smart contracts may contain bugs or vulnerabilities. You use the 
                platform at your own risk. We are not liable for losses due to smart contract failures.
              </p>
            </div>
            <div className="p-6 border border-white/10 bg-white/[0.01] rounded-xl">
              <h3 className="text-lg font-medium mb-3 text-emerald-400">AI Verification</h3>
              <p className="text-gray-400 leading-relaxed">
                Our AI verification system may make errors. While we review disputed verifications, the system's 
                decisions are generally final. We are not liable for false positives or negatives in verification.
              </p>
            </div>
            <div className="p-6 border border-white/10 bg-white/[0.01] rounded-xl">
              <h3 className="text-lg font-medium mb-3 text-emerald-400">Platform Availability</h3>
              <p className="text-gray-400 leading-relaxed">
                We do not guarantee uninterrupted access to the platform. The platform may be unavailable due to 
                maintenance, technical issues, or other reasons. Your funds remain secure on the blockchain even 
                if the website is down.
              </p>
            </div>
          </div>
        </div>

        {/* Prohibited Activities */}
        <div className="mb-12 space-y-6">
          <h2 className="text-2xl font-light mb-6">Prohibited Activities</h2>
          <p className="text-gray-400 leading-relaxed mb-4">You agree not to:</p>
          <ul className="space-y-3 text-gray-400">
            <li className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-2 flex-shrink-0" />
              <span>Use the platform for illegal activities or in violation of any laws</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-2 flex-shrink-0" />
              <span>Attempt to manipulate, hack, or exploit the platform or smart contracts</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-2 flex-shrink-0" />
              <span>Submit false or fraudulent verification proofs</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-2 flex-shrink-0" />
              <span>Interfere with or disrupt the platform's operation</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-2 flex-shrink-0" />
              <span>Create challenges that violate laws or promote illegal activities</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-2 flex-shrink-0" />
              <span>Use the platform if you are located in a jurisdiction where it is prohibited</span>
            </li>
          </ul>
        </div>

        {/* Limitation of Liability */}
        <div className="mb-12 space-y-6">
          <h2 className="text-2xl font-light mb-6">Limitation of Liability</h2>
          <div className="p-6 border border-amber-500/30 bg-amber-500/5 rounded-xl">
            <p className="text-gray-400 leading-relaxed">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, COMMITMENT AGENT AND ITS AFFILIATES SHALL NOT BE LIABLE 
              FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS 
              OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER 
              INTANGIBLE LOSSES RESULTING FROM YOUR USE OF THE PLATFORM.
            </p>
            <p className="text-gray-400 leading-relaxed mt-4">
              We are not responsible for losses due to: smart contract bugs, wallet security breaches, 
              blockchain network issues, AI verification errors, or user error.
            </p>
          </div>
        </div>

        {/* Intellectual Property */}
        <div className="mb-12 space-y-6">
          <h2 className="text-2xl font-light mb-6">Intellectual Property</h2>
          <p className="text-gray-400 leading-relaxed">
            The Platform and its original content, features, and functionality are owned by Commitment Agent and 
            are protected by international copyright, trademark, and other intellectual property laws. The smart 
            contract code is open source and available on GitHub.
          </p>
        </div>

        {/* Termination */}
        <div className="mb-12 space-y-6">
          <h2 className="text-2xl font-light mb-6">Termination</h2>
          <p className="text-gray-400 leading-relaxed">
            We reserve the right to terminate or suspend your access to the Platform at any time, with or without 
            cause or notice, for any reason, including violation of these Terms. Termination does not affect your 
            obligations under active challenges or your ability to claim rewards from completed challenges.
          </p>
        </div>

        {/* Governing Law */}
        <div className="mb-12 space-y-6">
          <h2 className="text-2xl font-light mb-6">Governing Law</h2>
          <div className="p-6 border border-white/10 bg-white/[0.01] rounded-xl">
            <p className="text-sm text-gray-400 leading-relaxed">
              <strong className="text-white">PLACEHOLDER:</strong> Specify the governing law and jurisdiction for 
              disputes (e.g., "These Terms shall be governed by the laws of [Jurisdiction] without regard to its 
              conflict of law provisions. Any disputes shall be resolved in the courts of [Jurisdiction].")
            </p>
          </div>
        </div>

        {/* Changes to Terms */}
        <div className="mb-12 space-y-6">
          <h2 className="text-2xl font-light mb-6">Changes to Terms</h2>
          <p className="text-gray-400 leading-relaxed">
            We reserve the right to modify these Terms at any time. We will notify users of material changes by 
            posting the updated Terms on this page and updating the "Last updated" date. Your continued use of 
            the Platform after changes constitutes acceptance of the new Terms.
          </p>
        </div>

        {/* Contact */}
        <div className="p-8 border border-white/10 bg-white/[0.01] rounded-xl">
          <h2 className="text-2xl font-light mb-4">Contact Us</h2>
          <p className="text-gray-400 leading-relaxed mb-4">
            If you have any questions about these Terms of Service, please contact us:
          </p>
          <ul className="space-y-2 text-gray-400">
            <li>Email: <a href="mailto:support@commitmentagent.com" className="text-emerald-400 hover:text-emerald-300">support@commitmentagent.com</a></li>
            <li>Website: <a href="/contact" className="text-emerald-400 hover:text-emerald-300">Contact Page</a></li>
          </ul>
        </div>
      </div>
    </div>
  );
}

