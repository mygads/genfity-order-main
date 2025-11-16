'use client';

import React, { useState } from 'react';
import { PencilIcon, CloseIcon } from '@/icons';

/**
 * Bulk Stock Actions Component
 * 
 * Professional floating action bar for bulk operations:
 * - Select multiple items
 * - Bulk reset to template
 * - Bulk stock update
 * - Clean modal confirmations
 */

interface BulkStockActionsProps {
  selectedItems: Array<{ id: number | string; type: 'menu' | 'addon'; name: string }>;
  onResetSelected: () => Promise<void>;
  onUpdateAll: (quantity: number) => Promise<void>;
  onClearSelection: () => void;
}

export default function BulkStockActions({
  selectedItems,
  onResetSelected,
  onUpdateAll,
  onClearSelection,
}: BulkStockActionsProps) {
  const [showResetModal, setShowResetModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [bulkUpdateQty, setBulkUpdateQty] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const handleResetSelected = async () => {
    setIsLoading(true);
    try {
      await onResetSelected();
      setShowResetModal(false);
      onClearSelection();
    } catch (error) {
      console.error('Error resetting stock:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateAll = async () => {
    if (bulkUpdateQty < 0) return;
    
    setIsLoading(true);
    try {
      await onUpdateAll(bulkUpdateQty);
      setShowUpdateModal(false);
      onClearSelection();
      setBulkUpdateQty(0);
    } catch (error) {
      console.error('Error updating stock:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAllOutOfStock = async () => {
    setIsLoading(true);
    try {
      await onUpdateAll(0);
      onClearSelection();
    } catch (error) {
      console.error('Error marking out of stock:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (selectedItems.length === 0) {
    return null;
  }

  return (
    <>
      {/* Floating Action Bar */}
      <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 transform">
        <div className="rounded-lg border border-gray-200 bg-white px-6 py-4 shadow-2xl dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700 dark:bg-brand-900/30 dark:text-brand-400">
                {selectedItems.length}
              </div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {selectedItems.length} item{selectedItems.length > 1 ? 's' : ''} selected
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowResetModal(true)}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white transition-colors hover:bg-brand-600"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Reset
              </button>

              <button
                onClick={() => setShowUpdateModal(true)}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:hover:bg-gray-800"
              >
                <PencilIcon className="h-4 w-4" />
                Update
              </button>

              <button
                onClick={handleMarkAllOutOfStock}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-error-200 bg-error-50 px-4 text-sm font-medium text-error-700 transition-colors hover:bg-error-100 dark:border-error-800 dark:bg-error-900/20 dark:text-error-400 dark:hover:bg-error-900/30"
                disabled={isLoading}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                Out of Stock
              </button>

              <button
                onClick={onClearSelection}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:hover:bg-gray-800"
              >
                <CloseIcon className="h-4 w-4" />
                Cancel
                
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900">
            <h3 className="mb-4 text-xl font-bold text-gray-800 dark:text-white/90">
              Confirm Stock Reset
            </h3>
            <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              You are about to reset stock for {selectedItems.length} item{selectedItems.length > 1 ? 's' : ''} to their daily stock templates.
              This action cannot be undone.
            </p>

            <div className="mb-6 max-h-48 overflow-y-auto rounded-lg border border-gray-200 p-3 dark:border-gray-800">
              <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Items to reset:
              </p>
              <ul className="space-y-1">
                {selectedItems.map((item, index) => (
                  <li
                    key={`${item.type}-${item.id}`}
                    className="text-sm text-gray-600 dark:text-gray-400"
                  >
                    {index + 1}. {item.name} ({item.type === 'menu' ? 'Menu' : 'Add-on'})
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowResetModal(false)}
                className="inline-flex h-10 items-center rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:hover:bg-gray-800"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleResetSelected}
                className="inline-flex h-10 items-center rounded-lg bg-brand-500 px-4 text-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:opacity-50"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    Processing...
                  </>
                ) : (
                  'Yes, Reset All'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update All Modal */}
      {showUpdateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900">
            <h3 className="mb-4 text-xl font-bold text-gray-800 dark:text-white/90">
              Bulk Stock Update
            </h3>
            <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              Set all {selectedItems.length} item{selectedItems.length > 1 ? 's' : ''} to the same stock quantity.
            </p>

            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                New Stock Quantity
              </label>
              <input
                type="number"
                value={bulkUpdateQty}
                onChange={(e) => setBulkUpdateQty(parseInt(e.target.value) || 0)}
                className="h-11 w-full rounded-lg border border-gray-200 px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
                min="0"
                placeholder="Enter stock quantity"
                autoFocus
              />
            </div>

            <div className="mb-6 max-h-48 overflow-y-auto rounded-lg border border-gray-200 p-3 dark:border-gray-800">
              <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Items to update:
              </p>
              <ul className="space-y-1">
                {selectedItems.map((item, index) => (
                  <li
                    key={`${item.type}-${item.id}`}
                    className="text-sm text-gray-600 dark:text-gray-400"
                  >
                    {index + 1}. {item.name} ({item.type === 'menu' ? 'Menu' : 'Add-on'})
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowUpdateModal(false);
                  setBulkUpdateQty(0);
                }}
                className="inline-flex h-10 items-center rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:hover:bg-gray-800"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateAll}
                className="inline-flex h-10 items-center rounded-lg bg-brand-500 px-4 text-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:opacity-50"
                disabled={isLoading || bulkUpdateQty < 0}
              >
                {isLoading ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    Processing...
                  </>
                ) : (
                  'Update All'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
