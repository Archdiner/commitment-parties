import React from 'react';
import { LucideIcon } from 'lucide-react';

interface ButtonPrimaryProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  icon?: LucideIcon;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

export const ButtonPrimary = ({ children, onClick, className = "", icon: Icon, disabled, type = 'button' }: ButtonPrimaryProps) => (
  <button 
    type={type}
    onClick={onClick}
    disabled={disabled}
    className={`group relative overflow-hidden bg-white text-black px-6 py-3 text-xs font-medium tracking-widest uppercase transition-all hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
  >
    <div className="relative z-10 flex items-center justify-center gap-2">
      {children}
      {Icon && <Icon className="w-3 h-3 transition-transform group-hover:translate-x-1" />}
    </div>
  </button>
);

