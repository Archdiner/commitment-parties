'use client';

import React, { useState, useEffect } from 'react';
import { Clock, Users, CheckCircle } from 'lucide-react';
import { PoolResponse } from '@/lib/api';

interface RecruitmentStatusProps {
  pool: PoolResponse;
}

/**
 * Component to display recruitment system status
 * Shows: recruitment progress, deadline countdown, filled status, auto-start time
 */
export function RecruitmentStatus({ pool }: RecruitmentStatusProps) {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [timeLabel, setTimeLabel] = useState<string>('');

  useEffect(() => {
    if (pool.status !== 'pending') {
      return; // Only show for recruiting pools
    }

    const updateCountdown = () => {
      const now = Math.floor(Date.now() / 1000);
      
      // If pool is filled, show countdown to auto_start_time
      if (pool.filled_at && pool.auto_start_time) {
        const diff = pool.auto_start_time - now;
        if (diff <= 0) {
          setTimeLeft('Starting soon...');
          setTimeLabel('Challenge starts in');
          return;
        }
        const hours = Math.floor(diff / 3600);
        const minutes = Math.floor((diff % 3600) / 60);
        if (hours > 0) {
          setTimeLeft(`${hours}h ${minutes}m`);
        } else {
          setTimeLeft(`${minutes}m`);
        }
        setTimeLabel('Challenge starts in');
        return;
      }

      // If not filled, show countdown to recruitment_deadline
      if (pool.recruitment_deadline) {
        const diff = pool.recruitment_deadline - now;
        if (diff <= 0) {
          setTimeLeft('Expired');
          setTimeLabel('Recruitment deadline');
          return;
        }
        const days = Math.floor(diff / 86400);
        const hours = Math.floor((diff % 86400) / 3600);
        const minutes = Math.floor((diff % 3600) / 60);
        
        if (days > 0) {
          setTimeLeft(`${days}d ${hours}h`);
        } else if (hours > 0) {
          setTimeLeft(`${hours}h ${minutes}m`);
        } else {
          setTimeLeft(`${minutes}m`);
        }
        setTimeLabel('Recruitment ends in');
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [pool.status, pool.filled_at, pool.auto_start_time, pool.recruitment_deadline]);

  if (pool.status !== 'pending') {
    return null; // Only show for recruiting pools
  }

  const minParticipants = pool.min_participants || 5;
  const participantCount = pool.participant_count || 0;
  const isFilled = pool.filled_at !== null && pool.filled_at !== undefined;
  const progressPercent = Math.min((participantCount / minParticipants) * 100, 100);

  return (
    <div className="mt-6 p-4 border border-emerald-500/30 bg-emerald-500/5 rounded-xl space-y-3">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-emerald-400">
        <Users className="w-3 h-3" />
        <span>Recruitment Status</span>
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-300">
            {participantCount} / {minParticipants} participants
          </span>
          <span className="text-emerald-400 font-mono">
            {Math.floor(progressPercent)}%
          </span>
        </div>
        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="text-[10px] text-gray-400">
          {isFilled
            ? '✓ Minimum participants reached! Challenge will start soon.'
            : `Need ${minParticipants - participantCount} more to start`}
        </p>
      </div>

      {/* Status info */}
      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/10">
        {isFilled && pool.auto_start_time ? (
          <>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <div>
                <div className="text-[10px] text-gray-500">Filled</div>
                <div className="text-xs font-mono text-emerald-300">
                  {new Date(pool.filled_at! * 1000).toLocaleDateString()}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-teal-400" />
              <div>
                <div className="text-[10px] text-gray-500">{timeLabel}</div>
                <div className="text-xs font-mono text-teal-300">{timeLeft}</div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-400" />
              <div>
                <div className="text-[10px] text-gray-500">Recruiting</div>
                <div className="text-xs font-mono text-gray-300">
                  {minParticipants - participantCount} more needed
                </div>
              </div>
            </div>
            {pool.recruitment_deadline && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <div>
                  <div className="text-[10px] text-gray-500">{timeLabel}</div>
                  <div className="text-xs font-mono text-amber-300">{timeLeft}</div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Warning if close to deadline */}
      {!isFilled && pool.recruitment_deadline && (
        (() => {
          const now = Math.floor(Date.now() / 1000);
          const hoursLeft = (pool.recruitment_deadline - now) / 3600;
          if (hoursLeft > 0 && hoursLeft < 24) {
            return (
              <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <p className="text-[10px] text-amber-300">
                  ⚠️ Recruitment ends soon! If minimum participants aren't reached, all stakes will be refunded.
                </p>
              </div>
            );
          }
          return null;
        })()
      )}
    </div>
  );
}
