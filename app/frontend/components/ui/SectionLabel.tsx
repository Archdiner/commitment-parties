import React from 'react';

export const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center gap-2 mb-6">
    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
    <span className="text-[9px] uppercase tracking-[0.25em] text-gray-400 font-medium">
      {children}
    </span>
  </div>
);

