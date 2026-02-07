'use client';

import React from 'react';
import Link from 'next/link';

export const Navbar = () => {
  return (
    <nav className="fixed top-0 w-full z-50 bg-[#050505]/90 backdrop-blur-md border-b border-white/5">
      <div className="flex justify-between items-center px-6 h-16 max-w-[1400px] mx-auto">
        <Link href="/" className="cursor-pointer flex items-center gap-3 group">
          <div className="w-3 h-3 bg-emerald-500 transform rotate-45 group-hover:rotate-90 transition-transform duration-500" />
          <div className="flex flex-col">
            <span className="font-medium tracking-[0.1em] text-base text-white">COMMITMINT</span>
            <span className="text-xs text-gray-500 tracking-wider">AI ACCOUNTABILITY</span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-emerald-500/30 rounded-full bg-emerald-500/5">
            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-[10px] uppercase tracking-widest text-emerald-400 font-medium">Coming Soon</span>
          </div>
        </div>
      </div>
    </nav>
  );
};
