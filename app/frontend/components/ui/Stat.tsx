import React from 'react';

export const Stat = ({ label, value, sub }: { label: string; value: string | number | React.ReactNode; sub?: string }) => (
  <div className="flex flex-col">
    <span className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">{label}</span>
    <span className="text-2xl font-light text-white tracking-tight">{value}</span>
    {sub && <span className="text-xs text-gray-600 font-mono mt-1">{sub}</span>}
  </div>
);

