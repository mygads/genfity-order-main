"use client";

import React, { useState, useEffect, useCallback } from "react";
import { FaTrashRestore, FaTimes, FaCalendarAlt, FaBox, FaTag, FaLayerGroup, FaPuzzlePiece, FaClock, FaInfoCircle, FaTrashAlt } from "react-icons/fa";
import { useTranslation } from "@/lib/i18n/useTranslation";

interface DeletedItem {
  id: string;
  name: string;
  deletedAt: string;
  daysUntilPermanentDelete: number;
  type?: string;
  imageUrl?: string | null;
  description?: string | null;
}

interface DeletedItemsData {
  menus?: DeletedItem[];
  categories?: DeletedItem[];
  addonCategories?: DeletedItem[];
  addonItems?: DeletedItem[];
  summary?: {
    menus: number;
    categories: number;
    addonCategories: number;
    addonItems: number;
    total: number;
  };
  retentionPolicy?: {
    days: number;
    message: string;
  };
}

interface ArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Filter by type: 'all' | 'menus' | 'categories' | 'addon-categories' | 'addon-items' */
  filterType?: 'all' | 'menus' | 'categories' | 'addon-categories' | 'addon-items';
  onRestoreSuccess?: () => void;
}

type TabType = 'menus' | 'categories' | 'addon-categories' | 'addon-items';

export default function ArchiveModal({ 
  isOpen, 
  onClose, 
  filterType = 'all',
  onRestoreSuccess 
}: ArchiveModalProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ show: boolean; item: DeletedItem | null; type: TabType | null }>({ show: false, item: null, type: null });
  const [data, setData] = useState<DeletedItemsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('menus');

  // Fetch deleted items
  const fetchDeletedItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem("accessToken");
      if (!token) {
        setError("Not authenticated");
        return;
      }

      const typeParam = filterType !== 'all' ? `?type=${filterType}` : '';
      const response = await fetch(`/api/merchant/deleted-items${typeParam}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch deleted items");
      }

      const result = await response.json();
      if (result.success) {
        setData(result.data);
        
        // Set initial active tab based on data or filter type
        if (filterType !== 'all') {
          setActiveTab(filterType as TabType);
        } else if (result.data.summary) {
          // Find first tab with items
          if (result.data.summary.menus > 0) setActiveTab('menus');
          else if (result.data.summary.categories > 0) setActiveTab('categories');
          else if (result.data.summary.addonCategories > 0) setActiveTab('addon-categories');
          else if (result.data.summary.addonItems > 0) setActiveTab('addon-items');
        }
      } else {
        setError(result.message || "Failed to fetch deleted items");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  useEffect(() => {
    if (isOpen) {
      fetchDeletedItems();
    }
  }, [isOpen, fetchDeletedItems]);

  // Restore item
  const handleRestore = async (item: DeletedItem, type: TabType) => {
    try {
      setRestoring(item.id);
      
      const token = localStorage.getItem("accessToken");
      if (!token) {
        throw new Error("Not authenticated");
      }

      // Determine API endpoint based on type
      let endpoint = '';
      switch (type) {
        case 'menus':
          endpoint = `/api/merchant/menu/${item.id}/restore`;
          break;
        case 'categories':
          endpoint = `/api/merchant/categories/${item.id}/restore`;
          break;
        case 'addon-categories':
          endpoint = `/api/merchant/addon-categories/${item.id}/restore`;
          break;
        case 'addon-items':
          endpoint = `/api/merchant/addon-items/${item.id}/restore`;
          break;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || "Failed to restore item");
      }

      // Refresh the list
      await fetchDeletedItems();
      
      // Call success callback
      onRestoreSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to restore item");
    } finally {
      setRestoring(null);
    }
  };

  // Permanently delete item
  const handlePermanentDelete = async (item: DeletedItem, type: TabType) => {
    try {
      setDeleting(item.id);
      setConfirmDelete({ show: false, item: null, type: null });
      
      const token = localStorage.getItem("accessToken");
      if (!token) {
        throw new Error("Not authenticated");
      }

      // Determine API endpoint based on type
      let endpoint = '';
      switch (type) {
        case 'menus':
          endpoint = `/api/merchant/menu/${item.id}/permanent-delete`;
          break;
        case 'categories':
          endpoint = `/api/merchant/categories/${item.id}/permanent-delete`;
          break;
        case 'addon-categories':
          endpoint = `/api/merchant/addon-categories/${item.id}/permanent-delete`;
          break;
        case 'addon-items':
          endpoint = `/api/merchant/addon-items/${item.id}/permanent-delete`;
          break;
      }

      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || "Failed to delete item permanently");
      }

      // Refresh the list
      await fetchDeletedItems();
      
      // Call success callback
      onRestoreSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete item permanently");
    } finally {
      setDeleting(null);
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get tab icon
  const getTabIcon = (tab: TabType) => {
    switch (tab) {
      case 'menus': return <FaBox className="h-4 w-4" />;
      case 'categories': return <FaTag className="h-4 w-4" />;
      case 'addon-categories': return <FaLayerGroup className="h-4 w-4" />;
      case 'addon-items': return <FaPuzzlePiece className="h-4 w-4" />;
    }
  };

  // Get tab label
  const getTabLabel = (tab: TabType) => {
    switch (tab) {
      case 'menus': return 'Menu Items';
      case 'categories': return 'Categories';
      case 'addon-categories': return 'Addon Categories';
      case 'addon-items': return 'Addon Items';
    }
  };

  // Get items for current tab
  const getCurrentItems = (): DeletedItem[] => {
    if (!data) return [];
    switch (activeTab) {
      case 'menus': return data.menus || [];
      case 'categories': return data.categories || [];
      case 'addon-categories': return data.addonCategories || [];
      case 'addon-items': return data.addonItems || [];
    }
  };

  // Get count for tab
  const getTabCount = (tab: TabType): number => {
    if (!data?.summary) return 0;
    switch (tab) {
      case 'menus': return data.summary.menus;
      case 'categories': return data.summary.categories;
      case 'addon-categories': return data.summary.addonCategories;
      case 'addon-items': return data.summary.addonItems;
    }
  };

  // Check if should show tabs
  const shouldShowTabs = filterType === 'all';

  if (!isOpen) return null;

  const currentItems = getCurrentItems();

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
        <div className="w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-gray-900">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                <FaTrashRestore className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {t("common.archive") || "Archive"}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t("common.archiveDescription") || "View and restore deleted items"}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
            >
              <FaTimes className="h-5 w-5" />
            </button>
          </div>

          {/* Cleanup Status Indicator */}
          {data?.retentionPolicy && (
            <div className="mx-6 mt-4 flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 dark:border-gray-800 dark:bg-gray-900/20">
              <FaClock className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-300">
                  Auto-cleanup Schedule
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {data.retentionPolicy.message}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <FaInfoCircle className="h-3.5 w-3.5 text-gray-500" />
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  {data.retentionPolicy.days} days retention
                </span>
              </div>
            </div>
          )}

        {/* Tabs (only show when filterType is 'all') */}
        {shouldShowTabs && (
          <div className="border-b border-gray-200 px-6 dark:border-gray-700">
            <nav className="-mb-px flex gap-4 overflow-x-auto">
              {(['menus', 'categories', 'addon-categories', 'addon-items'] as TabType[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex items-center gap-2 whitespace-nowrap border-b-2 py-3 text-sm font-medium transition-colors ${
                    activeTab === tab
                      ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  {getTabIcon(tab)}
                  <span>{getTabLabel(tab)}</span>
                  {getTabCount(tab) > 0 && (
                    <span className={`ml-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                      activeTab === tab
                        ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                    }`}>
                      {getTabCount(tab)}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        )}

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent"></div>
              <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Loading archived items...</p>
            </div>
          ) : error ? (
            <div className="rounded-lg bg-error-50 p-4 text-center text-error-700 dark:bg-error-900/20 dark:text-error-400">
              {error}
            </div>
          ) : currentItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                <FaTrashRestore className="h-8 w-8 text-gray-400" />
              </div>
              <p className="mt-4 text-sm font-medium text-gray-900 dark:text-white">No archived items</p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Deleted items will appear here for 30 days before permanent removal
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {currentItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-4 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800/50 dark:hover:bg-gray-800"
                >
                  <div className="flex items-center gap-4">
                    {/* Image (for menus) */}
                    {activeTab === 'menus' && item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="h-12 w-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-200 dark:bg-gray-700">
                        {getTabIcon(activeTab)}
                      </div>
                    )}
                    
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">{item.name}</h4>
                      {item.description && (
                        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
                          {item.description}
                        </p>
                      )}
                      <div className="mt-1 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <FaCalendarAlt className="h-3 w-3" />
                          Deleted {formatDate(item.deletedAt)}
                        </span>
                        <span className={`font-medium ${
                          item.daysUntilPermanentDelete <= 7 
                            ? 'text-error-600 dark:text-error-400' 
                            : 'text-amber-600 dark:text-amber-400'
                        }`}>
                          {item.daysUntilPermanentDelete} days left
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Permanent Delete Button */}
                    <button
                      onClick={() => setConfirmDelete({ show: true, item, type: activeTab })}
                      disabled={deleting === item.id || restoring === item.id}
                      className="flex items-center gap-2 rounded-lg border border-error-300 bg-white px-3 py-2 text-sm font-medium text-error-600 hover:bg-error-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-error-700 dark:bg-gray-800 dark:text-error-400 dark:hover:bg-error-900/20"
                      title="Delete permanently"
                    >
                      {deleting === item.id ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-error-500 border-t-transparent"></div>
                      ) : (
                        <FaTrashAlt className="h-4 w-4" />
                      )}
                    </button>

                    {/* Restore Button */}
                    <button
                      onClick={() => handleRestore(item, activeTab)}
                      disabled={restoring === item.id || deleting === item.id}
                      className="flex items-center gap-2 rounded-lg bg-primary-500 px-3 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
                      title="Restore item"
                    >
                      {restoring === item.id ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      ) : (
                        <FaTrashRestore className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {data?.summary?.total || 0} items in archive
            </p>
            <button
              onClick={onClose}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              {t("common.close") || "Close"}
            </button>
          </div>
        </div>
      </div>

      {/* Permanent Delete Confirmation Modal */}
      {confirmDelete.show && confirmDelete.item && confirmDelete.type && (
        <>
          <div className="fixed inset-0 z-[300] bg-black/50 backdrop-blur-sm" onClick={() => setConfirmDelete({ show: false, item: null, type: null })} />
          <div className="fixed inset-0 z-[350] flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-error-100 dark:bg-error-900/30">
                <FaTrashAlt className="h-6 w-6 text-error-600 dark:text-error-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Delete Permanently?
              </h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Are you sure you want to permanently delete <strong className="text-gray-900 dark:text-white">{confirmDelete.item.name}</strong>? 
                This action cannot be undone and the item will be removed forever.
              </p>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setConfirmDelete({ show: false, item: null, type: null })}
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handlePermanentDelete(confirmDelete.item!, confirmDelete.type!)}
                  className="flex-1 rounded-lg bg-error-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-error-700"
                >
                  Delete Forever
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
