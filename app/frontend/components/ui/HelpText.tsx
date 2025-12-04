import React from 'react';
import { Info } from 'lucide-react';

export const HelpText = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`flex items-start gap-2 text-xs text-gray-500 leading-relaxed ${className}`}>
    <Info className="w-3 h-3 mt-0.5 flex-shrink-0 text-gray-600" />
    <span>{children}</span>
  </div>
);

