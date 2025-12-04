'use client';

import React from 'react';
import Link from 'next/link';
import { Github, Twitter } from 'lucide-react';

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-white/10 bg-[#050505] mt-auto">
      <div className="max-w-[1400px] mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-emerald-500 transform rotate-45" />
              <div className="flex flex-col">
                <span className="font-medium tracking-[0.1em] text-xs text-white">COMMITMENT_AGENT</span>
                <span className="text-[8px] text-gray-500 tracking-wider">AI ACCOUNTABILITY</span>
              </div>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              Turn your commitments into capital. Stake SOL on your goals and let AI verify your progress.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-xs uppercase tracking-widest text-gray-500 mb-4">Quick Links</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/" className="text-sm text-gray-400 hover:text-emerald-400 transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/pools" className="text-sm text-gray-400 hover:text-emerald-400 transition-colors">
                  Browse Challenges
                </Link>
              </li>
              <li>
                <Link href="/create" className="text-sm text-gray-400 hover:text-emerald-400 transition-colors">
                  Create Challenge
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="text-sm text-gray-400 hover:text-emerald-400 transition-colors">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/leaderboard" className="text-sm text-gray-400 hover:text-emerald-400 transition-colors">
                  Leaderboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-xs uppercase tracking-widest text-gray-500 mb-4">Resources</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/about" className="text-sm text-gray-400 hover:text-emerald-400 transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-sm text-gray-400 hover:text-emerald-400 transition-colors">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Contact */}
          <div>
            <h3 className="text-xs uppercase tracking-widest text-gray-500 mb-4">Legal</h3>
            <ul className="space-y-3 mb-6">
              <li>
                <Link href="/terms" className="text-sm text-gray-400 hover:text-emerald-400 transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-sm text-gray-400 hover:text-emerald-400 transition-colors">
                  Privacy Policy
                </Link>
              </li>
            </ul>
            <div className="flex items-center gap-4 mt-6">
              <a 
                href="https://x.com/CommitmentAgent" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-emerald-400 transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="w-5 h-5" />
              </a>
              <a 
                href="https://github.com/Archdiner/commitment-parties" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-emerald-400 transition-colors"
                aria-label="GitHub"
              >
                <Github className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/5 space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-gray-500">
              © {currentYear} Commitment Agent. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-xs text-gray-500">
              <span>Built on Solana</span>
              <span>•</span>
              <span>AI-Powered Accountability</span>
            </div>
          </div>
          <div className="text-center pt-4">
            <p className="text-xs text-gray-500">
              Built with ❤️ for accountability and positive behavior change
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

