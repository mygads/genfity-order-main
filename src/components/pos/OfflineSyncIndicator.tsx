/**
 * Offline Sync Indicator
 * 
 * Visual indicator showing sync status in POS header.
 * Features:
 * - Color-coded status: green (online), yellow (pending), red (offline/error)
 * - Click to expand and show pending orders
 * - Manual sync trigger button
 */

'use client';

import React, { useState } from 'react';
import {
    FaWifi,
    FaSync,
    FaExclamationTriangle,
    FaCheck,
    FaClock,
    FaTimes,
    FaChevronDown
} from 'react-icons/fa';

interface OfflineSyncIndicatorProps {
    isOnline: boolean;
    isSyncing: boolean;
    pendingCount: number;
    syncError: string | null;
    lastSyncTime: Date | null;
    onSync: () => void;
    onClearError?: () => void;
}

export const OfflineSyncIndicator: React.FC<OfflineSyncIndicatorProps> = ({
    isOnline,
    isSyncing,
    pendingCount,
    syncError,
    lastSyncTime,
    onSync,
    onClearError,
}) => {
    const [isExpanded, setIsExpanded] = useState(false);

    // Determine status
    const getStatus = () => {
        if (!isOnline) return 'offline';
        if (syncError) return 'error';
        if (isSyncing) return 'syncing';
        if (pendingCount > 0) return 'pending';
        return 'online';
    };

    const status = getStatus();

    // Status configurations
    const statusConfig = {
        online: {
            icon: <FaWifi className="w-3.5 h-3.5" />,
            bg: 'bg-success-100 dark:bg-success-900/30',
            text: 'text-success-600 dark:text-success-400',
            label: 'Online',
        },
        offline: {
            icon: <FaWifi className="w-3.5 h-3.5 opacity-50" />,
            bg: 'bg-gray-100 dark:bg-gray-800',
            text: 'text-gray-500 dark:text-gray-400',
            label: 'Offline',
        },
        pending: {
            icon: <FaClock className="w-3.5 h-3.5" />,
            bg: 'bg-warning-100 dark:bg-warning-900/30',
            text: 'text-warning-600 dark:text-warning-400',
            label: `${pendingCount} pending`,
        },
        syncing: {
            icon: <FaSync className="w-3.5 h-3.5 animate-spin" />,
            bg: 'bg-brand-100 dark:bg-brand-900/30',
            text: 'text-brand-600 dark:text-brand-400',
            label: 'Syncing...',
        },
        error: {
            icon: <FaExclamationTriangle className="w-3.5 h-3.5" />,
            bg: 'bg-error-100 dark:bg-error-900/30',
            text: 'text-error-600 dark:text-error-400',
            label: 'Sync Error',
        },
    };

    const config = statusConfig[status];

    // Format last sync time
    const formatLastSync = () => {
        if (!lastSyncTime) return 'Never';
        const now = new Date();
        const diffMs = now.getTime() - lastSyncTime.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        return lastSyncTime.toLocaleTimeString();
    };

    return (
        <div className="relative">
            {/* Main Indicator Button */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={`
          flex items-center gap-2 h-9 px-3 rounded-lg ${config.bg} ${config.text}
          transition-all hover:opacity-90
        `}
            >
                {config.icon}
                <span className="text-xs font-medium hidden sm:inline">{config.label}</span>
                {pendingCount > 0 && status !== 'pending' && (
                    <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-warning-500 text-white text-xs font-bold">
                        {pendingCount}
                    </span>
                )}
                <FaChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>

            {/* Expanded Panel */}
            {isExpanded && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsExpanded(false)}
                    />

                    {/* Panel */}
                    <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
                        {/* Header */}
                        <div className="p-4 border-b border-gray-100 dark:border-gray-800">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                    Sync Status
                                </span>
                                <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded ${config.bg} ${config.text} text-xs font-medium`}>
                                    {config.icon}
                                    {config.label}
                                </span>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-4 space-y-3">
                            {/* Connection Status */}
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500 dark:text-gray-400">Connection</span>
                                <span className={isOnline ? 'text-success-600 dark:text-success-400' : 'text-gray-400'}>
                                    {isOnline ? 'Connected' : 'Disconnected'}
                                </span>
                            </div>

                            {/* Pending Orders */}
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500 dark:text-gray-400">Pending Orders</span>
                                <span className={pendingCount > 0 ? 'text-warning-600 dark:text-warning-400 font-medium' : 'text-gray-400'}>
                                    {pendingCount}
                                </span>
                            </div>

                            {/* Last Sync */}
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500 dark:text-gray-400">Last Sync</span>
                                <span className="text-gray-700 dark:text-gray-300">{formatLastSync()}</span>
                            </div>

                            {/* Error Message */}
                            {syncError && (
                                <div className="p-3 bg-error-50 dark:bg-error-900/20 rounded-lg">
                                    <div className="flex items-start gap-2">
                                        <FaExclamationTriangle className="w-4 h-4 text-error-500 mt-0.5 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs text-error-700 dark:text-error-300">{syncError}</p>
                                        </div>
                                        {onClearError && (
                                            <button
                                                onClick={onClearError}
                                                className="text-error-400 hover:text-error-600"
                                            >
                                                <FaTimes className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="p-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800">
                            <button
                                onClick={() => {
                                    onSync();
                                    setIsExpanded(false);
                                }}
                                disabled={isSyncing || !isOnline || pendingCount === 0}
                                className={`
                  w-full flex items-center justify-center gap-2 h-10 rounded-lg
                  text-sm font-medium transition-colors
                  ${isSyncing || !isOnline || pendingCount === 0
                                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                                        : 'bg-brand-500 hover:bg-brand-600 text-white'
                                    }
                `}
                            >
                                {isSyncing ? (
                                    <>
                                        <FaSync className="w-4 h-4 animate-spin" />
                                        Syncing...
                                    </>
                                ) : (
                                    <>
                                        <FaCheck className="w-4 h-4" />
                                        Sync Now
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default OfflineSyncIndicator;
