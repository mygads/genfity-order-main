"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
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
  // Note: Promo fields removed - use SpecialPrice table for promo management
  imageUrl: string | null;
  isActive: boolean;
  trackStock: boolean;
  stockQty: number | null;
  dailyStockTemplate: number | null;
  autoResetStock: boolean;
  isSpicy: boolean;
  isBestSeller: boolean;
  isSignature: boolean;
  isRecommended: boolean;
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

  // Note: isPromoActive removed - promo is now managed via SpecialPrice page

  if (loading) {
    return (
      <div>
        <PageBreadcrumb pageTitle="Menu Detail" />
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700"></div>
              <div><div className="h-6 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div><div className="mt-2 h-4 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div></div>
            </div>
            <div className="flex gap-3"><div className="h-11 w-20 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700"></div><div className="h-11 w-28 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700"></div></div>
          </div>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <div><div className="h-8 w-64 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div><div className="mt-3 h-4 w-full max-w-md animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div></div>
              <div className="h-20 w-48 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700"></div>
            </div>
            <div className="h-64 w-full animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-700"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !menu) {
    return (
      <div>
        <PageBreadcrumb pageTitle="Menu Detail" />
        <div className="mt-6 flex items-center gap-3 rounded-xl border border-error-200 bg-error-50 p-4 dark:border-error-800 dark:bg-error-900/20">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-error-100 text-error-600 dark:bg-error-900/30 dark:text-error-400">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-error-700 dark:text-error-300">{error || "Menu not found"}</p>
          </div>
          <button
            onClick={() => router.push("/admin/dashboard/menu")}
            className="inline-flex h-10 items-center rounded-lg bg-primary-500 px-4 text-sm font-medium text-white hover:bg-primary-600"
          >
            Back to Menu List
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageBreadcrumb pageTitle="Menu Detail" />

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
        {/* Header */}
        <div className="border-b border-gray-200 bg-gray-50/50 px-6 py-5 dark:border-gray-800 dark:bg-gray-900/50">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Menu Detail</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">View menu item information</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/admin/dashboard/menu"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-5 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back
              </Link>
              <Link
                href={`/admin/dashboard/menu/edit/${menuId}`}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary-500 px-5 text-sm font-medium text-white shadow-lg shadow-primary-500/25 transition-all hover:bg-primary-600 hover:shadow-primary-500/30"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Menu
              </Link>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 lg:p-8">
          {/* Main Content Grid */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Left Column - Details */}
            <div className="space-y-6 lg:col-span-2">
              {/* Title & Status */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{menu.name}</h2>
                  {menu.description && (
                    <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">{menu.description}</p>
                  )}
                </div>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${menu.isActive
                  ? 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400'
                  : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                  <span className={`h-2 w-2 rounded-full ${menu.isActive ? 'bg-success-500' : 'bg-gray-400'}`}></span>
                  {menu.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              {/* Menu Badges */}
              {(menu.isSpicy || menu.isBestSeller || menu.isSignature || menu.isRecommended) && (
                <div className="flex flex-wrap items-center gap-2">
                  {menu.isSpicy && (
                    <div className="flex items-center gap-2 rounded-xl border-2 border-orange-200 bg-orange-50 px-3 py-2 dark:border-orange-700 dark:bg-orange-900/20">
                      <div className="relative h-5 w-5 overflow-hidden rounded-full">
                        <Image src="/images/menu-badges/spicy.png" alt="Spicy" fill className="object-cover" />
                      </div>
                      <span className="text-sm font-medium text-orange-700 dark:text-orange-400">Spicy</span>
                    </div>
                  )}
                  {menu.isBestSeller && (
                    <div className="flex items-center gap-2 rounded-xl border-2 border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-700 dark:bg-amber-900/20">
                      <div className="relative h-5 w-5 overflow-hidden rounded-full">
                        <Image src="/images/menu-badges/best-seller.png" alt="Best Seller" fill className="object-cover" />
                      </div>
                      <span className="text-sm font-medium text-amber-700 dark:text-amber-400">Best Seller</span>
                    </div>
                  )}
                  {menu.isSignature && (
                    <div className="flex items-center gap-2 rounded-xl border-2 border-purple-200 bg-purple-50 px-3 py-2 dark:border-purple-700 dark:bg-purple-900/20">
                      <div className="relative h-5 w-5 overflow-hidden rounded-full">
                        <Image src="/images/menu-badges/signature.png" alt="Signature" fill className="object-cover" />
                      </div>
                      <span className="text-sm font-medium text-purple-700 dark:text-purple-400">Signature</span>
                    </div>
                  )}
                  {menu.isRecommended && (
                    <div className="flex items-center gap-2 rounded-xl border-2 border-green-200 bg-green-50 px-3 py-2 dark:border-green-700 dark:bg-green-900/20">
                      <div className="relative h-5 w-5 overflow-hidden rounded-full">
                        <Image src="/images/menu-badges/recommended.png" alt="Recommended" fill className="object-cover" />
                      </div>
                      <span className="text-sm font-medium text-green-700 dark:text-green-400">Recommended</span>
                    </div>
                  )}
                </div>
              )}

              {/* Price Section */}
              <div className="flex flex-wrap items-center gap-4">
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-5 py-3 dark:border-gray-700 dark:bg-gray-800/50">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Price</p>
                  <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{formatPrice(menu.price)}</p>
                </div>
              </div>

              {/* Categories Section */}
              <div className="rounded-2xl border-2 border-blue-200 bg-blue-50/50 p-5 dark:border-blue-700 dark:bg-blue-900/10">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-800 dark:text-white">Menu Categories</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {menu.categories && menu.categories.length > 0 
                        ? `${menu.categories.length} categories assigned` 
                        : 'No categories assigned'}
                    </p>
                  </div>
                </div>

                {menu.categories && menu.categories.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {menu.categories.map((c) => (
                      <span 
                        key={c.categoryId} 
                        className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                      >
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        {c.category.name}
                      </span>
                    ))}
                  </div>
                ) : menu.category ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    {menu.category.name}
                  </span>
                ) : (
                  <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 py-4 text-center dark:border-gray-700 dark:bg-gray-900/50">
                    <p className="text-sm text-gray-500 dark:text-gray-400">No categories assigned</p>
                    <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Edit this menu to add categories</p>
                  </div>
                )}
              </div>

              {/* Info Cards */}
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Stock */}
                {menu.trackStock && (
                  <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50/50 p-4 dark:border-gray-700 dark:bg-gray-800/30">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${(menu.stockQty || 0) > 10
                      ? 'bg-success-100 text-success-600 dark:bg-success-900/30 dark:text-success-400'
                      : (menu.stockQty || 0) > 0
                        ? 'bg-warning-100 text-warning-600 dark:bg-warning-900/30 dark:text-warning-400'
                        : 'bg-error-100 text-error-600 dark:bg-error-900/30 dark:text-error-400'
                      }`}>
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Stock Available</p>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${(menu.stockQty || 0) > 10 ? 'text-success-600 dark:text-success-400'
                          : (menu.stockQty || 0) > 0 ? 'text-warning-600 dark:text-warning-400'
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

            {/* Right Column - Image */}
            <div className="lg:col-span-1">
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Menu Image
              </label>

              <div
                className={`relative rounded-2xl border-2 transition-all overflow-hidden cursor-pointer ${menu.imageUrl
                  ? 'border-primary-200 bg-primary-50/30 dark:border-primary-700 dark:bg-primary-900/10'
                  : 'border-dashed border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-900'
                  }`}
                onClick={() => menu.imageUrl && setShowImageModal(true)}
              >
                {menu.imageUrl ? (
                  <div className="group relative aspect-square">
                    <Image
                      src={menu.imageUrl}
                      alt={menu.name}
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/30 group-hover:opacity-100">
                      <div className="rounded-full bg-white/90 p-3 shadow-lg">
                        <svg className="h-6 w-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex aspect-square items-center justify-center">
                    <div className="text-center">
                      <svg className="mx-auto h-16 w-16 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="mt-2 text-sm text-gray-400">No image</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="my-8 border-t border-gray-100 dark:border-gray-800" />

          {/* Addon Categories Section */}
          <div className="rounded-2xl border-2 border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900/50">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-800 dark:text-white">Addon Categories</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{menu.addonCategories?.length || 0} linked categories</p>
                </div>
              </div>
              {menu.addonCategories && menu.addonCategories.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowViewAddonsModal(true)}
                  className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 transition-all hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/40"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  View Details
                </button>
              )}
            </div>

            {!menu.addonCategories || menu.addonCategories.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 py-8 text-center dark:border-gray-700 dark:bg-gray-900/50">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-800">
                  <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">No addon categories linked</p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">Edit this menu to add categories</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {menu.addonCategories.map((mac) => (
                  <div key={mac.addonCategoryId} className="rounded-lg border border-gray-200 bg-gray-50/50 p-3.5 dark:border-gray-700 dark:bg-gray-800/30">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="flex-1 text-sm font-semibold text-gray-900 dark:text-white">{mac.addonCategory.name}</h4>
                      {mac.isRequired && (
                        <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700 dark:bg-red-900/30 dark:text-red-400">Required</span>
                      )}
                    </div>
                    {mac.addonCategory.description && (
                      <p className="mt-1.5 line-clamp-2 text-xs text-gray-600 dark:text-gray-400">{mac.addonCategory.description}</p>
                    )}
                    <div className="mt-2.5 flex items-center justify-between rounded-md bg-white px-2.5 py-1.5 dark:bg-gray-900/50">
                      <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                        <span className="font-medium">Min: {mac.addonCategory.minSelection}</span>
                        <span className="text-gray-400">•</span>
                        <span className="font-medium">Max: {mac.addonCategory.maxSelection || '∞'}</span>
                      </div>
                      <span className="rounded-full bg-primary-100 px-2 py-0.5 text-xs font-bold text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
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
