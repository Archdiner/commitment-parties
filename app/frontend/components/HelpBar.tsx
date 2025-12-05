'use client';

import React, { useState } from 'react';
import { HelpCircle, X } from 'lucide-react';

export const HelpBar = () => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="fixed top-16 left-0 right-0 z-40 bg-[#0A0A0A]/95 backdrop-blur-sm border-b border-white/10">
      <div className="max-w-[1400px] mx-auto px-6">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between py-3 text-xs text-gray-400 hover:text-white transition-colors"
        >
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4" />
            <span className="uppercase tracking-widest">Questions? Hover over the info icons</span>
          </div>
          <X className="w-4 h-4" />
        </button>
        
        {isOpen && (
          <div className="pb-6 pt-2 border-t border-white/5">
            <div className="grid md:grid-cols-2 gap-6 text-xs text-gray-400">
              <div>
                <h4 className="text-white font-medium mb-2">Getting Started</h4>
                <ul className="space-y-1 text-gray-500">
                  <li>• Install Phantom wallet (free, takes 2 minutes)</li>
                  <li>• Connect wallet in top-right corner</li>
                  <li>• Browse challenges or create your own</li>
                </ul>
              </div>
              <div>
                <h4 className="text-white font-medium mb-2">How It Works</h4>
                <ul className="space-y-1 text-gray-500">
                  <li>• Put money down to commit to a goal</li>
                  <li>• Verify progress daily (automatic or manual)</li>
                  <li>• Complete = win money, Fail = lose stake</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

