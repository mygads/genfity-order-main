'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageBreadcrumb from '@/components/common/PageBreadCrumb';
import StockStatusCard from '@/components/menu/StockStatusCard';
import BulkStockActions from '@/components/menu/BulkStockActions';

/**
 * Stock Management Dashboard Page
 * 
 * Professional centralized stock overview with:
 * - Real-time stock status monitoring
 * - Clean minimal design
 * - Advanced filtering and search
 * - Bulk operations
 * - Export capabilities
 * 
 * Goal: Reduce daily stock management from 20 minutes to <10 minutes
 */

interface StockItem {
  id: number | string; // Can be string due to BigInt serialization
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

  // Fetch stock data from API
  useEffect(() => {
    fetchStockData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply filters and search
  useEffect(() => {
    let filtered = [...stockItems];

    // Apply tab filter first
    if (activeTab === 'menus') {
      filtered = filtered.filter((item) => item.type === 'menu');
    } else if (activeTab === 'addons') {
      filtered = filtered.filter((item) => item.type === 'addon');
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.categoryName?.toLowerCase().includes(query)
      );
    }

    // Apply status filter
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
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch stock data');
      }

      const result = await response.json();

      if (result.success) {
        setStockItems(result.data.items);
        setStats(result.data.stats);
      } else {
        throw new Error(result.message || 'Failed to load stock data');
      }
    } catch (err) {
      console.error('Error fetching stock data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load stock data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStock = async (id: number | string, type: 'menu' | 'addon', newQty: number) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/admin/login');
        return;
      }

      const response = await fetch('/api/merchant/menu/stock/bulk-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          updates: [{ type, id: typeof id === 'string' ? parseInt(id) : id, stockQty: newQty }],
        }),
      });

      if (!response.ok) throw new Error('Failed to update stock');

      // Update local state
      setStockItems((prev) =>
        prev.map((item) =>
          item.id === id && item.type === type
            ? { ...item, stockQty: newQty }
            : item
        )
      );

      // Recalculate stats
      await fetchStockData();
    } catch (error) {
      console.error('Error updating stock:', error);
      alert('Failed to update stock');
    }
  };

  const handleResetToTemplate = async (id: number | string, type: 'menu' | 'addon') => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/admin/login');
        return;
      }

      const response = await fetch('/api/merchant/menu/stock/bulk-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          updates: [{ type, id: typeof id === 'string' ? parseInt(id) : id, resetToTemplate: true }],
        }),
      });

      if (!response.ok) throw new Error('Failed to reset stock');

      // Refresh data
      await fetchStockData();
    } catch (error) {
      console.error('Error resetting stock:', error);
      alert('Failed to reset stock');
    }
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

  const handleResetSelected = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/admin/login');
        return;
      }

      const updates = selectedItems.map((item) => ({
        type: item.type,
        id: typeof item.id === 'string' ? parseInt(item.id) : item.id,
        resetToTemplate: true,
      }));

      const response = await fetch('/api/merchant/menu/stock/bulk-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ updates }),
      });

      if (!response.ok) throw new Error('Failed to reset stock');

      // Refresh data
      setSelectedItems([]);
      await fetchStockData();
    } catch (error) {
      console.error('Error resetting selected:', error);
      alert('Failed to reset stock');
    }
  };

  const handleUpdateAll = async (quantity: number) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/admin/login');
        return;
      }

      const updates = selectedItems.map((item) => ({
        type: item.type,
        id: typeof item.id === 'string' ? parseInt(item.id) : item.id,
        stockQty: quantity,
      }));

      const response = await fetch('/api/merchant/menu/stock/bulk-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ updates }),
      });

      if (!response.ok) throw new Error('Failed to update stock');

      // Refresh data
      setSelectedItems([]);
      await fetchStockData();
    } catch (error) {
      console.error('Error updating all:', error);
      alert('Failed to update stock');
    }
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
        item.isActive ? 'Active' : 'Inactive',
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

  const handleBulkAddStock = async (amount: number) => {
    if (!confirm(`Add ${amount} units to ALL items?`)) return;

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/admin/login');
        return;
      }

      const updates = stockItems.map((item) => ({
        id: typeof item.id === 'string' ? parseInt(item.id) : item.id,
        type: item.type,
        stockQty: (item.stockQty ?? 0) + amount,
      }));

      const response = await fetch('/api/merchant/menu/stock/bulk-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ updates }),
      });

      if (!response.ok) throw new Error('Failed to add stock');

      await fetchStockData();
      alert(`Successfully added ${amount} units to all items`);
    } catch (error) {
      console.error('Error adding stock:', error);
      alert('Failed to add stock');
    }
  };

  const handleResetAllToTemplate = async () => {
    const itemsWithTemplate = stockItems.filter(item => item.dailyStockTemplate !== null);
    
    if (itemsWithTemplate.length === 0) {
      alert('No items have a daily stock template set');
      return;
    }

    if (!confirm(`Reset ${itemsWithTemplate.length} items to their template values?`)) return;

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/admin/login');
        return;
      }

      const updates = itemsWithTemplate.map((item) => ({
        id: typeof item.id === 'string' ? parseInt(item.id) : item.id,
        type: item.type,
        resetToTemplate: true,
      }));

      const response = await fetch('/api/merchant/menu/stock/bulk-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ updates }),
      });

      if (!response.ok) throw new Error('Failed to reset stock');

      await fetchStockData();
      alert(`Successfully reset ${itemsWithTemplate.length} items to template values`);
    } catch (error) {
      console.error('Error resetting stock:', error);
      alert('Failed to reset stock');
    }
  };

  if (isLoading) {
    return (
      <div>
        <PageBreadcrumb pageTitle="Stock Management" />
        <div className="flex items-center justify-center py-20">
          <div className="flex items-center gap-3 text-gray-500">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent"></div>
            Loading stock data...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Stock Management" />

      {/* Header Section - Clean & Professional */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
            Stock Overview
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Monitor and manage inventory for menu items and add-ons
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Quick Actions Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowQuickActions(!showQuickActions)}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-gray-900 px-4 text-sm font-medium text-white shadow-sm transition-all hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Quick Actions
              <svg className={`h-4 w-4 transition-transform ${showQuickActions ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {showQuickActions && (
              <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-800 dark:bg-gray-900 z-10">
                <div className="p-1">
                  <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                    Add Stock
                  </div>
                  <button
                    onClick={() => {
                      handleBulkAddStock(5);
                      setShowQuickActions(false);
                    }}
                    className="w-full rounded-md px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    Add 5 units to all
                  </button>
                  <button
                    onClick={() => {
                      handleBulkAddStock(10);
                      setShowQuickActions(false);
                    }}
                    className="w-full rounded-md px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    Add 10 units to all
                  </button>
                  <button
                    onClick={() => {
                      handleBulkAddStock(20);
                      setShowQuickActions(false);
                    }}
                    className="w-full rounded-md px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    Add 20 units to all
                  </button>
                  <button
                    onClick={() => {
                      handleBulkAddStock(50);
                      setShowQuickActions(false);
                    }}
                    className="w-full rounded-md px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    Add 50 units to all
                  </button>
                  
                  <div className="my-1 border-t border-gray-200 dark:border-gray-800"></div>
                  
                  <button
                    onClick={() => {
                      handleResetAllToTemplate();
                      setShowQuickActions(false);
                    }}
                    className="w-full rounded-md px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    <div className="flex items-center gap-2">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Reset all to template
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={fetchStockData}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>

          <button
            onClick={handleExportCSV}
            disabled={filteredItems.length === 0}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-900/10">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Tab Navigation - Clean Segmented Control */}
      <div className="border-b border-gray-200 dark:border-gray-800">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => {
              setActiveTab('all');
              setActiveFilter('all');
            }}
            className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
              activeTab === 'all'
                ? 'border-gray-900 text-gray-900 dark:border-white dark:text-white'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-300'
            }`}
          >
            All Items
            <span className="ml-2 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
              {stats.total}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab('menus');
              setActiveFilter('all');
            }}
            className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
              activeTab === 'menus'
                ? 'border-gray-900 text-gray-900 dark:border-white dark:text-white'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-300'
            }`}
          >
            Menu Items
            <span className="ml-2 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
              {stats.menus}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab('addons');
              setActiveFilter('all');
            }}
            className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
              activeTab === 'addons'
                ? 'border-gray-900 text-gray-900 dark:border-white dark:text-white'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-300'
            }`}
          >
            Add-ons
            <span className="ml-2 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
              {stats.addons}
            </span>
          </button>
        </nav>
      </div>

      {/* Stats Cards - Clean & Minimal */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Healthy Stock</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">{stats.healthy}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
              <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">&gt; 5 units</p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Low Stock</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">{stats.lowStock}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/20">
              <svg className="h-6 w-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">1-5 units</p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Out of Stock</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">{stats.outOfStock}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
              <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">0 units</p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Auto Reset</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">{stats.withTemplate}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20">
              <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">Daily reset enabled</p>
        </div>
      </div>

      {/* Search and Filter - Clean Layout */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block h-10 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-500 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-400 dark:focus:border-white dark:focus:ring-white"
            />
          </div>
        </div>

        <div className="inline-flex rounded-lg border border-gray-300 bg-white p-1 dark:border-gray-700 dark:bg-gray-800">
          <button
            onClick={() => setActiveFilter('all')}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              activeFilter === 'all'
                ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                : 'text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setActiveFilter('healthy')}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              activeFilter === 'healthy'
                ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                : 'text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
            }`}
          >
            Healthy
          </button>
          <button
            onClick={() => setActiveFilter('low')}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              activeFilter === 'low'
                ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                : 'text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
            }`}
          >
            Low
          </button>
          <button
            onClick={() => setActiveFilter('out')}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              activeFilter === 'out'
                ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                : 'text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
            }`}
          >
            Out
          </button>
        </div>
      </div>

      {/* Stock Items Grid */}
      {filteredItems.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center dark:border-gray-800 dark:bg-gray-900">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <p className="mt-4 text-sm font-medium text-gray-900 dark:text-white">No items found</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {searchQuery
              ? `No results matching "${searchQuery}"`
              : 'Try adjusting your filters'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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

