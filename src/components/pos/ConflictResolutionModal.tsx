/**
 * Conflict Resolution Modal
 * 
 * Displays conflicts detected during offline order sync and allows user to choose resolution.
 * Features:
 * - Show conflicting item details
 * - Resolution options: Keep mine, Use server, Merge
 * - Batch resolution for multiple conflicts
 */

'use client';

import React, { useState } from 'react';
import {
    FaTimes,
    FaExclamationTriangle,
    FaCheck,
    FaUndo,
    FaCompressArrowsAlt
} from 'react-icons/fa';

// Conflict types
export interface StockConflict {
    menuId: string;
    menuName: string;
    localQty: number;       // What the offline order expected
    serverQty: number;      // Current server value
    expectedQty: number;    // What we expected after our change
    resolution?: 'keep_local' | 'use_server' | 'merge';
}

export interface OrderConflict {
    orderId: string;
    orderNumber: string;
    conflicts: StockConflict[];
    createdAt: string;
}

interface ConflictResolutionModalProps {
    isOpen: boolean;
    onClose: () => void;
    conflicts: OrderConflict[];
    onResolve: (resolutions: Array<{
        orderId: string;
        conflicts: Array<{
            menuId: string;
            resolution: 'keep_local' | 'use_server' | 'merge';
        }>;
    }>) => void;
}

export const ConflictResolutionModal: React.FC<ConflictResolutionModalProps> = ({
    isOpen,
    onClose,
    conflicts,
    onResolve,
}) => {
    // Track resolutions for each conflict
    const [resolutions, setResolutions] = useState<Map<string, 'keep_local' | 'use_server' | 'merge'>>(new Map());

    // Set resolution for a specific conflict
    const setConflictResolution = (menuId: string, resolution: 'keep_local' | 'use_server' | 'merge') => {
        setResolutions(prev => {
            const next = new Map(prev);
            next.set(menuId, resolution);
            return next;
        });
    };

    // Apply same resolution to all
    const applyToAll = (resolution: 'keep_local' | 'use_server' | 'merge') => {
        const allResolutions = new Map<string, 'keep_local' | 'use_server' | 'merge'>();
        conflicts.forEach(order => {
            order.conflicts.forEach(conflict => {
                allResolutions.set(conflict.menuId, resolution);
            });
        });
        setResolutions(allResolutions);
    };

    // Check if all conflicts are resolved
    const totalConflicts = conflicts.reduce((sum, o) => sum + o.conflicts.length, 0);
    const resolvedCount = resolutions.size;
    const allResolved = resolvedCount === totalConflicts;

    // Handle submit
    const handleSubmit = () => {
        const result = conflicts.map(order => ({
            orderId: order.orderId,
            conflicts: order.conflicts.map(c => ({
                menuId: c.menuId,
                resolution: resolutions.get(c.menuId) || 'use_server',
            })),
        }));
        onResolve(result);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

            {/* Modal */}
            <div className="relative w-full max-w-2xl mx-4 max-h-[85vh] bg-white dark:bg-gray-900 rounded-xl shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-warning-50 dark:bg-warning-900/20">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-warning-100 dark:bg-warning-900/30 flex items-center justify-center">
                            <FaExclamationTriangle className="w-5 h-5 text-warning-600 dark:text-warning-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Sync Conflicts Detected
                            </h2>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                                {totalConflicts} item{totalConflicts !== 1 ? 's' : ''} need resolution • {resolvedCount} resolved
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-colors"
                    >
                        <FaTimes className="w-4 h-4" />
                    </button>
                </div>

                {/* Quick Actions */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Apply to all conflicts:</p>
                    <div className="flex gap-2 flex-wrap">
                        <button
                            onClick={() => applyToAll('keep_local')}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 hover:bg-brand-200 dark:hover:bg-brand-900/50 transition-colors"
                        >
                            <FaCheck className="w-3 h-3" />
                            Keep My Changes
                        </button>
                        <button
                            onClick={() => applyToAll('use_server')}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                            <FaUndo className="w-3 h-3" />
                            Use Server Values
                        </button>
                        <button
                            onClick={() => applyToAll('merge')}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-300 hover:bg-success-200 dark:hover:bg-success-900/50 transition-colors"
                        >
                            <FaCompressArrowsAlt className="w-3 h-3" />
                            Merge (Combine)
                        </button>
                    </div>
                </div>

                {/* Conflicts List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {conflicts.map(order => (
                        <div key={order.orderId} className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                            <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                    Order #{order.orderNumber}
                                </span>
                            </div>

                            <div className="divide-y divide-gray-100 dark:divide-gray-800">
                                {order.conflicts.map(conflict => {
                                    const currentResolution = resolutions.get(conflict.menuId);

                                    return (
                                        <div key={conflict.menuId} className="p-4">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-gray-900 dark:text-white truncate">
                                                        {conflict.menuName}
                                                    </p>
                                                    <div className="mt-1 flex items-center gap-4 text-xs">
                                                        <span className="text-gray-500 dark:text-gray-400">
                                                            Local: <span className="font-medium text-gray-700 dark:text-gray-300">{conflict.localQty}</span>
                                                        </span>
                                                        <span className="text-gray-500 dark:text-gray-400">
                                                            Server: <span className="font-medium text-gray-700 dark:text-gray-300">{conflict.serverQty}</span>
                                                        </span>
                                                        <span className="text-warning-600 dark:text-warning-400">
                                                            Difference: <span className="font-medium">{Math.abs(conflict.serverQty - conflict.localQty)}</span>
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Resolution Buttons */}
                                                <div className="flex gap-1.5">
                                                    <button
                                                        onClick={() => setConflictResolution(conflict.menuId, 'keep_local')}
                                                        className={`p-2 rounded-lg transition-colors ${currentResolution === 'keep_local'
                                                                ? 'bg-brand-500 text-white'
                                                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                                            }`}
                                                        title="Keep my changes"
                                                    >
                                                        <FaCheck className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => setConflictResolution(conflict.menuId, 'use_server')}
                                                        className={`p-2 rounded-lg transition-colors ${currentResolution === 'use_server'
                                                                ? 'bg-gray-700 text-white'
                                                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                                            }`}
                                                        title="Use server value"
                                                    >
                                                        <FaUndo className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => setConflictResolution(conflict.menuId, 'merge')}
                                                        className={`p-2 rounded-lg transition-colors ${currentResolution === 'merge'
                                                                ? 'bg-success-500 text-white'
                                                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                                            }`}
                                                        title="Merge values"
                                                    >
                                                        <FaCompressArrowsAlt className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!allResolved}
                        className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${allResolved
                                ? 'bg-brand-500 hover:bg-brand-600 text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                            }
            `}
                    >
                        <FaCheck className="w-4 h-4" />
                        Resolve & Sync
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConflictResolutionModal;
