'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const DISMISSED_KEY = 'dev-banner-dismissed';

export function DevBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if banner has been dismissed
    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (!dismissed) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, 'true');
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="sticky top-16 z-40 w-full bg-emerald-500/90 backdrop-blur-sm border-b border-emerald-400/30">
      <div className="max-w-[1400px] mx-auto px-6 py-3 flex items-center justify-between gap-4">
        <p className="text-sm text-black font-medium flex-1 text-center sm:text-left">
          🚧 Site is still in <span className="font-semibold">dev/testing mode</span>. 
          Apple Pay and mainnet support coming soon!
        </p>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 hover:bg-emerald-600/50 rounded transition-colors"
          aria-label="Dismiss banner"
        >
          <X className="w-4 h-4 text-black" />
        </button>
      </div>
    </div>
  );
}

