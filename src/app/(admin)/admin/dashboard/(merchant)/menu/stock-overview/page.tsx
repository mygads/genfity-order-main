'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import StockStatusCard, { StockStatusCardSkeleton } from '@/components/menu/StockStatusCard';
import BulkStockActions from '@/components/menu/BulkStockActions';
import { useTranslation } from '@/lib/i18n/useTranslation';
import ConfirmDialog from '@/components/modals/ConfirmDialog';
import AlertDialog from '@/components/modals/AlertDialog';

interface StockItem {
  id: number | string;
  type: 'menu' | 'addon';
  name: string;
  categoryName?: string;
  stockQty: number | null;
  dailyStockTemplate: number | null;
  autoResetStock: boolean;
  isActive: boolean;
  imageUrl?: string | null;
}

interface StockStats {
  total: number;
  menus: number;
  addons: number;
  lowStock: number;
  outOfStock: number;
  healthy: number;
  withTemplate: number;
}

type FilterType = 'all' | 'low' | 'out' | 'healthy';
type TabType = 'all' | 'menus' | 'addons';

export default function StockOverviewPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<StockItem[]>([]);
  const [stats, setStats] = useState<StockStats>({
    total: 0,
    menus: 0,
    addons: 0,
    lowStock: 0,
    outOfStock: 0,
    healthy: 0,
    withTemplate: 0,
  });
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<Array<{ id: number | string; type: 'menu' | 'addon'; name: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showQuickActions, setShowQuickActions] = useState(false);

  const [bulkAddConfirmOpen, setBulkAddConfirmOpen] = useState(false);
  const [pendingBulkAddAmount, setPendingBulkAddAmount] = useState<number | null>(null);

  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [pendingResetCount, setPendingResetCount] = useState<number>(0);
  const [noTemplateAlertOpen, setNoTemplateAlertOpen] = useState(false);

  // Fetch stock data
  useEffect(() => {
    fetchStockData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = [...stockItems];

    if (activeTab === 'menus') {
      filtered = filtered.filter((item) => item.type === 'menu');
    } else if (activeTab === 'addons') {
      filtered = filtered.filter((item) => item.type === 'addon');
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.categoryName?.toLowerCase().includes(query)
      );
    }

    if (activeFilter === 'low') {
      filtered = filtered.filter(
        (item) => item.stockQty !== null && item.stockQty > 0 && item.stockQty <= 5
      );
    } else if (activeFilter === 'out') {
      filtered = filtered.filter(
        (item) => item.stockQty === null || item.stockQty === 0
      );
    } else if (activeFilter === 'healthy') {
      filtered = filtered.filter(
        (item) => item.stockQty !== null && item.stockQty > 5
      );
    }

    setFilteredItems(filtered);
  }, [stockItems, activeTab, activeFilter, searchQuery]);

  const fetchStockData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/admin/login');
        return;
      }

      const response = await fetch('/api/merchant/menu/stock/overview', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch stock data');

      const result = await response.json();
      if (result.success) {
        setStockItems(result.data.items);
        setStats(result.data.stats);
      } else {
        throw new Error(result.message || 'Failed to load stock data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stock data');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to recalculate stats based on current stock items
  const recalculateStats = (items: StockItem[]): StockStats => {
    const menus = items.filter(item => item.type === 'menu').length;
    const addons = items.filter(item => item.type === 'addon').length;
    const healthy = items.filter(item => item.stockQty !== null && item.stockQty > 5).length;
    const lowStock = items.filter(item => item.stockQty !== null && item.stockQty > 0 && item.stockQty <= 5).length;
    const outOfStock = items.filter(item => item.stockQty === null || item.stockQty === 0).length;
    const withTemplate = items.filter(item => item.dailyStockTemplate !== null).length;

    return {
      total: items.length,
      menus,
      addons,
      lowStock,
      outOfStock,
      healthy,
      withTemplate,
    };
  };

  // Optimistic update - UI changes instantly, server request in background
  const handleUpdateStock = (id: number | string, type: 'menu' | 'addon', newQty: number) => {
    // Update UI immediately
    const updatedItems = stockItems.map((item) =>
      item.id === id && item.type === type ? { ...item, stockQty: newQty } : item
    );
    setStockItems(updatedItems);
    setStats(recalculateStats(updatedItems));

    // Send request in background (fire and forget with error handling)
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    fetch('/api/merchant/menu/stock/bulk-update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        updates: [{ type, id: typeof id === 'string' ? parseInt(id) : id, stockQty: newQty }],
      }),
    }).catch((error) => {
      console.error('Background stock update failed:', error);
      // Optionally revert on failure - for now just log
    });
  };

  // Optimistic reset to template
  const handleResetToTemplate = (id: number | string, type: 'menu' | 'addon') => {
    const item = stockItems.find(i => i.id === id && i.type === type);
    if (!item || item.dailyStockTemplate === null) return;

    // Update UI immediately with template value
    const updatedItems = stockItems.map((i) =>
      i.id === id && i.type === type ? { ...i, stockQty: i.dailyStockTemplate } : i
    );
    setStockItems(updatedItems);
    setStats(recalculateStats(updatedItems));

    // Send request in background
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    fetch('/api/merchant/menu/stock/bulk-update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        updates: [{ type, id: typeof id === 'string' ? parseInt(id) : id, resetToTemplate: true }],
      }),
    }).catch((error) => {
      console.error('Background reset failed:', error);
    });
  };

  const handleSelectItem = (id: number | string, type: 'menu' | 'addon') => {
    const item = stockItems.find((i) => i.id === id && i.type === type);
    if (!item) return;

    const isSelected = selectedItems.some((s) => s.id === id && s.type === type);
    if (isSelected) {
      setSelectedItems((prev) => prev.filter((s) => !(s.id === id && s.type === type)));
    } else {
      setSelectedItems((prev) => [...prev, { id, type, name: item.name }]);
    }
  };

  // Optimistic reset selected items
  const handleResetSelected = () => {
    // Update UI immediately
    const updatedItems = stockItems.map((item) => {
      const isSelected = selectedItems.some(s => s.id === item.id && s.type === item.type);
      if (isSelected && item.dailyStockTemplate !== null) {
        return { ...item, stockQty: item.dailyStockTemplate };
      }
      return item;
    });
    setStockItems(updatedItems);
    setStats(recalculateStats(updatedItems));
    setSelectedItems([]);

    // Send request in background
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const updates = selectedItems.map((item) => ({
      type: item.type,
      id: typeof item.id === 'string' ? parseInt(item.id) : item.id,
      resetToTemplate: true,
    }));

    fetch('/api/merchant/menu/stock/bulk-update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ updates }),
    }).catch((error) => {
      console.error('Background reset selected failed:', error);
    });
  };

  // Optimistic update all selected items
  const handleUpdateAll = (quantity: number) => {
    // Update UI immediately
    const updatedItems = stockItems.map((item) => {
      const isSelected = selectedItems.some(s => s.id === item.id && s.type === item.type);
      if (isSelected) {
        return { ...item, stockQty: quantity };
      }
      return item;
    });
    setStockItems(updatedItems);
    setStats(recalculateStats(updatedItems));
    setSelectedItems([]);

    // Send request in background
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const updates = selectedItems.map((item) => ({
      type: item.type,
      id: typeof item.id === 'string' ? parseInt(item.id) : item.id,
      stockQty: quantity,
    }));

    fetch('/api/merchant/menu/stock/bulk-update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ updates }),
    }).catch((error) => {
      console.error('Background update all failed:', error);
    });
  };

  const handleExportCSV = () => {
    if (filteredItems.length === 0) return;

    const csvRows = [
      ['Type', 'Name', 'Category', 'Stock', 'Template', 'Auto Reset', 'Status'],
      ...filteredItems.map((item) => [
        item.type,
        item.name,
        item.categoryName || '-',
        (item.stockQty ?? 0).toString(),
        (item.dailyStockTemplate ?? '-').toString(),
        item.autoResetStock ? 'Yes' : 'No',
        item.isActive ? t('common.active') : t('common.inactive'),
      ]),
    ];

    const csvContent = csvRows.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock-overview-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const performBulkAddStock = (amount: number) => {
    // Update UI immediately
    const updatedItems = stockItems.map((item) => ({
      ...item,
      stockQty: (item.stockQty ?? 0) + amount,
    }));
    setStockItems(updatedItems);
    setStats(recalculateStats(updatedItems));

    // Send request in background
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const updates = stockItems.map((item) => ({
      id: typeof item.id === 'string' ? parseInt(item.id) : item.id,
      type: item.type,
      stockQty: (item.stockQty ?? 0) + amount,
    }));

    fetch('/api/merchant/menu/stock/bulk-update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ updates }),
    }).catch((error) => {
      console.error('Background bulk add failed:', error);
    });
  };

  // Optimistic bulk add stock
  const handleBulkAddStock = (amount: number) => {
    setPendingBulkAddAmount(amount);
    setBulkAddConfirmOpen(true);
  };

  // Optimistic reset all to template
  const performResetAllToTemplate = () => {
    const itemsWithTemplate = stockItems.filter(item => item.dailyStockTemplate !== null);

    if (itemsWithTemplate.length === 0) {
      setNoTemplateAlertOpen(true);
      return;
    }

    // Update UI immediately
    const updatedItems = stockItems.map((item) => {
      if (item.dailyStockTemplate !== null) {
        return { ...item, stockQty: item.dailyStockTemplate };
      }
      return item;
    });
    setStockItems(updatedItems);
    setStats(recalculateStats(updatedItems));

    // Send request in background
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const updates = itemsWithTemplate.map((item) => ({
      id: typeof item.id === 'string' ? parseInt(item.id) : item.id,
      type: item.type,
      resetToTemplate: true,
    }));

    fetch('/api/merchant/menu/stock/bulk-update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ updates }),
    }).catch((error) => {
      console.error('Background reset all failed:', error);
    });
  };

  const handleResetAllToTemplate = () => {
    const itemsWithTemplateCount = stockItems.filter(item => item.dailyStockTemplate !== null).length;
    if (itemsWithTemplateCount === 0) {
      setNoTemplateAlertOpen(true);
      return;
    }
    setPendingResetCount(itemsWithTemplateCount);
    setResetConfirmOpen(true);
  };

  if (isLoading) {
    return (
      <div>
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
          {/* Header Skeleton */}
          <div className="border-b border-gray-200 bg-gray-50/50 px-6 py-5 dark:border-gray-800 dark:bg-gray-900/50">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse" />
                <div>
                  <div className="h-6 w-40 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
                  <div className="mt-2 h-4 w-56 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
                </div>
              </div>
              <div className="flex gap-2">
                <div className="h-11 w-32 rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse" />
                <div className="h-11 w-24 rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse" />
                <div className="h-11 w-24 rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse" />
              </div>
            </div>
          </div>

          {/* Content Skeleton */}
          <div className="p-6 lg:p-8">
            {/* Stats Skeleton */}
            <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="rounded-2xl border-2 border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900/50 animate-pulse">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="h-4 w-20 rounded bg-gray-200 dark:bg-gray-700" />
                      <div className="mt-2 h-9 w-12 rounded bg-gray-200 dark:bg-gray-700" />
                      <div className="mt-2 h-3 w-16 rounded bg-gray-200 dark:bg-gray-700" />
                    </div>
                    <div className="h-12 w-12 rounded-xl bg-gray-200 dark:bg-gray-700" />
                  </div>
                </div>
              ))}
            </div>

            {/* Tabs and Search Skeleton */}
            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="h-12 w-80 rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse" />
              <div className="h-12 w-64 rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse" />
            </div>

            {/* Cards Skeleton */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <StockStatusCardSkeleton key={i} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-tutorial="stock-overview-page">
      <AlertDialog
        isOpen={noTemplateAlertOpen}
        title={t('common.error') || 'Error'}
        message={t('admin.stock.noTemplateSet') || 'No items have a daily stock template set'}
        variant="warning"
        onClose={() => setNoTemplateAlertOpen(false)}
      />

      <ConfirmDialog
        isOpen={bulkAddConfirmOpen}
        title={t('admin.stock.bulkAddTitle') || 'Add stock to all'}
        message={
          pendingBulkAddAmount !== null
            ? (t('admin.stock.bulkAddConfirmMessage', { amount: pendingBulkAddAmount }) || `Add ${pendingBulkAddAmount} units to ALL items?`)
            : (t('admin.stock.bulkAddConfirmFallback') || 'Add stock to ALL items?')
        }
        confirmText={t('common.confirm') || 'Confirm'}
        cancelText={t('common.cancel') || 'Cancel'}
        variant="warning"
        onConfirm={() => {
          if (pendingBulkAddAmount === null) return;
          const amount = pendingBulkAddAmount;
          setBulkAddConfirmOpen(false);
          setPendingBulkAddAmount(null);
          performBulkAddStock(amount);
        }}
        onCancel={() => {
          setBulkAddConfirmOpen(false);
          setPendingBulkAddAmount(null);
        }}
      />

      <ConfirmDialog
        isOpen={resetConfirmOpen}
        title={t('admin.stock.resetAllTitle') || 'Reset all to template'}
        message={
          t('admin.stock.resetAllConfirmMessage', { count: pendingResetCount })
            || `Reset ${pendingResetCount} items to their template values?`
        }
        confirmText={t('common.confirm') || 'Confirm'}
        cancelText={t('common.cancel') || 'Cancel'}
        variant="warning"
        onConfirm={() => {
          setResetConfirmOpen(false);
          setPendingResetCount(0);
          performResetAllToTemplate();
        }}
        onCancel={() => {
          setResetConfirmOpen(false);
          setPendingResetCount(0);
        }}
      />

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
        {/* Header */}
        <div className="border-b border-gray-200 bg-gray-50/50 px-6 py-5 dark:border-gray-800 dark:bg-gray-900/50" data-tutorial="stock-overview-header">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t('admin.stock.title')}</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('admin.stock.subtitle')}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2" data-tutorial="stock-quick-actions">
              {/* Quick Actions Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowQuickActions(!showQuickActions)}
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand-500 px-4 text-sm font-medium text-white shadow-lg shadow-brand-500/25 transition-all hover:bg-brand-600"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  {t('admin.stock.quickActions')}
                  <svg className={`h-4 w-4 transition-transform ${showQuickActions ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showQuickActions && (
                  <div className="absolute right-0 z-20 mt-2 w-56 origin-top-right rounded-xl border border-gray-200 bg-white p-2 shadow-xl dark:border-gray-700 dark:bg-gray-900">
                    <p className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400">Add Stock To All</p>
                    {[5, 10, 20, 50].map((amount) => (
                      <button
                        key={amount}
                        onClick={() => { handleBulkAddStock(amount); setShowQuickActions(false); }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                      >
                        <svg className="h-4 w-4 text-success-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add {amount} units
                      </button>
                    ))}
                    <div className="my-2 border-t border-gray-200 dark:border-gray-700" />
                    <button
                      onClick={() => { handleResetAllToTemplate(); setShowQuickActions(false); }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                      <svg className="h-4 w-4 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Reset all to template
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={fetchStockData}
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>

              <button
                onClick={handleExportCSV}
                disabled={filteredItems.length === 0}
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 lg:p-8">
          {/* Error Message */}
          {error && (
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-error-200 bg-error-50 p-4 dark:border-error-800 dark:bg-error-900/20">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-error-100 text-error-600 dark:bg-error-900/30 dark:text-error-400">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-sm font-medium text-error-700 dark:text-error-300">{error}</p>
            </div>
          )}



          {/* Tabs, Filter, and Search */}
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between" data-tutorial="stock-filters">
            {/* Tabs */}
            <div className="inline-flex rounded-xl border border-gray-200 bg-gray-100 p-1 dark:border-gray-700 dark:bg-gray-800" data-tutorial="stock-tabs">
              <button
                onClick={() => { setActiveTab('all'); setActiveFilter('all'); }}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${activeTab === 'all'
                  ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                  }`}
              >
                All Items
                <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs dark:bg-gray-600">{stats.total}</span>
              </button>
              <button
                onClick={() => { setActiveTab('menus'); setActiveFilter('all'); }}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${activeTab === 'menus'
                  ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                  }`}
              >
                Menus
                <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs dark:bg-gray-600">{stats.menus}</span>
              </button>
              <button
                onClick={() => { setActiveTab('addons'); setActiveFilter('all'); }}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${activeTab === 'addons'
                  ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                  }`}
              >
                Add-ons
                <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs dark:bg-gray-600">{stats.addons}</span>
              </button>
            </div>

            {/* Search and Status Filter */}
            <div className="flex flex-wrap gap-3 items-center" data-tutorial="stock-search">
              <div className="relative max-w-md flex-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-12 w-full rounded-xl border border-gray-200 bg-white pl-11 pr-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                />
              </div>
              <select
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value as FilterType)}
                className="h-12 rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              >
                <option value="all">All Status</option>
                <option value="healthy">Healthy ({stats.healthy})</option>
                <option value="low">Low Stock ({stats.lowStock})</option>
                <option value="out">Out of Stock ({stats.outOfStock})</option>
              </select>
            </div>
          </div>

          {/* Stock Items Grid */}
          {filteredItems.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 py-16 text-center dark:border-gray-700 dark:bg-gray-900/50">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-800">
                <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">No items found</p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {searchQuery ? `No results for "${searchQuery}"` : 'Try adjusting your filters'}
              </p>
              {activeFilter !== 'all' && (
                <button
                  onClick={() => setActiveFilter('all')}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
                >
                  Show all items
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" data-tutorial="stock-items-grid">
              {filteredItems.map((item) => (
                <StockStatusCard
                  key={`${item.type}-${item.id}`}
                  {...item}
                  onUpdateStock={handleUpdateStock}
                  onResetToTemplate={handleResetToTemplate}
                  isSelected={selectedItems.some((s) => s.id === item.id && s.type === item.type)}
                  onSelect={handleSelectItem}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bulk Actions */}
      <BulkStockActions
        selectedItems={selectedItems}
        onResetSelected={handleResetSelected}
        onUpdateAll={handleUpdateAll}
        onClearSelection={() => setSelectedItems([])}
      />
    </div>
  );
}
