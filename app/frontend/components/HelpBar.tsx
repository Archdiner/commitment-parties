'use client';

import React, { useState, useEffect, useRef } from 'react';
import { HelpCircle, X } from 'lucide-react';

export const HelpBar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        buttonRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="fixed top-20 right-4 sm:right-6 z-40">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs text-gray-400 hover:text-white transition-colors border border-white/10 hover:border-white/20 rounded-lg bg-white/[0.02] hover:bg-white/[0.05]"
        aria-label="Help"
      >
        <HelpCircle className="w-4 h-4" />
        <span className="hidden sm:inline text-[11px]">Help</span>
      </button>
      
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-30" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown Modal */}
          <div
            ref={dropdownRef}
            className="absolute top-full right-0 mt-2 w-[calc(100vw-2rem)] sm:w-96 bg-[#0A0A0A] border border-white/20 rounded-xl shadow-2xl z-50 overflow-hidden"
          >
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-medium text-sm">Getting Started</h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="space-y-6 text-xs text-gray-400">
                <div>
                  <h4 className="text-white font-medium mb-3">Getting Started</h4>
                  <ul className="space-y-2 text-gray-500">
                    <li>• Install Phantom wallet (free, takes 2 minutes)</li>
                    <li>• Connect wallet in top-right corner</li>
                    <li>• Browse challenges or create your own</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="text-white font-medium mb-3">How It Works</h4>
                  <ul className="space-y-2 text-gray-500">
                    <li>• Put money down to commit to a goal</li>
                    <li>• Verify progress daily (automatic or manual)</li>
                    <li>• Complete = win money, Fail = lose stake</li>
                  </ul>
                </div>

                <div className="pt-4 border-t border-white/5">
                  <p className="text-gray-400 text-xs">
                    <span className="font-medium text-gray-300">Questions?</span> Hover over the info icons for more details.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

