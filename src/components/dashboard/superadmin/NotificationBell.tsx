"use client";

import React, { useState, useEffect, useCallback } from "react";
import NotificationsPanel from "./NotificationsPanel";

interface NotificationCounts {
  newOrders: number;
  newCustomers: number;
  newMerchants: number;
}

interface NotificationBellProps {
  className?: string;
}

/**
 * Notification Bell Button
 * Shows unread notification count and opens panel on click
 */
export default function NotificationBell({ className = "" }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [counts, setCounts] = useState<NotificationCounts>({ newOrders: 0, newCustomers: 0, newMerchants: 0 });
  const [hasNewNotifications, setHasNewNotifications] = useState(false);

  const fetchCounts = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      // Fetch notifications from last hour
      const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const url = new URL('/api/admin/notifications', window.location.origin);
      url.searchParams.set('since', since);
      url.searchParams.set('limit', '10');

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data.counts) {
          const newCounts = result.data.counts;
          setCounts(newCounts);
          setHasNewNotifications(
            newCounts.newOrders > 0 || 
            newCounts.newCustomers > 0 || 
            newCounts.newMerchants > 0
          );
        }
      }
    } catch (err) {
      console.error('Error fetching notification counts:', err);
    }
  }, []);

  // Initial fetch and polling
  useEffect(() => {
    fetchCounts();
    const interval = setInterval(fetchCounts, 60000); // Poll every minute
    return () => clearInterval(interval);
  }, [fetchCounts]);

  const totalCount = counts.newOrders + counts.newCustomers + counts.newMerchants;

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-lg transition-colors ${
          isOpen 
            ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400' 
            : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
        }`}
        aria-label="Notifications"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        
        {/* Badge */}
        {hasNewNotifications && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-bold text-white bg-red-500 rounded-full">
            {totalCount > 99 ? '99+' : totalCount}
          </span>
        )}
        
        {/* Pulse animation for new notifications */}
        {hasNewNotifications && (
          <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full animate-ping opacity-75" />
        )}
      </button>

      <NotificationsPanel
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        pollInterval={30000}
      />
    </div>
  );
}
