'use client';

import React, { useState } from 'react';
import { Badge } from '@/components/ui/Badge';

const LEADERBOARD = [
  { rank: 1, user: "sol...88x", earned: 142.5, winRate: "100%", type: "CRYPTO" },
  { rank: 2, user: "deg...jn2", earned: 98.2, winRate: "92%", type: "LIFESTYLE" },
  { rank: 3, user: "bui...qq9", earned: 87.0, winRate: "95%", type: "CRYPTO" },
  { rank: 4, user: "you...me1", earned: 42.0, winRate: "88%", type: "LIFESTYLE" },
  { rank: 5, user: "ano...77k", earned: 31.5, winRate: "60%", type: "CRYPTO" },
  { rank: 6, user: "gym...bro", earned: 28.0, winRate: "75%", type: "LIFESTYLE" },
];

export default function Leaderboard() {
   const [filter, setFilter] = useState('ALL');

   const filteredData = LEADERBOARD.filter(row => filter === 'ALL' || row.type === filter);

   return (
      <div className="min-h-screen bg-[#050505] text-white pt-24 px-6 pb-20">
         <div className="max-w-4xl mx-auto">
            <div className="mb-12 text-center">
               <h1 className="text-4xl font-light mb-4">Leaderboard</h1>
               <p className="text-gray-500 font-mono text-xs mb-8">TOP PERFORMERS BY EARNINGS</p>
               
               {/* Filter Tabs */}
               <div className="inline-flex border border-white/10 p-1">
                  {['ALL', 'CRYPTO', 'LIFESTYLE'].map((type) => (
                     <button
                        key={type}
                        onClick={() => setFilter(type)}
                        className={`px-6 py-2 text-[10px] uppercase tracking-widest transition-all ${filter === type ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}
                     >
                        {type}
                     </button>
                  ))}
               </div>
            </div>

            <div className="border border-white/10">
               {/* Header */}
               <div className="grid grid-cols-4 p-4 border-b border-white/10 bg-white/[0.02] text-[10px] uppercase tracking-widest text-gray-500">
                  <div>Rank</div>
                  <div>User</div>
                  <div className="text-right">Type</div>
                  <div className="text-right">Total Earned</div>
               </div>
               {/* Rows */}
               {filteredData.map((row) => (
                  <div key={row.rank} className="grid grid-cols-4 p-4 border-b border-white/5 hover:bg-white/[0.02] transition-colors items-center">
                     <div className="font-mono text-lg text-gray-600">#{row.rank}</div>
                     <div className="font-mono text-sm text-white">{row.user}</div>
                     <div className="text-right">
                        <Badge color={row.type === 'CRYPTO' ? 'blue' : 'orange'}>{row.type}</Badge>
                     </div>
                     <div className="text-right font-mono text-lg text-emerald-500">{row.earned} SOL</div>
                  </div>
               ))}
               {filteredData.length === 0 && (
                  <div className="p-8 text-center text-gray-500 text-xs uppercase tracking-widest">No rankings found</div>
               )}
            </div>
         </div>
      </div>
   );
}
