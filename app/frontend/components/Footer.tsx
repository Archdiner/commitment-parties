'use client';

import React from 'react';
import { Github } from 'lucide-react';

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-white/10 bg-[#050505] mt-auto">
      <div className="max-w-[1400px] mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-emerald-500 transform rotate-45" />
              <div className="flex flex-col">
                <span className="font-medium tracking-[0.1em] text-xs text-white">COMMITMINT</span>
                <span className="text-[8px] text-gray-500 tracking-wider">AI ACCOUNTABILITY</span>
              </div>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              Turn your commitments into capital. Stake real money on your goals and let AI verify your progress.
            </p>
          </div>

          {/* About */}
          <div>
            <h3 className="text-xs uppercase tracking-widest text-gray-500 mb-4">About</h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              CommitMint is an AI-powered accountability platform built on Solana. 
              Put money on your goals, verify daily, and earn rewards for following through.
            </p>
          </div>

          {/* Connect */}
          <div>
            <h3 className="text-xs uppercase tracking-widest text-gray-500 mb-4">Connect</h3>
            <div className="flex items-center gap-4">
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
            <p className="text-sm text-gray-500 mt-4">
              Sign up above to get notified when we launch.
            </p>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/5 space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-gray-500">
              &copy; {currentYear} CommitMint. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-xs text-gray-500">
              <span>Built on Solana</span>
              <span>&bull;</span>
              <span>AI-Powered Accountability</span>
            </div>
          </div>
          <div className="text-center pt-4">
            <p className="text-xs text-gray-500">
              Built with love for accountability and positive behavior change
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};
