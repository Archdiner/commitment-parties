import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  color?: 'emerald' | 'orange' | 'blue' | 'gray';
}

export const Badge = ({ children, color = "emerald" }: BadgeProps) => {
  const styles = {
    emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    orange: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    gray: "bg-white/5 text-gray-400 border-white/10"
  };
  
  return (
    <span className={`px-2 py-0.5 rounded-sm border text-[9px] uppercase tracking-wider font-medium ${styles[color] || styles.gray}`}>
      {children}
    </span>
  );
};

