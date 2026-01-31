/**
 * Bulk Operations Page
 * Route: /admin/dashboard/menu/bulk-operations
 * 
 * Features:
 * - Select multiple menu items
 * - Batch update prices (fixed or percentage)
 * - Batch update stock
 * - Batch update status
 * - Batch delete
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useToast } from '@/context/ToastContext';
import PageBreadcrumb from '@/components/common/PageBreadCrumb';
import { StatusToggle } from '@/components/common/StatusToggle';
import { fetchMerchantApi } from '@/lib/utils/orderApiClient';

interface MenuItem {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
  isActive: boolean;
  stockQty: number | null;
  trackStock: boolean;
  categories: Array<{ id: string; name: string }>;
}

interface Category {
  id: string;
  name: string;
}

type BulkOperation = 
  | 'UPDATE_PRICE'
  | 'UPDATE_PRICE_PERCENT'
  | 'SET_STOCK'
  | 'UPDATE_STOCK'
  | 'UPDATE_STATUS'
  | 'DELETE';

export default function BulkOperationsPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();

  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Operation state
  const [operation, setOperation] = useState<BulkOperation | ''>('');
  const [operationValue, setOperationValue] = useState<string>('');
  const [priceRounding, setPriceRounding] = useState<number>(0);

  // Fetch menu data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/admin/login');
        return;
      }

      const [menusRes, categoriesRes] = await Promise.all([
        fetchMerchantApi('/api/merchant/menu', { token }),
        fetchMerchantApi('/api/merchant/categories', { token }),
      ]);

      if (menusRes.ok) {
        const data = await menusRes.json();
        if (data.success) {
          setMenus(data.data || []);
        }
      }

      if (categoriesRes.ok) {
        const data = await categoriesRes.json();
        if (data.success) {
          setCategories(data.data || []);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      showError('Error', 'Failed to load menu data');
    } finally {
      setIsLoading(false);
    }
  }, [router, showError]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter menus
  const filteredMenus = menus.filter(menu => {
    const matchesSearch = !searchQuery || 
      menu.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = !categoryFilter ||
      menu.categories.some(c => c.id === categoryFilter);
    
    const matchesStatus = !statusFilter ||
      (statusFilter === 'active' && menu.isActive) ||
      (statusFilter === 'inactive' && !menu.isActive);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Handle select all
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredMenus.map(m => m.id));
    }
    setSelectAll(!selectAll);
  };

  // Handle individual selection
  const handleSelect = (id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(i => i !== id);
      }
      return [...prev, id];
    });
  };

  // Execute bulk operation
  const executeBulkOperation = async () => {
    if (!operation || selectedIds.length === 0) {
      showError('Error', 'Please select items and an operation');
      return;
    }

    // Validate operation value
    if (operation !== 'DELETE') {
      if (!operationValue) {
        showError('Error', 'Please enter a value');
        return;
      }
    }

    setIsProcessing(true);
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/admin/login');
        return;
      }

      let value: number | boolean | undefined;
      const options: { roundTo?: number } = {};

      switch (operation) {
        case 'UPDATE_PRICE':
        case 'UPDATE_PRICE_PERCENT':
        case 'SET_STOCK':
        case 'UPDATE_STOCK':
          value = parseFloat(operationValue);
          if (isNaN(value)) {
            showError('Error', 'Invalid number value');
            return;
          }
          if (priceRounding > 0) {
            options.roundTo = priceRounding;
          }
          break;
        case 'UPDATE_STATUS':
          value = operationValue === 'active';
          break;
      }

      const response = await fetchMerchantApi('/api/merchant/bulk/menu', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation,
          menuIds: selectedIds,
          value,
          options,
        }),
        token,
      });

      const data = await response.json();

      if (data.success) {
        showSuccess('Success', data.message || `Updated ${data.data.affected} items`);
        setSelectedIds([]);
        setSelectAll(false);
        setOperation('');
        setOperationValue('');
        fetchData(); // Refresh data
      } else {
        showError('Error', data.message || 'Operation failed');
      }
    } catch (error) {
      console.error('Bulk operation error:', error);
      showError('Error', 'Failed to execute operation');
    } finally {
      setIsProcessing(false);
    }
  };

  // Format price
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
    }).format(price);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-100">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
      </div>
    );
  }

  return (
    <div>
      <PageBreadcrumb
        customItems={[
          { name: t('admin.menu.title'), path: '/admin/dashboard/menu' },
          { name: 'Bulk Operations' },
        ]}
      />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Bulk Operations
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Select multiple menu items and apply batch updates
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-4">
        <div className="flex flex-wrap gap-4">
          {/* Search */}
          <div className="flex-1 min-w-50">
            <input
              type="text"
              placeholder="Search menu items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Status</option>
            <option value="active">{t('common.active')}</option>
            <option value="inactive">{t('common.inactive')}</option>
          </select>
        </div>
      </div>

      {/* Selection Info & Operations */}
      {selectedIds.length > 0 && (
        <div className="bg-brand-50 dark:bg-brand-900/20 rounded-lg border border-brand-200 dark:border-brand-700 p-4 mb-4">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm font-medium text-brand-700 dark:text-brand-300">
              {selectedIds.length} item(s) selected
            </span>

            {/* Operation Select */}
            <select
              value={operation}
              onChange={(e) => {
                setOperation(e.target.value as BulkOperation);
                setOperationValue('');
              }}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Select Operation</option>
              <option value="UPDATE_PRICE">Set Price</option>
              <option value="UPDATE_PRICE_PERCENT">Adjust Price (%)</option>
              <option value="SET_STOCK">Set Stock</option>
              <option value="UPDATE_STOCK">Adjust Stock (+/-)</option>
              <option value="UPDATE_STATUS">Change Status</option>
              <option value="DELETE">Delete</option>
            </select>

            {/* Operation Value Input */}
            {operation && operation !== 'DELETE' && (
              <>
                {operation === 'UPDATE_STATUS' ? (
                  <select
                    value={operationValue}
                    onChange={(e) => setOperationValue(e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Select Status</option>
                    <option value="active">{t('common.active')}</option>
                    <option value="inactive">{t('common.inactive')}</option>
                  </select>
                ) : (
                  <input
                    type="number"
                    placeholder={
                      operation === 'UPDATE_PRICE' ? 'New price' :
                      operation === 'UPDATE_PRICE_PERCENT' ? 'Percent (e.g. 10 or -10)' :
                      operation === 'SET_STOCK' ? 'New stock' :
                      'Amount (+/-)'
                    }
                    value={operationValue}
                    onChange={(e) => setOperationValue(e.target.value)}
                    className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                )}

                {/* Price Rounding (for price operations) */}
                {(operation === 'UPDATE_PRICE' || operation === 'UPDATE_PRICE_PERCENT') && (
                  <select
                    value={priceRounding}
                    onChange={(e) => setPriceRounding(parseInt(e.target.value))}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value={0}>No rounding</option>
                    <option value={0.5}>Round to $0.50</option>
                    <option value={1}>Round to $1.00</option>
                    <option value={5}>Round to $5.00</option>
                  </select>
                )}
              </>
            )}

            {/* Execute Button */}
            <button
              onClick={executeBulkOperation}
              disabled={isProcessing || !operation}
              className={`px-4 py-2 rounded-lg text-sm font-medium text-white
                        ${operation === 'DELETE' 
                          ? 'bg-red-500 hover:bg-red-600' 
                          : 'bg-brand-500 hover:bg-brand-600'}
                        disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isProcessing ? 'Processing...' : 
               operation === 'DELETE' ? 'Delete Selected' : 'Apply Changes'}
            </button>

            {/* Clear Selection */}
            <button
              onClick={() => {
                setSelectedIds([]);
                setSelectAll(false);
              }}
              className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Menu Items Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                    />
                    <span className="text-xs font-medium text-gray-500 uppercase">Select All</span>
                  </label>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Item
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Category
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Price
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Stock
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredMenus.map((menu) => (
                <tr
                  key={menu.id}
                  className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                    selectedIds.includes(menu.id) ? 'bg-brand-50 dark:bg-brand-900/20' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(menu.id)}
                      onChange={() => handleSelect(menu.id)}
                      className="w-4 h-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 overflow-hidden shrink-0">
                        {menu.imageUrl ? (
                          <Image
                            src={menu.imageUrl}
                            alt={menu.name}
                            width={40}
                            height={40}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            🍽️
                          </div>
                        )}
                      </div>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {menu.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {menu.categories.map(c => c.name).join(', ') || '-'}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-gray-900 dark:text-white">
                    {formatPrice(menu.price)}
                  </td>
                  <td className="px-4 py-3 text-center text-sm">
                    {menu.trackStock ? (
                      <span className={`${
                        (menu.stockQty ?? 0) === 0 ? 'text-red-500' :
                        (menu.stockQty ?? 0) <= 5 ? 'text-yellow-500' :
                        'text-gray-600 dark:text-gray-400'
                      }`}>
                        {menu.stockQty ?? 0}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusToggle
                      isActive={menu.isActive}
                      onToggle={() => {}}
                      disabled
                      size="sm"
                      activeLabel={t('common.active')}
                      inactiveLabel={t('common.inactive')}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredMenus.length === 0 && (
          <div className="px-4 py-8 text-center text-gray-500">
            No menu items found
          </div>
        )}
      </div>
    </div>
  );
}
