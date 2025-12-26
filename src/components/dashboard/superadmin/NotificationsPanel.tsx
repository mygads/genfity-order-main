"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";

interface AdminNotification {
  id: string;
  type: 'NEW_ORDER' | 'ORDER_COMPLETED' | 'NEW_CUSTOMER' | 'NEW_MERCHANT' | 'MERCHANT_SUBSCRIPTION';
  title: string;
  message: string;
  timestamp: string;
  metadata: Record<string, unknown>;
  isRead: boolean;
}

interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  pollInterval?: number; // in milliseconds
}

/**
 * Real-time Notifications Panel for Super Admin
 * Polls the notifications API and displays recent activities
 */
export default function NotificationsPanel({
  isOpen,
  onClose,
  pollInterval = 30000, // Default: 30 seconds
}: NotificationsPanelProps) {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastFetchTime = useRef<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async (since?: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const url = new URL('/api/admin/notifications', window.location.origin);
      if (since) {
        url.searchParams.set('since', since);
      }
      url.searchParams.set('limit', '20');

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }

      const result = await response.json();
      if (result.success) {
        // Merge new notifications with existing ones
        setNotifications(prev => {
          const existingIds = new Set(prev.map(n => n.id));
          const newNotifications = result.data.notifications.filter(
            (n: AdminNotification) => !existingIds.has(n.id)
          );
          
          // If fetching for the first time, just set the data
          if (!since) {
            return result.data.notifications;
          }
          
          // Otherwise, prepend new notifications
          return [...newNotifications, ...prev].slice(0, 50); // Keep max 50
        });
        
        lastFetchTime.current = result.data.serverTime;
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Polling
  useEffect(() => {
    const interval = setInterval(() => {
      if (lastFetchTime.current) {
        fetchNotifications(lastFetchTime.current);
      }
    }, pollInterval);

    return () => clearInterval(interval);
  }, [fetchNotifications, pollInterval]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Get icon and color based on notification type
  const getNotificationStyle = (type: AdminNotification['type']) => {
    switch (type) {
      case 'NEW_ORDER':
        return {
          icon: '🛒',
          bgColor: 'bg-blue-100 dark:bg-blue-900/30',
          textColor: 'text-blue-600 dark:text-blue-400',
        };
      case 'ORDER_COMPLETED':
        return {
          icon: '✅',
          bgColor: 'bg-green-100 dark:bg-green-900/30',
          textColor: 'text-green-600 dark:text-green-400',
        };
      case 'NEW_CUSTOMER':
        return {
          icon: '👤',
          bgColor: 'bg-purple-100 dark:bg-purple-900/30',
          textColor: 'text-purple-600 dark:text-purple-400',
        };
      case 'NEW_MERCHANT':
        return {
          icon: '🏪',
          bgColor: 'bg-orange-100 dark:bg-orange-900/30',
          textColor: 'text-orange-600 dark:text-orange-400',
        };
      case 'MERCHANT_SUBSCRIPTION':
        return {
          icon: '💳',
          bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',
          textColor: 'text-cyan-600 dark:text-cyan-400',
        };
      default:
        return {
          icon: '📢',
          bgColor: 'bg-gray-100 dark:bg-gray-800',
          textColor: 'text-gray-600 dark:text-gray-400',
        };
    }
  };

  // Format relative time
  const formatRelativeTime = (timestamp: string): string => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-full mt-2 w-96 max-h-[500px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          Notifications
        </h3>
        <button
          onClick={onClose}
          className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="overflow-y-auto max-h-[420px]">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-8 text-red-500">
            <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm">{error}</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
            <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <p className="text-sm font-medium">No new notifications</p>
            <p className="text-xs mt-1">Activities will appear here</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {notifications.map((notification) => {
              const style = getNotificationStyle(notification.type);
              return (
                <div
                  key={notification.id}
                  className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                >
                  <div className="flex gap-3">
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full ${style.bgColor} flex items-center justify-center text-xl`}>
                      {style.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-medium ${style.textColor}`}>
                          {notification.title}
                        </p>
                        <span className="flex-shrink-0 text-xs text-gray-400 dark:text-gray-500">
                          {formatRelativeTime(notification.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5 truncate">
                        {notification.message}
                      </p>
                      {(notification.metadata as { totalAmount?: number; currency?: string }).totalAmount && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {(notification.metadata as { currency?: string }).currency} {Number((notification.metadata as { totalAmount?: number }).totalAmount).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <button className="w-full text-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium">
            View All Activity
          </button>
        </div>
      )}
    </div>
  );
}
