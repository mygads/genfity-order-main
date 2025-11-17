/**
 * Merchant Orders Page - Professional Redesign
 * 
 * Features:
 * - Advanced filters (order type, payment status, date range)
 * - Bulk operations (select multiple orders, bulk status update)
 * - Enhanced drag validation (visual feedback for invalid drops)
 * - Professional, clean UI with minimal colors
 * - English labels, icons from react-icons/fa
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FaSync, 
  FaHistory, 
  FaCheckSquare, 
  FaSquare,
  FaTimes,
  FaFilter,
} from 'react-icons/fa';
import { OrderKanbanBoard } from '@/components/orders/OrderKanbanBoard';
import { OrderDetailModal } from '@/components/orders/OrderDetailModal';
import { OrderFiltersComponent, type OrderFilters } from '@/components/orders/OrderFilters';
import type { OrderListItem } from '@/lib/types/order';
import { OrderStatus } from '@prisma/client';

const DEFAULT_FILTERS: OrderFilters = {
  orderType: 'ALL',
  paymentStatus: 'ALL',
  dateFrom: '',
  dateTo: '',
};

export default function MerchantOrdersPage() {
  const router = useRouter();
  
  // State management
  const [selectedOrder, setSelectedOrder] = useState<OrderListItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [merchantId, setMerchantId] = useState<bigint | null>(null);
  const [merchantCurrency, setMerchantCurrency] = useState<string>('AUD');
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  // Ref to trigger manual refresh from OrderKanbanBoard
  const kanbanRefreshRef = React.useRef<(() => void) | null>(null);
  
  // Filters
  const [filters, setFilters] = useState<OrderFilters>(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  
  // Bulk operations
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkStatusUpdate, setBulkStatusUpdate] = useState<OrderStatus | ''>('');

  // Fetch merchant ID
  const fetchMerchantId = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/admin/login');
        return;
      }

      const response = await fetch('/api/merchant/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch merchant');

      const data = await response.json();
      if (data.success && data.data) {
        setMerchantId(BigInt(data.data.id));
        if (data.data.currency) {
          setMerchantCurrency(data.data.currency);
        }
      }
    } catch (error) {
      console.error('Error fetching merchant:', error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchMerchantId();
  }, [fetchMerchantId]);

  // Handlers
  const handleOrderClick = (order: OrderListItem) => {
    if (bulkMode) {
      toggleOrderSelection(String(order.id));
    } else {
      setSelectedOrder(order);
      setIsModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedOrder(null);
  };

  const handleOrderUpdate = () => {
    // Trigger refresh via ref callback
    kanbanRefreshRef.current?.();
  };

  const handleManualRefresh = () => {
    // Trigger refresh via ref callback
    kanbanRefreshRef.current?.();
  };

  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  // Bulk operations
  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const toggleBulkMode = () => {
    setBulkMode(!bulkMode);
    setSelectedOrders(new Set());
    setBulkStatusUpdate('');
  };

  const handleBulkStatusUpdate = async () => {
    if (!bulkStatusUpdate || selectedOrders.size === 0) return;

    try {
      const token = localStorage.getItem('accessToken');
      const orderIds = Array.from(selectedOrders);

      // Update each order
      await Promise.all(
        orderIds.map(orderId =>
          fetch(`/api/merchant/orders/${orderId}/status`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ status: bulkStatusUpdate }),
          })
        )
      );

      // Reset and refresh
      setSelectedOrders(new Set());
      setBulkStatusUpdate('');
      setBulkMode(false);
      kanbanRefreshRef.current?.();
    } catch (error) {
      console.error('Error updating orders:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent"></div>
          <span className="text-sm font-medium">Loading orders...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">
            Order Management
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage and track orders in real-time with drag & drop
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-medium transition-colors ${
              showFilters
                ? 'border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-800 dark:bg-brand-900/20 dark:text-brand-400'
                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800'
            }`}
          >
            <FaFilter />
            <span className="hidden sm:inline">Filters</span>
          </button>

          {/* Bulk Mode Toggle */}
          <button
            onClick={toggleBulkMode}
            className={`flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-medium transition-colors ${
              bulkMode
                ? 'border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-800 dark:bg-brand-900/20 dark:text-brand-400'
                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800'
            }`}
          >
            {bulkMode ? <FaCheckSquare /> : <FaSquare />}
            <span className="hidden sm:inline">Bulk Select</span>
          </button>

          {/* Auto Refresh Toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-medium transition-colors ${
              autoRefresh
                ? 'border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-800 dark:bg-brand-900/20 dark:text-brand-400'
                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800'
            }`}
          >
            <FaSync className={autoRefresh ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Auto Refresh</span>
          </button>

          {/* Manual Refresh */}
          <button
            onClick={handleManualRefresh}
            className="flex h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <FaSync />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* History & Analytics */}
          <button
            onClick={() => router.push('/admin/dashboard/orders/history')}
            className="flex h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <FaHistory />
            <span className="hidden sm:inline">History</span>
          </button>
        </div>
      </div>

      {/* Filters Section */}
      {showFilters && (
        <OrderFiltersComponent
          filters={filters}
          onChange={setFilters}
          onReset={handleResetFilters}
        />
      )}

      {/* Bulk Operations Bar */}
      {bulkMode && selectedOrders.size > 0 && (
        <div className="rounded-xl border border-brand-200 bg-brand-50 p-4 dark:border-brand-800 dark:bg-brand-900/20">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-brand-700 dark:text-brand-400">
                {selectedOrders.size} order{selectedOrders.size !== 1 ? 's' : ''} selected
              </span>
              <button
                onClick={() => setSelectedOrders(new Set())}
                className="flex h-8 items-center gap-1.5 rounded-lg border border-brand-300 bg-white px-3 text-xs font-medium text-brand-700 hover:bg-brand-50 dark:border-brand-700 dark:bg-brand-900 dark:text-brand-400 dark:hover:bg-brand-800"
              >
                <FaTimes className="h-3 w-3" />
                Clear
              </button>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={bulkStatusUpdate}
                onChange={(e) => setBulkStatusUpdate(e.target.value as OrderStatus)}
                className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
              >
                <option value="">Select status...</option>
                <option value="PENDING">Pending</option>
                <option value="ACCEPTED">Accepted</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="READY">Ready</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>

              <button
                onClick={handleBulkStatusUpdate}
                disabled={!bulkStatusUpdate}
                className="h-9 rounded-lg bg-brand-500 px-4 text-sm font-semibold text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-brand-600 dark:hover:bg-brand-700"
              >
                Update Status
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Kanban Board */}
      {merchantId && (
        <OrderKanbanBoard
          merchantId={merchantId}
          autoRefresh={autoRefresh}
          refreshInterval={1000}
          enableDragDrop={!bulkMode}
          onOrderClick={handleOrderClick}
          filters={filters}
          selectedOrders={selectedOrders}
          bulkMode={bulkMode}
          onToggleSelection={toggleOrderSelection}
          currency={merchantCurrency}
          onRefreshReady={(refreshFn) => {
            kanbanRefreshRef.current = refreshFn;
          }}
        />
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <OrderDetailModal
          orderId={String(selectedOrder.id)}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onUpdate={handleOrderUpdate}
        />
      )}
    </div>
  );
}
