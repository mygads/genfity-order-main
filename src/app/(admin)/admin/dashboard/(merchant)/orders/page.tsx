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

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  FaCheckSquare,
  FaSquare,
  FaTimes,
  FaEye,
  FaFilter,
  FaTh,
  FaList,
  FaTags,
  FaExpand,
  FaCompress,
  FaSearch,
} from 'react-icons/fa';
import { useContextualHint, CONTEXTUAL_HINTS, useClickHereHint, CLICK_HINTS } from '@/lib/tutorial';
import { OrderKanbanBoard } from '@/components/orders/OrderKanbanBoard';
import { OrderKanbanListView } from '@/components/orders/OrderKanbanListView';
import { OrderTabListView } from '@/components/orders/OrderTabListView';
import { OrderDetailModal } from '@/components/orders/OrderDetailModal';
import { OrderFiltersComponent, type OrderFilters } from '@/components/orders/OrderFilters';
import { KitchenDisplaySkeleton } from '@/components/common/SkeletonLoaders';
import type { OrderListItem } from '@/lib/types/order';
import { useMerchant } from '@/context/MerchantContext';
import { OrderStatus } from '@prisma/client';
import { useTranslation } from '@/lib/i18n/useTranslation';

type ViewMode = 'kanban-card' | 'kanban-list' | 'tab-list';

const DEFAULT_FILTERS: OrderFilters = {
  orderType: 'ALL',
  paymentStatus: 'ALL',
  dateFrom: '',
  dateTo: '',
};

/**
 * Main page component wrapped with Suspense for useSearchParams
 */
export default function MerchantOrdersPage() {
  return (
    <Suspense fallback={<KitchenDisplaySkeleton />}>
      <MerchantOrdersPageContent />
    </Suspense>
  );
}

/**
 * Inner content component that uses useSearchParams
 */
function MerchantOrdersPageContent() {
  const _router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const { showHint } = useContextualHint();
  const { showClickHint } = useClickHereHint();

  // State management
  const [viewMode, setViewMode] = useState<ViewMode>('kanban-card');
  const [selectedOrder, setSelectedOrder] = useState<OrderListItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [merchantId, setMerchantId] = useState<bigint | null>(null);
  const [merchantCurrency, setMerchantCurrency] = useState<string>('AUD');
  const [loading, setLoading] = useState(true);
  const [displayMode, setDisplayMode] = useState<'normal' | 'clean' | 'fullscreen'>('normal');
  const [searchQuery, setSearchQuery] = useState('');

  // Track order ID from URL for auto-opening modal
  const [urlOrderId, setUrlOrderId] = useState<string | null>(null);

  // Ref to trigger manual refresh from OrderKanbanBoard
  const kanbanRefreshRef = React.useRef<(() => void) | null>(null);

  // Filters
  const [filters, setFilters] = useState<OrderFilters>(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);

  // Bulk operations
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkStatusUpdate, setBulkStatusUpdate] = useState<OrderStatus | ''>('');

  // Use MerchantContext
  const { merchant: merchantData, isLoading: merchantLoading } = useMerchant();

  // Check for orderId in URL params (from notification click)
  useEffect(() => {
    const orderId = searchParams.get('orderId');
    if (orderId) {
      setUrlOrderId(orderId);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!merchantLoading && merchantData) {
      setMerchantId(BigInt(merchantData.id));
      setMerchantCurrency(merchantData.currency || 'AUD');
      setLoading(false);
    }
  }, [merchantData, merchantLoading]);

  // Show contextual hints on first visit
  useEffect(() => {
    if (!loading) {
      showHint(CONTEXTUAL_HINTS.ordersFirstVisit);
      // Show view modes tip after a delay with click hint
      const timer = setTimeout(() => {
        showHint(CONTEXTUAL_HINTS.orderViewModes);
        showClickHint(CLICK_HINTS.orderViewModesButton);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [loading, showHint, showClickHint]);

  const fetchMerchantId = useCallback(async () => {
    // Kept for backwards compatibility, but now uses context data
    if (merchantData) {
      setMerchantId(BigInt(merchantData.id));
      setMerchantCurrency(merchantData.currency || 'AUD');
      setLoading(false);
    }
  }, [merchantData]);

  useEffect(() => {
    fetchMerchantId();
  }, [fetchMerchantId]);

  // Handle display mode changes
  useEffect(() => {
    const sidebar = document.querySelector('[data-sidebar]') as HTMLElement;
    const header = document.querySelector('[data-header]') as HTMLElement;
    const breadcrumb = document.querySelector('[data-breadcrumb]') as HTMLElement;

    if (displayMode === 'clean' || displayMode === 'fullscreen') {
      // Hide UI elements
      document.body.classList.add('clean-mode');
      if (sidebar) sidebar.style.display = 'none';
      if (header) header.style.display = 'none';
      if (breadcrumb) breadcrumb.style.display = 'none';
    } else {
      // Show UI elements
      document.body.classList.remove('clean-mode');
      if (sidebar) sidebar.style.display = '';
      if (header) header.style.display = '';
      if (breadcrumb) breadcrumb.style.display = '';
    }

    // Cleanup on unmount
    return () => {
      document.body.classList.remove('clean-mode');
      if (sidebar) sidebar.style.display = '';
      if (header) header.style.display = '';
      if (breadcrumb) breadcrumb.style.display = '';
    };
  }, [displayMode]);

  // Listen to fullscreen changes (ESC key)
  useEffect(() => {
    const handleFullScreenChange = () => {
      if (!document.fullscreenElement && displayMode === 'fullscreen') {
        // User pressed ESC or exited fullscreen, go back to normal mode (completes the cycle)
        setDisplayMode('normal');
      }
    };

    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
    };
  }, [displayMode]);

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

  const _handleManualRefresh = () => {
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

  // Select all orders in a column
  const selectAllInColumn = (_status: string, orderIds: string[]) => {
    setSelectedOrders(prev => {
      const newSet = new Set(prev);
      orderIds.forEach(id => newSet.add(id));
      return newSet;
    });
  };

  // Deselect all orders from a column
  const deselectAllInColumn = (orderIds: string[]) => {
    setSelectedOrders(prev => {
      const newSet = new Set(prev);
      orderIds.forEach(id => newSet.delete(id));
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
    return <KitchenDisplaySkeleton />;
  }

  return (
    <div data-tutorial="orders-page" className={`${displayMode !== 'normal' ? 'fixed inset-0 z-40 overflow-hidden bg-white dark:bg-gray-950 flex flex-col' : 'flex flex-col h-[calc(100vh-100px)]'}`}>
      {/* Header - Always Sticky like Kitchen Display */}
      <div className={`sticky top-0 z-30 bg-white/95 backdrop-blur-sm dark:bg-gray-950/95 border-b border-gray-200 dark:border-gray-800 ${displayMode !== 'normal' ? 'px-6 pt-6 pb-4' : 'pb-4 -mx-6 px-6 pt-0'}`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">
              {t("admin.orders.title")}
            </h1>
          </div>

          {/* Search Bar */}
          <div data-tutorial="order-search" className="relative w-full lg:w-auto lg:min-w-75">
            <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
              <FaSearch className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("admin.orders.searchPlaceholder")}
              className="w-full h-11 pl-11 pr-10 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 placeholder-gray-400 shadow-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500 dark:focus:border-primary-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <FaTimes className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* View Mode Selector */}
            <div data-tutorial="order-view-modes" className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1 dark:border-gray-800 dark:bg-gray-900">
              <button
                onClick={() => setViewMode('kanban-card')}
                className={`flex h-8 items-center gap-2 rounded-md px-3 text-xs font-semibold transition-all ${viewMode === 'kanban-card'
                  ? 'bg-primary-500 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                  }`}
                title="Kanban + Card View"
              >
                <FaTh className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t("admin.orders.viewCard")}</span>
              </button>
              <button
                onClick={() => setViewMode('kanban-list')}
                className={`flex h-8 items-center gap-2 rounded-md px-3 text-xs font-semibold transition-all ${viewMode === 'kanban-list'
                  ? 'bg-primary-500 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                  }`}
                title="Kanban + List View"
              >
                <FaList className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t("admin.orders.viewList")}</span>
              </button>
              <button
                onClick={() => setViewMode('tab-list')}
                className={`flex h-8 items-center gap-2 rounded-md px-3 text-xs font-semibold transition-all ${viewMode === 'tab-list'
                  ? 'bg-primary-500 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                  }`}
                title="Tab + List View"
              >
                <FaTags className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t("admin.orders.viewTabs")}</span>
              </button>
            </div>

            {/* Filter Toggle */}
            <button
              data-tutorial="order-filters-btn"
              onClick={() => setShowFilters(!showFilters)}
              className={`flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-medium transition-colors ${showFilters
                ? 'border-primary-200 bg-primary-50 text-primary-700 dark:border-primary-800 dark:bg-primary-900/20 dark:text-primary-400'
                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800'
                }`}
            >
              <FaFilter />
              <span className="hidden sm:inline">{t("admin.orders.filters")}</span>
            </button>

            {/* Bulk Mode Toggle */}
            <button
              data-tutorial="order-bulk-mode"
              onClick={toggleBulkMode}
              className={`flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-medium transition-colors ${bulkMode
                ? 'border-primary-200 bg-primary-50 text-primary-700 dark:border-primary-800 dark:bg-primary-900/20 dark:text-primary-400'
                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800'
                }`}
            >
              {bulkMode ? <FaCheckSquare /> : <FaSquare />}
              <span className="hidden sm:inline">{t("admin.orders.bulkSelect")}</span>
            </button>

            {/* Progressive Display Mode: Normal → Clean → Fullscreen */}
            <button
              data-tutorial="order-fullscreen"
              onClick={async () => {
                if (displayMode === 'normal') {
                  // Go to clean mode
                  setDisplayMode('clean');
                } else if (displayMode === 'clean') {
                  // Go to fullscreen mode
                  try {
                    await document.documentElement.requestFullscreen();
                    setDisplayMode('fullscreen');
                  } catch (err) {
                    console.error('Error entering fullscreen:', err);
                  }
                } else {
                  // Exit fullscreen, back to normal
                  try {
                    if (document.fullscreenElement) {
                      await document.exitFullscreen();
                    }
                    setDisplayMode('normal');
                  } catch (err) {
                    console.error('Error exiting fullscreen:', err);
                  }
                }
              }}
              className={`flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-medium transition-colors ${displayMode !== 'normal'
                ? 'border-primary-200 bg-primary-50 text-primary-700 dark:border-primary-800 dark:bg-primary-900/20 dark:text-primary-400'
                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800'
                }`}
              title={
                displayMode === 'normal' ? t("admin.orders.enterCleanMode") :
                  displayMode === 'clean' ? t("admin.orders.enterFullScreen") :
                    t("admin.orders.exitFullScreen")
              }
            >
              {displayMode === 'normal' ? <FaEye /> :
                displayMode === 'clean' ? <FaExpand /> :
                  <FaCompress />}
              {/* <span className="hidden sm:inline">
                {displayMode === 'normal' ? t("admin.orders.cleanMode") :
                  displayMode === 'clean' ? t("admin.orders.fullScreen") :
                    t("admin.orders.exit")}
              </span> */}
            </button>
          </div>
        </div>
      </div>

      {/* Content Area - with spacing from header */}
      <div className={`flex-1 overflow-y-auto space-y-6 ${displayMode !== 'normal' ? 'px-6 pb-6 pt-6' : 'pt-6'}`}>
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
          <div className="rounded-xl border border-primary-200 bg-primary-50 p-4 dark:border-primary-800 dark:bg-primary-900/20">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-primary-700 dark:text-primary-400">
                  {t("admin.orders.ordersSelected", { count: selectedOrders.size })}
                </span>
                <button
                  onClick={() => setSelectedOrders(new Set())}
                  className="flex h-8 items-center gap-1.5 rounded-lg border border-primary-300 bg-white px-3 text-xs font-medium text-primary-700 hover:bg-primary-50 dark:border-primary-700 dark:bg-primary-900 dark:text-primary-400 dark:hover:bg-primary-800"
                >
                  <FaTimes className="h-3 w-3" />
                  {t("common.clear")}
                </button>
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={bulkStatusUpdate}
                  onChange={(e) => setBulkStatusUpdate(e.target.value as OrderStatus)}
                  className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
                >
                  <option value="">{t("admin.orders.selectStatus")}</option>
                  <option value="PENDING">{t("admin.status.pending")}</option>
                  <option value="ACCEPTED">{t("admin.status.accepted")}</option>
                  <option value="IN_PROGRESS">{t("admin.status.inProgress")}</option>
                  <option value="READY">{t("admin.status.ready")}</option>
                  <option value="COMPLETED">{t("admin.status.completed")}</option>
                  <option value="CANCELLED">{t("admin.status.cancelled")}</option>
                </select>

                <button
                  onClick={handleBulkStatusUpdate}
                  disabled={!bulkStatusUpdate}
                  className="h-9 rounded-lg bg-primary-500 px-4 text-sm font-semibold text-white hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-primary-600 dark:hover:bg-primary-700"
                >
                  {t("admin.orders.updateStatus")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Order Views - Conditional Rendering Based on View Mode */}
        {merchantId && (
          <div data-tutorial="order-kanban-board">
            {viewMode === 'kanban-card' && (
              <OrderKanbanBoard
                merchantId={merchantId}
                autoRefresh={true}
                refreshInterval={1000}
                enableDragDrop={!bulkMode}
                onOrderClick={handleOrderClick}
                orderNumberDisplayMode="suffix"
                filters={filters}
                searchQuery={searchQuery}
                selectedOrders={selectedOrders}
                bulkMode={bulkMode}
                onToggleSelection={toggleOrderSelection}
                onSelectAllInColumn={selectAllInColumn}
                onDeselectAllInColumn={deselectAllInColumn}
                currency={merchantCurrency}
                onRefreshReady={(refreshFn) => {
                  kanbanRefreshRef.current = refreshFn;
                }}
              />
            )}

            {viewMode === 'kanban-list' && (
              <OrderKanbanListView
                merchantId={merchantId}
                autoRefresh={true}
                refreshInterval={1000}
                enableDragDrop={!bulkMode}
                onOrderClick={handleOrderClick}
                orderNumberDisplayMode="suffix"
                filters={filters}
                searchQuery={searchQuery}
                selectedOrders={selectedOrders}
                bulkMode={bulkMode}
                onToggleSelection={toggleOrderSelection}
                currency={merchantCurrency}
                onRefreshReady={(refreshFn) => {
                  kanbanRefreshRef.current = refreshFn;
                }}
              />
            )}

            {viewMode === 'tab-list' && (
              <OrderTabListView
                merchantId={merchantId}
                autoRefresh={true}
                refreshInterval={1000}
                onOrderClick={handleOrderClick}
                orderNumberDisplayMode="suffix"
                filters={filters}
                searchQuery={searchQuery}
                selectedOrders={selectedOrders}
                bulkMode={bulkMode}
                onToggleSelection={toggleOrderSelection}
                currency={merchantCurrency}
                onRefreshReady={(refreshFn) => {
                  kanbanRefreshRef.current = refreshFn;
                }}
              />
            )}
          </div>
        )}

        {/* Order Detail Modal - handles both clicked orders and URL-triggered orders */}
        {(selectedOrder || urlOrderId) && (
          <OrderDetailModal
            orderId={selectedOrder ? String(selectedOrder.id) : urlOrderId!}
            isOpen={isModalOpen || !!urlOrderId}
            onClose={() => {
              handleCloseModal();
              setUrlOrderId(null);
              // Clear the URL param without page reload
              window.history.replaceState({}, '', '/admin/dashboard/orders');
            }}
            onUpdate={handleOrderUpdate}
            initialOrder={selectedOrder as unknown as import('@/lib/types/order').OrderWithDetails}
            currency={merchantCurrency}
          />
        )}
      </div>
    </div>
  );
}
