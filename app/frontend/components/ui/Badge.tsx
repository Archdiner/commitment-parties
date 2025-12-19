import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  color?: 'emerald' | 'teal' | 'cyan' | 'gray';
}

export const Badge = ({ children, color = "emerald" }: BadgeProps) => {
  const styles = {
    emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    teal: "bg-teal-500/10 text-teal-400 border-teal-500/20",
    cyan: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    gray: "bg-white/5 text-gray-400 border-white/10"
  };
  
  return (
    <span className={`px-2 py-0.5 rounded-sm border text-[9px] uppercase tracking-wider font-medium ${styles[color] || styles.gray}`}>
      {children}
    </span>
  );
};

