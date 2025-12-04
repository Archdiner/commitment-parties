import React, { useState } from 'react';
import { Info } from 'lucide-react';

interface TooltipProps {
  children: React.ReactNode;
  content: string;
  className?: string;
}

export const Tooltip = ({ children, content, className = '' }: TooltipProps) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div 
      className={`relative inline-block ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-[#0A0A0A] border border-white/20 rounded-lg shadow-xl text-xs text-gray-300 leading-relaxed">
          {content}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-[#0A0A0A] border-r border-b border-white/20 transform rotate-45"></div>
        </div>
      )}
    </div>
  );
};

export const InfoIcon = ({ content, className = '' }: { content: string; className?: string }) => (
  <Tooltip content={content} className={className}>
    <Info className="w-4 h-4 text-gray-500 hover:text-emerald-400 transition-colors cursor-help" />
  </Tooltip>
);

