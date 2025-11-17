/**
 * OrderTimer Component
 * 
 * Displays elapsed time since order was accepted
 * Used in Kitchen Display System
 */

'use client';

import React, { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';

interface OrderTimerProps {
  startTime: Date | string;
  status?: 'normal' | 'warning' | 'urgent';
  showSeconds?: boolean;
  className?: string;
}

/**
 * Calculate elapsed time in minutes
 */
function getElapsedMinutes(startTime: Date): number {
  const now = new Date();
  const diff = now.getTime() - startTime.getTime();
  return Math.floor(diff / 60000); // Convert to minutes
}

/**
 * Format elapsed time for display
 */
function formatElapsedTime(minutes: number, showSeconds: boolean = false): string {
  if (minutes < 1) {
    return showSeconds ? '< 1 min' : '< 1m';
  }
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours > 0) {
    return showSeconds ? `${hours}h ${mins}m` : `${hours}h ${mins}m`;
  }
  
  return showSeconds ? `${mins} min` : `${mins}m`;
}

/**
 * Determine timer status based on elapsed time
 */
function getTimerStatus(minutes: number): 'normal' | 'warning' | 'urgent' {
  if (minutes >= 30) return 'urgent';   // Red - over 30 minutes
  if (minutes >= 15) return 'warning';  // Yellow - 15-30 minutes
  return 'normal';                      // Green - under 15 minutes
}

const STATUS_COLORS = {
  normal: {
    bg: 'bg-success-100 dark:bg-success-900/20',
    text: 'text-success-700 dark:text-success-400',
    icon: '🔥',
  },
  warning: {
    bg: 'bg-warning-100 dark:bg-warning-900/20',
    text: 'text-warning-700 dark:text-warning-400',
    icon: '⏰',
  },
  urgent: {
    bg: 'bg-error-100 dark:bg-error-900/20',
    text: 'text-error-700 dark:text-error-400',
    icon: '🚨',
  },
};

export const OrderTimer: React.FC<OrderTimerProps> = ({
  startTime,
  status: forcedStatus,
  showSeconds = false,
  className = '',
}) => {
  const [elapsedMinutes, setElapsedMinutes] = useState(0);
  const [mounted, setMounted] = useState(false);

  // Update timer every minute (or every second if showSeconds is true)
  useEffect(() => {
    setMounted(true);
    const start = new Date(startTime);
    
    // Initial calculation
    setElapsedMinutes(getElapsedMinutes(start));

    // Update interval (1 minute or 1 second)
    const interval = setInterval(() => {
      setElapsedMinutes(getElapsedMinutes(start));
    }, showSeconds ? 1000 : 60000);

    return () => clearInterval(interval);
  }, [startTime, showSeconds]);

  if (!mounted) {
    return null; // Prevent hydration mismatch
  }

  const actualStatus = forcedStatus || getTimerStatus(elapsedMinutes);
  const statusConfig = STATUS_COLORS[actualStatus];
  const formattedTime = formatElapsedTime(elapsedMinutes, showSeconds);

  return (
    <div
      className={`
        inline-flex items-center gap-2 px-3 py-1.5 rounded-lg
        ${statusConfig.bg} ${statusConfig.text}
        font-mono font-semibold text-sm
        ${className}
      `}
      title={`Started ${formatDistanceToNow(new Date(startTime), { addSuffix: true })}`}
    >
      <span className="text-base">{statusConfig.icon}</span>
      <span>{formattedTime}</span>
    </div>
  );
};
