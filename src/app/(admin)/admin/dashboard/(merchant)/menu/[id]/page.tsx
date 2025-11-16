"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ImagePopupModal from "@/components/common/ImagePopupModal";
import ViewMenuAddonCategoriesModal from "@/components/menu/ViewMenuAddonCategoriesModal";

interface MenuAddonCategory {
  addonCategoryId: string;
  isRequired: boolean;
  displayOrder: number;
  addonCategory: {
    id: string;
    name: string;
    description: string | null;
    minSelection: number;
    maxSelection: number | null;
    addonItems: Array<{
      id: string;
      name: string;
      description: string | null;
      price: string | number;
      inputType: string;
      isActive: boolean;
      trackStock: boolean;
      stockQty: number | null;
      displayOrder: number;
    }>;
  };
}

interface MenuDetail {
  id: string;
  name: string;
  description: string | null;
  price: string | number;
  promoPrice: string | number | null;
  promoStartDate: string | null;
  promoEndDate: string | null;
  imageUrl: string | null;
  isActive: boolean;
  isPromo: boolean;
  trackStock: boolean;
  stockQty: number | null;
  dailyStockTemplate: number | null;
  autoResetStock: boolean;
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
  addonCategories?: MenuAddonCategory[];
}

interface Merchant {
  id: string;
  name: string;
  currency: string;
}

export default function MenuDetailPage() {
  const router = useRouter();
  const params = useParams();
  const menuId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menu, setMenu] = useState<MenuDetail | null>(null);
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [showViewAddonsModal, setShowViewAddonsModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);

  const fetchMenuDetail = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/admin/login");
        return;
      }

      const [menuResponse, merchantResponse] = await Promise.all([
        fetch(`/api/merchant/menu/${menuId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/merchant/profile", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!menuResponse.ok) {
        if (menuResponse.status === 404) {
          throw new Error("Menu not found");
        }
        throw new Error("Failed to fetch menu details");
      }

      const menuData = await menuResponse.json();
      
      if (merchantResponse.ok) {
        const merchantData = await merchantResponse.json();
        if (merchantData.success && merchantData.data) {
          setMerchant({
            id: merchantData.data.id,
            name: merchantData.data.name,
            currency: merchantData.data.currency || "AUD",
          });
        }
      }

      if (menuData.success && menuData.data) {
        setMenu(menuData.data);
      } else {
        throw new Error("Invalid menu data");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (menuId) {
      fetchMenuDetail();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuId]);

  const formatPrice = (price: string | number) => {
    const currency = merchant?.currency || "AUD";
    const numPrice = typeof price === "string" ? parseFloat(price) : price;
    return `${currency} ${numPrice.toLocaleString("en-AU", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-AU", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const isPromoActive = () => {
    if (!menu?.isPromo || !menu?.promoStartDate || !menu?.promoEndDate) {
      return false;
    }
    const now = new Date();
    const start = new Date(menu.promoStartDate);
    const end = new Date(menu.promoEndDate);
    return now >= start && now <= end;
  };

  if (loading) {
    return (
      <div>
        <PageBreadcrumb pageTitle="View" />
        <div className="mt-6 py-10 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-500 border-r-transparent"></div>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading menu details...</p>
        </div>
      </div>
    );
  }

  if (error || !menu) {
    return (
      <div>
        <PageBreadcrumb pageTitle="View" />
        <div className="mt-6 rounded-lg bg-error-50 p-4 dark:bg-error-900/20">
          <p className="text-sm text-error-600 dark:text-error-400">{error || "Menu not found"}</p>
          <button
            onClick={() => router.push("/admin/dashboard/menu")}
            className="mt-3 inline-flex h-10 items-center rounded-lg bg-brand-500 px-4 text-sm font-medium text-white hover:bg-brand-600"
          >
            Back to Menu List
          </button>
        </div>
      </div>
    );
  }

  const categoryNames = menu.categories && menu.categories.length > 0
    ? menu.categories.map(c => c.category.name).join(", ")
    : menu.category?.name || "-";

  return (
    <div>
      <PageBreadcrumb pageTitle="Menu Detail" />

      <div className="mt-6 space-y-5">
        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => router.push("/admin/dashboard/menu")}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back
          </button>
          <button
            onClick={() => router.push(`/admin/dashboard/menu/edit/${menuId}`)}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-brand-600"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit Menu
          </button>
        </div>

        {/* Main Content Card */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/3">
          <div className="p-6">
            <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
              {/* Image - Smaller and cleaner */}
              <div>
                <div 
                  className="group relative aspect-square w-full cursor-pointer overflow-hidden rounded-lg border border-gray-200 bg-gray-50 shadow-sm transition-all hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
                  onClick={() => menu.imageUrl && setShowImageModal(true)}
                >
                  {menu.imageUrl ? (
                    <>
                      <Image
                        src={menu.imageUrl}
                        alt={menu.name}
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/20 group-hover:opacity-100">
                        <div className="rounded-full bg-white/90 p-2 shadow-lg">
                          <svg className="h-5 w-5 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                          </svg>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <svg className="h-16 w-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>

              {/* Info Section */}
              <div className="space-y-4">
                {/* Title & Status */}
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {menu.name}
                    </h1>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                      menu.isActive 
                        ? 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400' 
                        : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${menu.isActive ? 'bg-success-500' : 'bg-gray-400'}`}></span>
                      {menu.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {menu.description && (
                    <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                      {menu.description}
                    </p>
                  )}
                </div>

                {/* Price Section - Compact */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="rounded-lg bg-gray-50 px-4 py-2 dark:bg-gray-800/50">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      Regular Price
                    </p>
                    <p className="mt-0.5 text-xl font-bold text-gray-900 dark:text-white">
                      {formatPrice(menu.price)}
                    </p>
                  </div>
                  
                  {menu.isPromo && menu.promoPrice && (
                    <div className={`rounded-lg px-4 py-2 ${
                      isPromoActive()
                        ? 'bg-orange-50 dark:bg-orange-900/20'
                        : 'bg-gray-50 dark:bg-gray-800/50'
                    }`}>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          Promo Price
                        </p>
                        {isPromoActive() && (
                          <span className="rounded-full bg-orange-500 px-2 py-0.5 text-xs font-bold text-white">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xl font-bold text-orange-600 dark:text-orange-400">
                        {formatPrice(menu.promoPrice)}
                      </p>
                      <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                        {formatDate(menu.promoStartDate)} - {formatDate(menu.promoEndDate)}
                      </p>
                    </div>
                  )}
                </div>

                {/* Info Grid - Compact */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 dark:border-gray-700 dark:bg-gray-800/50">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100 dark:bg-brand-900/30">
                      <svg className="h-4 w-4 text-brand-600 dark:text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        Category
                      </p>
                      <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                        {categoryNames}
                      </p>
                    </div>
                  </div>

                  {menu.trackStock && (
                    <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 dark:border-gray-700 dark:bg-gray-800/50">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                        <svg className="h-4 w-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          Stock
                        </p>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold ${
                            (menu.stockQty || 0) > 10
                              ? 'text-success-600 dark:text-success-400'
                              : (menu.stockQty || 0) > 0
                              ? 'text-warning-600 dark:text-warning-400'
                              : 'text-error-600 dark:text-error-400'
                          }`}>
                            {menu.stockQty || 0} pcs
                          </span>
                          {menu.autoResetStock && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              • Resets: {menu.dailyStockTemplate || 0}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Addon Categories Section */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/3">
          <div className="border-b border-gray-200 p-5 dark:border-gray-700">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Addon Categories
                </h3>
                <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                  {menu.addonCategories?.length || 0} linked
                </p>
              </div>
              {menu.addonCategories && menu.addonCategories.length > 0 && (
                <button
                  onClick={() => setShowViewAddonsModal(true)}
                  className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 transition-all hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/40"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  View Addon Categories
                </button>
              )}
            </div>
          </div>

          <div className="p-5">
            {!menu.addonCategories || menu.addonCategories.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 py-12 text-center dark:border-gray-700 dark:bg-gray-900/50">
                <div className="flex justify-center">
                  <div className="rounded-full bg-gray-200 p-3 dark:bg-gray-800">
                    <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                  </div>
                </div>
                <h4 className="mt-3 text-sm font-semibold text-gray-900 dark:text-white">
                  No Addon Categories
                </h4>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Add categories to enhance this menu item
                </p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {menu.addonCategories.map((mac) => (
                  <div
                    key={mac.addonCategoryId}
                    className="group rounded-lg border border-gray-200 bg-white p-3.5 transition-all hover:border-brand-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-900/50 dark:hover:border-brand-600"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="flex-1 text-sm font-semibold text-gray-900 dark:text-white">
                        {mac.addonCategory.name}
                      </h4>
                      {mac.isRequired && (
                        <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700 dark:bg-red-900/30 dark:text-red-400">
                          Required
                        </span>
                      )}
                    </div>
                    
                    {mac.addonCategory.description && (
                      <p className="mt-1.5 line-clamp-2 text-xs text-gray-600 dark:text-gray-400">
                        {mac.addonCategory.description}
                      </p>
                    )}
                    
                    <div className="mt-2.5 flex items-center justify-between rounded-md bg-gray-50 px-2.5 py-1.5 dark:bg-gray-800/50">
                      <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                        <span className="font-medium">Min: {mac.addonCategory.minSelection}</span>
                        <span className="text-gray-400">•</span>
                        <span className="font-medium">Max: {mac.addonCategory.maxSelection || '∞'}</span>
                      </div>
                      <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-bold text-brand-700 dark:bg-brand-900/30 dark:text-brand-400">
                        {mac.addonCategory.addonItems?.length || 0}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showImageModal && menu.imageUrl && (
        <ImagePopupModal
          show={showImageModal}
          imageUrl={menu.imageUrl}
          altText={menu.name}
          onClose={() => setShowImageModal(false)}
        />
      )}

      {showViewAddonsModal && menu.addonCategories && (
        <ViewMenuAddonCategoriesModal
          show={showViewAddonsModal}
          menuName={menu.name}
          addonCategories={menu.addonCategories}
          currency={merchant?.currency || "AUD"}
          onClose={() => setShowViewAddonsModal(false)}
        />
      )}
    </div>
  );
}
