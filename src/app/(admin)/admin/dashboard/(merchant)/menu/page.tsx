"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Image from "next/image";

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: string | number;
  promoPrice: string | number | null;
  promoStartDate: string | null;
  promoEndDate: string | null;
  imageUrl: string | null;
  categoryId: string;
  category?: {
    id: string;
    name: string;
  };
  categories?: Array<{
    id: string;
    menuId: string;
    categoryId: string;
    category: {
      id: string;
      name: string;
    };
  }>;
  isActive: boolean;
  isPromo: boolean;
  trackStock: boolean;
  stockQty: number | null;
  dailyStockTemplate: number | null;
  autoResetStock: boolean;
  createdAt: string;
}

interface Category {
  id: string;
  name: string;
}

interface Merchant {
  id: string;
  name: string;
  currency: string;
}

export default function MerchantMenuPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [filteredMenuItems, setFilteredMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [selectedPromoMenu, setSelectedPromoMenu] = useState<MenuItem | null>(null);
  const [selectedStockMenu, setSelectedStockMenu] = useState<MenuItem | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  // Pagination & Filter states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/admin/login");
        return;
      }

      const [menuResponse, categoriesResponse, merchantResponse] = await Promise.all([
        fetch("/api/merchant/menu", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/merchant/categories", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/merchant/profile", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!menuResponse.ok || !categoriesResponse.ok) {
        throw new Error("Failed to fetch data");
      }

      const menuData = await menuResponse.json();
      const categoriesData = await categoriesResponse.json();
      const merchantData = await merchantResponse.json();
      console.log('Merchant data:', merchantData);

      // Handle response format: { success: true, data: [...] }
      if (menuData.success && Array.isArray(menuData.data)) {
        setMenuItems(menuData.data);
      } else {
        setMenuItems([]);
      }
      
      if (categoriesData.success && Array.isArray(categoriesData.data)) {
        setCategories(categoriesData.data);
      } else {
        setCategories([]);
      }

      if (merchantData.success && merchantData.data) {
        setMerchant(merchantData.data);
      }
    } catch (err) {
      console.error("Fetch menu data error:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) {
      return;
    }

    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/admin/login");
        return;
      }

      const response = await fetch(`/api/merchant/menu/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to delete menu item");
      }

      setSuccess("Menu item deleted successfully!");
      setTimeout(() => setSuccess(null), 3000);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean, name: string) => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/admin/login");
        return;
      }

      const response = await fetch(`/api/merchant/menu/${id}/toggle-active`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to toggle menu status");
      }

      setSuccess(`Menu "${name}" ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      setTimeout(() => setSuccess(null), 3000);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleOutOfStock = async (id: string, name: string) => {
    if (!confirm(`Set "${name}" as out of stock (stock = 0)?`)) {
      return;
    }

    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/admin/login");
        return;
      }

      const response = await fetch(`/api/merchant/menu/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ stockQty: 0 }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to update stock");
      }

      setSuccess(`Menu "${name}" marked as out of stock`);
      setTimeout(() => setSuccess(null), 3000);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setTimeout(() => setError(null), 5000);
    }
  };

  const formatPrice = (price: string | number, currency?: string): string => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(numPrice)) return `${currency || 'AUD'} 0`;
    
    const curr = currency || merchant?.currency || 'AUD';
    const symbol = curr === 'IDR' ? 'Rp' : curr === 'AUD' ? 'A$' : curr;
    const locale = curr === 'IDR' ? 'id-ID' : 'en-AU';
    
    return `${symbol} ${numPrice.toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  const getCategoryNames = (item: MenuItem): string => {
    // First check many-to-many categories
    if (item.categories && item.categories.length > 0) {
      return item.categories.map(c => c.category.name).join(', ');
    }
    // Fallback to single category for backward compatibility
    if (item.category?.name) return item.category.name;
    const category = categories.find(c => c.id === item.categoryId);
    return category?.name || 'Uncategorized';
  };

  // Filter and search logic
  useEffect(() => {
    let filtered = [...menuItems];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Category filter
    if (filterCategory !== "all") {
      filtered = filtered.filter(item => {
        if (item.categories && item.categories.length > 0) {
          return item.categories.some(c => c.categoryId === filterCategory);
        }
        return item.categoryId === filterCategory;
      });
    }

    // Status filter - don't filter by default, only when explicitly selected
    if (filterStatus === "active") {
      filtered = filtered.filter(item => item.isActive);
    } else if (filterStatus === "inactive") {
      filtered = filtered.filter(item => !item.isActive);
    }
    // if "all", don't filter - show everything

    setFilteredMenuItems(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [menuItems, searchQuery, filterCategory, filterStatus]);

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredMenuItems.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredMenuItems.length / itemsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  if (loading) {
    return (
      <div>
        <PageBreadcrumb pageTitle="Menu Items" />
        <div className="mt-6 py-10 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-500 border-r-transparent"></div>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading menu...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageBreadcrumb pageTitle="Menu Items" />

      <div className="space-y-6">
        {error && (
          <div className="rounded-lg bg-error-50 p-4 dark:bg-error-900/20">
            <p className="text-sm text-error-600 dark:text-error-400">{error}</p>
          </div>
        )}

        {success && (
          <div className="rounded-lg bg-success-50 p-4 dark:bg-success-900/20">
            <p className="text-sm text-success-600 dark:text-success-400">{success}</p>
          </div>
        )}

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Menu Items List</h3>
            <Link
              href="/admin/dashboard/menu/create"
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-brand-500 px-6 text-sm font-medium text-white hover:bg-brand-600 focus:outline-none focus:ring-3 focus:ring-brand-500/20"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Menu Item
            </Link>
          </div>

          {/* Search and Filters */}
          <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <input
                type="text"
                placeholder="Search menu items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
              />
            </div>
            <div>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
              >
                <option value="all">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          
          {filteredMenuItems.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {menuItems.length === 0 ? "No menu items found" : "No items match your filters"}
              </p>
              {menuItems.length === 0 && (
                <Link
                  href="/admin/dashboard/menu/create"
                  className="mt-4 inline-flex h-11 items-center gap-2 rounded-lg bg-brand-500 px-6 text-sm font-medium text-white hover:bg-brand-600"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create First Menu Item
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="bg-gray-50 text-left dark:bg-gray-900/50">
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">Image</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">Name</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">Category</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">Price</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">Stock</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">Status</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {currentItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30">
                      <td className="px-4 py-4">
                        {item.imageUrl ? (
                          <Image 
                            src={item.imageUrl} 
                            alt={item.name}
                            width={64}
                            height={64}
                            className="rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
                            <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-800 dark:text-white/90">{item.name}</p>
                          {item.description && (
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{item.description}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                          {getCategoryNames(item)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          {item.isPromo && item.promoPrice ? (
                            <>
                              <p className="text-xs text-gray-500 dark:text-gray-400 line-through">
                                {formatPrice(item.price)}
                              </p>
                              <p className="text-sm font-semibold text-error-600 dark:text-error-400">
                                {formatPrice(item.promoPrice)}
                              </p>
                              <span className="inline-flex rounded bg-error-100 px-2 py-0.5 text-xs font-medium text-error-700 dark:bg-error-900/20 dark:text-error-400">
                                PROMO
                              </span>
                            </>
                          ) : (
                            <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
                              {formatPrice(item.price)}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {item.trackStock ? (
                          <div className="space-y-1">
                            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                              (item.stockQty || 0) > 10
                                ? 'bg-success-100 text-success-700 dark:bg-success-900/20 dark:text-success-400'
                                : (item.stockQty || 0) > 0
                                ? 'bg-warning-100 text-warning-700 dark:bg-warning-900/20 dark:text-warning-400'
                                : 'bg-error-100 text-error-700 dark:bg-error-900/20 dark:text-error-400'
                            }`}>
                              {item.stockQty || 0} pcs
                            </span>
                            {item.autoResetStock && item.dailyStockTemplate && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Auto: {item.dailyStockTemplate}/day
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            No tracking
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <button
                          onClick={() => handleToggleActive(item.id, item.isActive, item.name)}
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                            item.isActive 
                              ? 'bg-success-100 text-success-700 hover:bg-success-200 dark:bg-success-900/20 dark:text-success-400 dark:hover:bg-success-900/30' 
                              : 'bg-error-100 text-error-700 hover:bg-error-200 dark:bg-error-900/20 dark:text-error-400 dark:hover:bg-error-900/30'
                          }`}>
                          {item.isActive ? '● Active' : '○ Inactive'}
                        </button>
                      </td>
                      <td className="px-4 py-4">
                        <div className="relative">
                          <button
                            onClick={() => setOpenDropdownId(openDropdownId === item.id ? null : item.id)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                            title="Actions"
                          >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                            </svg>
                          </button>

                          {openDropdownId === item.id && (
                            <>
                              <div 
                                className="fixed inset-0 z-10" 
                                onClick={() => setOpenDropdownId(null)}
                              />
                              <div className="absolute right-0 z-20 mt-2 w-48 origin-top-right rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                                <div className="py-1">
                                  {item.trackStock && (item.stockQty || 0) > 0 && (
                                    <button
                                      onClick={() => {
                                        handleOutOfStock(item.id, item.name);
                                        setOpenDropdownId(null);
                                      }}
                                      className="flex w-full items-center gap-3 px-4 py-2 text-sm text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-900/20"
                                    >
                                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                      Out of Stock
                                    </button>
                                  )}
                                  {item.trackStock && (
                                    <button
                                      onClick={() => {
                                        setSelectedStockMenu(item);
                                        setOpenDropdownId(null);
                                      }}
                                      className="flex w-full items-center gap-3 px-4 py-2 text-sm text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-900/20"
                                    >
                                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                      </svg>
                                      Add Stock
                                    </button>
                                  )}
                                  <button
                                    onClick={() => {
                                      setSelectedPromoMenu(item);
                                      setOpenDropdownId(null);
                                    }}
                                    className="flex w-full items-center gap-3 px-4 py-2 text-sm text-warning-600 hover:bg-warning-50 dark:text-warning-400 dark:hover:bg-warning-900/20"
                                  >
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                    </svg>
                                    Setup Promo
                                  </button>
                                  <Link
                                    href={`/admin/dashboard/menu/edit/${item.id}`}
                                    className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                                    onClick={() => setOpenDropdownId(null)}
                                  >
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    Edit Menu
                                  </Link>
                                  <div className="border-t border-gray-200 dark:border-gray-700" />
                                  <button
                                    onClick={() => {
                                      handleDelete(item.id, item.name);
                                      setOpenDropdownId(null);
                                    }}
                                    className="flex w-full items-center gap-3 px-4 py-2 text-sm text-error-600 hover:bg-error-50 dark:text-error-400 dark:hover:bg-error-900/20"
                                  >
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    Delete
                                  </button>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-5 flex items-center justify-between border-t border-gray-200 pt-5 dark:border-gray-800">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredMenuItems.length)} of {filteredMenuItems.length} items
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
                        className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border text-sm font-medium ${
                          currentPage === page
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
            </div>
          )}
        </div>
      </div>

      {/* Stock Modal */}
      {selectedStockMenu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                Add Stock: {selectedStockMenu.name}
              </h3>
              <button
                onClick={() => setSelectedStockMenu(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4 rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Current Stock: <span className="font-semibold text-gray-800 dark:text-white/90">{selectedStockMenu.stockQty || 0} pcs</span>
              </p>
              {selectedStockMenu.autoResetStock && selectedStockMenu.dailyStockTemplate && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                  Daily auto-reset to {selectedStockMenu.dailyStockTemplate} pcs
                </p>
              )}
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const quantity = parseInt(formData.get('quantity') as string);

              try {
                const token = localStorage.getItem("accessToken");
                if (!token) {
                  router.push("/admin/login");
                  return;
                }

                const response = await fetch(`/api/merchant/menu/${selectedStockMenu.id}/add-stock`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({ quantity }),
                });

                if (!response.ok) {
                  const data = await response.json();
                  throw new Error(data.message || "Failed to add stock");
                }

                setSuccess(`Added ${quantity} stock to ${selectedStockMenu.name}`);
                setTimeout(() => setSuccess(null), 3000);
                setSelectedStockMenu(null);
                fetchData();
              } catch (err) {
                setError(err instanceof Error ? err.message : "An error occurred");
                setTimeout(() => setError(null), 5000);
              }
            }}>
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Quantity to Add
                </label>
                <input
                  type="number"
                  name="quantity"
                  min="1"
                  required
                  placeholder="Enter quantity"
                  className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedStockMenu(null)}
                  className="flex-1 h-11 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 h-11 rounded-lg bg-brand-500 text-sm font-medium text-white hover:bg-brand-600"
                >
                  Add Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Promo Modal */}
      {selectedPromoMenu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                Setup Promo: {selectedPromoMenu.name}
              </h3>
              <button
                onClick={() => setSelectedPromoMenu(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4 rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Original Price: <span className="font-semibold text-gray-800 dark:text-white/90">{formatPrice(selectedPromoMenu.price)}</span>
              </p>
              {selectedPromoMenu.isPromo && selectedPromoMenu.promoPrice && (
                <p className="mt-1 text-sm text-error-600 dark:text-error-400">
                  Current Promo: <span className="font-semibold">{formatPrice(selectedPromoMenu.promoPrice)}</span>
                </p>
              )}
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const isPromo = formData.get('isPromo') === 'on';
              const promoPrice = formData.get('promoPrice') ? parseFloat(formData.get('promoPrice') as string) : undefined;
              const promoStartDate = formData.get('promoStartDate') as string;
              const promoEndDate = formData.get('promoEndDate') as string;

              try {
                const token = localStorage.getItem("accessToken");
                if (!token) {
                  router.push("/admin/login");
                  return;
                }

                const response = await fetch(`/api/merchant/menu/${selectedPromoMenu.id}/setup-promo`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({
                    isPromo,
                    promoPrice,
                    promoStartDate: promoStartDate || undefined,
                    promoEndDate: promoEndDate || undefined,
                  }),
                });

                if (!response.ok) {
                  const data = await response.json();
                  throw new Error(data.message || "Failed to setup promo");
                }

                setSuccess(isPromo ? `Promo activated for ${selectedPromoMenu.name}` : `Promo removed from ${selectedPromoMenu.name}`);
                setTimeout(() => setSuccess(null), 3000);
                setSelectedPromoMenu(null);
                fetchData();
              } catch (err) {
                setError(err instanceof Error ? err.message : "An error occurred");
                setTimeout(() => setError(null), 5000);
              }
            }}>
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isPromo"
                    name="isPromo"
                    defaultChecked={selectedPromoMenu.isPromo}
                    className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                  />
                  <label htmlFor="isPromo" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Enable Promo
                  </label>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Promo Price
                  </label>
                  <input
                    type="number"
                    name="promoPrice"
                    step="0.01"
                    min="0"
                    defaultValue={selectedPromoMenu.promoPrice ? parseFloat(selectedPromoMenu.promoPrice.toString()) : ''}
                    placeholder="Enter promo price"
                    className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Start Date
                    </label>
                    <input
                      type="date"
                      name="promoStartDate"
                      defaultValue={selectedPromoMenu.promoStartDate ? new Date(selectedPromoMenu.promoStartDate).toISOString().split('T')[0] : ''}
                      className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      End Date
                    </label>
                    <input
                      type="date"
                      name="promoEndDate"
                      defaultValue={selectedPromoMenu.promoEndDate ? new Date(selectedPromoMenu.promoEndDate).toISOString().split('T')[0] : ''}
                      className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedPromoMenu(null)}
                  className="flex-1 h-11 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 h-11 rounded-lg bg-warning-500 text-sm font-medium text-white hover:bg-warning-600"
                >
                  Save Promo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
