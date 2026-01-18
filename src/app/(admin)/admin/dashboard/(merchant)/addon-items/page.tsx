"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FaCopy } from "react-icons/fa";
import AddonItemFormModal from "@/components/addon-items/AddonItemFormModal";
import AddonItemsTable from "@/components/addon-items/AddonItemsTable";
import AddonItemsFilters from "@/components/addon-items/AddonItemsFilters";
import { AddonItemsPageSkeleton } from "@/components/common/SkeletonLoaders";
import { useMerchant } from "@/context/MerchantContext";
import { useToast } from "@/context/ToastContext";
import CreateOptionModal from "@/components/common/CreateOptionModal";
import DuplicateAddonItemModal from "@/components/modals/DuplicateAddonItemModal";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { getCurrencySymbol } from "@/lib/utils/format";
import ArchiveModal from "@/components/common/ArchiveModal";
import { exportAddonItemsForBulkUpload } from "@/lib/utils/excelExport";
import { useContextualHint, CONTEXTUAL_HINTS, useClickHereHint, CLICK_HINTS } from "@/lib/tutorial";

interface AddonCategory {
  id: string;
  name: string;
  minSelection: number;
  maxSelection: number | null;
}

interface AddonItem {
  id: string;
  addonCategoryId: string;
  name: string;
  description: string | null;
  price: string | number;
  inputType: "SELECT" | "QTY";
  isActive: boolean;
  trackStock: boolean;
  stockQty: number | null;
  lowStockThreshold?: number | null;
  dailyStockTemplate: number | null;
  autoResetStock: boolean;
  lastStockResetAt: string | null;
  createdAt: string;
  addonCategory?: AddonCategory;
}

interface AddonItemFormData {
  addonCategoryId: string;
  name: string;
  description: string;
  price: string;
  inputType: "SELECT" | "QTY";
  trackStock: boolean;
  stockQty: string;
  lowStockThreshold: string;
  dailyStockTemplate: string;
  autoResetStock: boolean;
}

function AddonItemsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const { merchant: merchantData } = useMerchant();
  const { showSuccess, showError } = useToast();
  const { showHint } = useContextualHint();
  const { showClickHint } = useClickHereHint();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Create option modal state
  const [showCreateOptionModal, setShowCreateOptionModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [authToken, setAuthToken] = useState<string>("");

  const [items, setItems] = useState<AddonItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<AddonItem[]>([]);
  const [categories, setCategories] = useState<AddonCategory[]>([]);
  const merchant = { currency: merchantData?.currency || "AUD" };
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const [formData, setFormData] = useState<AddonItemFormData>({
    addonCategoryId: "",
    name: "",
    description: "",
    price: "0",
    inputType: "SELECT",
    trackStock: false,
    stockQty: "",
    lowStockThreshold: "",
    dailyStockTemplate: "",
    autoResetStock: false,
  });

  const [originalFormData, setOriginalFormData] = useState<AddonItemFormData | null>(null);
  const deepLinkHandledRef = useRef(false);

  // Initialize pagination from URL search params
  const initialPage = parseInt(searchParams.get('page') || '1', 10);

  // Pagination & Filter states
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [itemsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterInputType, setFilterInputType] = useState<string>("all");

  // Update URL when page changes (for persistence)
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (currentPage > 1) {
      params.set('page', currentPage.toString());
    } else {
      params.delete('page');
    }
    const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
    window.history.replaceState(null, '', newUrl);
  }, [currentPage, searchParams]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/admin/login");
        return;
      }
      setAuthToken(token);

      const [itemsResponse, categoriesResponse] = await Promise.all([
        fetch("/api/merchant/addon-items", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/merchant/addon-categories", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!itemsResponse.ok || !categoriesResponse.ok) {
        throw new Error("Failed to fetch data");
      }

      const itemsData = await itemsResponse.json();
      const categoriesData = await categoriesResponse.json();

      if (itemsData.success && Array.isArray(itemsData.data)) {
        setItems(itemsData.data);
      } else {
        setItems([]);
      }

      if (categoriesData.success && Array.isArray(categoriesData.data)) {
        setCategories(categoriesData.data);
      } else {
        setCategories([]);
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Show contextual hint when no addon items exist
  useEffect(() => {
    if (!loading && items.length === 0) {
      showHint(CONTEXTUAL_HINTS.emptyAddons);
      // Show click hint pointing to Add Addon Item button
      setTimeout(() => {
        showClickHint(CLICK_HINTS.addAddonItemButton);
      }, 1000);
    }
  }, [loading, items.length, showHint, showClickHint]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({
        ...prev,
        [name]: checked,
        // Reset stock fields if unchecking trackStock
        ...(name === "trackStock" && !checked
          ? { stockQty: "", lowStockThreshold: "", dailyStockTemplate: "", autoResetStock: false }
          : {}),
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/admin/login");
        return;
      }

      const url = editingId
        ? `/api/merchant/addon-items/${editingId}`
        : "/api/merchant/addon-items";

      const method = editingId ? "PUT" : "POST";

      const payload = {
        addonCategoryId: formData.addonCategoryId,
        name: formData.name,
        description: formData.description || undefined,
        price: parseFloat(formData.price) || 0,
        inputType: formData.inputType,
        trackStock: formData.trackStock,
        stockQty: formData.trackStock && formData.stockQty ? parseInt(formData.stockQty) : undefined,
        lowStockThreshold: formData.trackStock && formData.lowStockThreshold ? parseInt(formData.lowStockThreshold) : undefined,
        dailyStockTemplate: formData.trackStock && formData.dailyStockTemplate ? parseInt(formData.dailyStockTemplate) : undefined,
        autoResetStock: formData.trackStock ? formData.autoResetStock : false,
      };

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Failed to ${editingId ? 'update' : 'create'} addon item`);
      }

      showSuccess(`Addon item ${editingId ? 'updated' : 'created'} successfully!`);
      setShowForm(false);
      setEditingId(null);
      resetForm();

      fetchData();
    } catch (err) {
      showError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      addonCategoryId: "",
      name: "",
      description: "",
      price: "0",
      inputType: "SELECT",
      trackStock: false,
      stockQty: "",
      lowStockThreshold: "",
      dailyStockTemplate: "",
      autoResetStock: false,
    });
  };

  const handleEdit = (item: AddonItem) => {
    const editFormData = {
      addonCategoryId: item.addonCategoryId,
      name: item.name,
      description: item.description || "",
      price: item.price.toString(),
      inputType: item.inputType || "SELECT",
      trackStock: item.trackStock,
      stockQty: item.stockQty !== null ? item.stockQty.toString() : "",
      lowStockThreshold: item.lowStockThreshold !== null && item.lowStockThreshold !== undefined
        ? item.lowStockThreshold.toString()
        : "",
      dailyStockTemplate: item.dailyStockTemplate !== null ? item.dailyStockTemplate.toString() : "",
      autoResetStock: item.autoResetStock,
    };
    setEditingId(item.id);
    setFormData(editFormData);
    setOriginalFormData(editFormData);
    setShowForm(true);
  };

  useEffect(() => {
    if (loading) return;
    if (deepLinkHandledRef.current) return;

    const targetId = searchParams.get("addonItemId");
    if (!targetId) return;

    deepLinkHandledRef.current = true;
    const target = items.find(item => String(item.id) === String(targetId));

    if (target) {
      handleEdit(target);
    } else {
      showError(t("admin.addonItems.notFound"));
    }

    const params = new URLSearchParams(searchParams.toString());
    params.delete("addonItemId");
    const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
    window.history.replaceState(null, "", newUrl);
  }, [items, loading, searchParams, showError, t, handleEdit]);

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/admin/login");
        return;
      }

      const response = await fetch(`/api/merchant/addon-items/${id}/toggle-active`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to toggle status");
      }

      showSuccess(`Addon item ${!currentStatus ? 'activated' : 'deactivated'} successfully!`);
      fetchData();
    } catch (err) {
      showError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    setDeleteTarget({ id, name });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/admin/login");
        return;
      }

      const response = await fetch(`/api/merchant/addon-items/${deleteTarget.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to delete addon item");
      }

      showSuccess("Addon item deleted successfully!");
      fetchData();
    } catch (err) {
      showError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setDeleteTarget(null);
    }
  };

  const _handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    resetForm();
  };

  // Refs to track previous filter values for page reset
  const prevFiltersRef = useRef({ searchQuery, filterCategory, filterStatus, filterInputType });

  // Filter and search logic
  useEffect(() => {
    let filtered = [...items];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Category filter
    if (filterCategory !== "all") {
      filtered = filtered.filter(item => item.addonCategoryId === filterCategory);
    }

    // Status filter
    if (filterStatus === "active") {
      filtered = filtered.filter(item => item.isActive);
    } else if (filterStatus === "inactive") {
      filtered = filtered.filter(item => !item.isActive);
    }

    // Input type filter
    if (filterInputType !== "all") {
      filtered = filtered.filter(item => item.inputType === filterInputType);
    }

    setFilteredItems(filtered);

    // Only reset page when filters actually change, not when items data updates
    const prev = prevFiltersRef.current;
    const filtersChanged =
      prev.searchQuery !== searchQuery ||
      prev.filterCategory !== filterCategory ||
      prev.filterStatus !== filterStatus ||
      prev.filterInputType !== filterInputType;

    if (filtersChanged) {
      setCurrentPage(1);
      prevFiltersRef.current = { searchQuery, filterCategory, filterStatus, filterInputType };
    }
  }, [items, searchQuery, filterCategory, filterStatus, filterInputType]);

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredItems.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  if (loading) {
    return <AddonItemsPageSkeleton />;
  }

  return (
    <div data-tutorial="addon-items-page">
      <div className="space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 lg:p-6" data-tutorial="addon-items-list">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Addon Items</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Manage addon items with SELECT (single choice) or QTY (quantity input) types
              </p>
            </div>
            <div className="flex gap-3" data-tutorial="addon-items-actions">
              <button
                onClick={() => setShowArchiveModal(true)}
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                title={t("common.archiveDescription")}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                {t("common.archive")}
              </button>
              <button
                onClick={() => {
                  try {
                    exportAddonItemsForBulkUpload(items, merchant?.currency || 'AUD');
                    showSuccess('Addon items exported successfully!');
                  } catch (err) {
                    showError(err instanceof Error ? err.message : 'Export failed');
                  }
                }}
                disabled={items.length === 0}
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                title="Export to Excel"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {t("common.export")}
              </button>
              <button
                onClick={() => setShowDuplicateModal(true)}
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <FaCopy className="h-4 w-4" />
                Duplicate
              </button>
              <button
                onClick={() => setShowCreateOptionModal(true)}
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-brand-500 px-6 text-sm font-medium text-white hover:bg-brand-600 focus:outline-none focus:ring-3 focus:ring-brand-500/20"
                data-tutorial="add-addon-item-btn"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {t("admin.addonItems.createItem")}
              </button>
            </div>
          </div>

          {/* Filters Component */}
          <div data-tutorial="addon-item-filter">
            <AddonItemsFilters
              searchQuery={searchQuery}
              filterCategory={filterCategory}
              filterInputType={filterInputType}
              filterStatus={filterStatus}
              categories={categories}
              onSearchChange={setSearchQuery}
              onCategoryChange={setFilterCategory}
              onInputTypeChange={setFilterInputType}
              onStatusChange={setFilterStatus}
            />
          </div>

          {filteredItems.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {items.length === 0 ? t("admin.addonItems.noItems") : t("admin.addonItems.noMatch")}
              </p>
              {items.length === 0 && (
                <button
                  onClick={() => setShowForm(true)}
                  className="mt-4 inline-flex h-11 items-center gap-2 rounded-lg bg-brand-500 px-6 text-sm font-medium text-white hover:bg-brand-600"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  {t("admin.addonItems.createItem")}
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Table Component */}
              <AddonItemsTable
                items={currentItems}
                categories={categories}
                currency={merchant.currency}
                onEdit={handleEdit}
                onToggleActive={handleToggleActive}
                onDelete={handleDelete}
              />

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-5 flex items-center justify-between border-t border-gray-200 pt-5 dark:border-gray-800">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredItems.length)} of {filteredItems.length} items
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => paginate(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => paginate(page)}
                        className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border text-sm font-medium ${currentPage === page
                          ? 'border-brand-500 bg-brand-500 text-white'
                          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                          }`}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      onClick={() => paginate(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Form Modal Component - placed outside main content for proper overlay coverage */}
      <AddonItemFormModal
        show={showForm}
        editingId={editingId}
        formData={formData}
        originalFormData={originalFormData}
        categories={categories}
        submitting={submitting}
        currencySymbol={getCurrencySymbol(merchant.currency)}
        onSubmit={handleSubmit}
        onChange={handleChange}
        onCancel={() => {
          setShowForm(false);
          setEditingId(null);
          setOriginalFormData(null);
          setFormData({
            addonCategoryId: "",
            name: "",
            description: "",
            price: "0",
            inputType: "SELECT",
            trackStock: false,
            stockQty: "",
            lowStockThreshold: "",
            dailyStockTemplate: "",
            autoResetStock: false,
          });
        }}
      />

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-error-100 dark:bg-error-900/30">
              <svg className="h-6 w-6 text-error-600 dark:text-error-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">Delete Addon Item</h3>
            <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
              Are you sure you want to delete <span className="font-medium text-gray-900 dark:text-white">&quot;{deleteTarget.name}&quot;</span>? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="h-11 flex-1 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="h-11 flex-1 rounded-lg bg-error-500 text-sm font-medium text-white hover:bg-error-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Option Modal */}
      <CreateOptionModal
        isOpen={showCreateOptionModal}
        onClose={() => setShowCreateOptionModal(false)}
        title="Add Addon Item"
        description="Choose how you want to add addon items"
        singleCreateLabel="Create Single Item"
        bulkUploadLabel="Bulk Upload from Excel"
        onSingleCreate={() => setShowForm(true)}
        onBulkUpload={() => router.push('/admin/dashboard/addon-items/bulk-upload')}
      />

      {/* Duplicate Addon Item Modal */}
      <DuplicateAddonItemModal
        isOpen={showDuplicateModal}
        onClose={() => setShowDuplicateModal(false)}
        onSelect={(item) => {
          // Auto-fill form with selected item's data
          setFormData({
            addonCategoryId: item.addonCategoryId,
            name: item.name + " (Copy)",
            description: item.description || "",
            price: typeof item.price === "number" ? item.price.toString() : item.price,
            inputType: item.inputType,
            trackStock: item.trackStock,
            stockQty: item.stockQty?.toString() || "",
            lowStockThreshold: item.lowStockThreshold?.toString() || "",
            dailyStockTemplate: item.dailyStockTemplate?.toString() || "",
            autoResetStock: item.autoResetStock,
          });
          setEditingId(null);
          setShowDuplicateModal(false);
          setShowForm(true);
        }}
        token={authToken}
        categories={categories}
      />

      {/* Archive Modal */}
      <ArchiveModal
        isOpen={showArchiveModal}
        onClose={() => setShowArchiveModal(false)}
        onRestoreSuccess={() => {
          fetchData();
          showSuccess('Item restored successfully!');
        }}
      />
    </div>
  );
}

// Export with Suspense wrapper for useSearchParams
export default function AddonItemsPage() {
  return (
    <Suspense fallback={<AddonItemsPageSkeleton />}>
      <AddonItemsPageContent />
    </Suspense>
  );
}
