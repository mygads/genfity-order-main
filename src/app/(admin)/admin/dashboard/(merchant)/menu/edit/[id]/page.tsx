"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import AdminFormFooter from "@/components/common/AdminFormFooter";
import { FormPageSkeleton } from '@/components/common/SkeletonLoaders';
import Image from "next/image";
import { FaUpload, FaImages } from "react-icons/fa";
import ManageMenuAddonCategoriesModal from "@/components/menu/ManageMenuAddonCategoriesModal";
import ViewMenuAddonCategoriesModal from "@/components/menu/ViewMenuAddonCategoriesModal";
import { StatusToggle } from "@/components/common/StatusToggle";
import { useMerchant } from "@/context/MerchantContext";
import { getCurrencySymbol } from "@/lib/utils/format";
import { getCurrencyConfig } from "@/lib/constants/location";
import StockPhotoPicker from "@/components/menu/StockPhotoPicker";
import { useTranslation } from "@/lib/i18n/useTranslation";
import {
  uploadMenuImageViaApi,
} from "@/lib/utils/menuImage";

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
    isActive: boolean;
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

interface MenuFormData {
  name: string;
  description: string;
  price: string;
  imageUrl: string;
  imageThumbUrl: string;
  imageThumbMeta?: Record<string, unknown> | null;
  stockPhotoId?: string | null;
  isActive: boolean;
  isSpicy: boolean;
  isBestSeller: boolean;
  isSignature: boolean;
  isRecommended: boolean;
  trackStock: boolean;
  stockQty: string;
  dailyStockTemplate: string;
  autoResetStock: boolean;
}

interface Merchant {
  id: string;
  name: string;
  currency: string;
}

interface Category {
  id: string;
  name: string;
  description?: string | null;
  isActive?: boolean;
}


export default function EditMenuPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const params = useParams();
  const searchParams = useSearchParams();
  const menuId = params.id as string;
  const returnPage = searchParams.get('returnPage');
  const { currency } = useMerchant();
  const currencySymbol = getCurrencySymbol(currency);
  const menuImageMessages = useMemo(() => ({
    prepareFailed: t('admin.menuUpload.error.prepareFailed'),
    invalidResponse: t('admin.menuUpload.error.invalidResponse'),
    uploadFailed: t('admin.menuUpload.error.uploadFailed'),
    networkError: t('admin.menuUpload.error.networkError'),
    uploadCancelled: t('admin.menuUpload.error.uploadCancelled'),
    canvasUnsupported: t('admin.menuUpload.error.canvasUnsupported'),
    thumbnailFailed: t('admin.menuUpload.error.thumbnailFailed'),
  }), [t]);

  // Build return URL with pagination
  const menuListUrl = returnPage ? `/admin/dashboard/menu?page=${returnPage}` : '/admin/dashboard/menu';

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [addonCategories, setAddonCategories] = useState<MenuAddonCategory[]>([]);
  const [showManageAddonsModal, setShowManageAddonsModal] = useState(false);
  const [showViewAddonsModal, setShowViewAddonsModal] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [originalFormData, setOriginalFormData] = useState<MenuFormData | null>(null);

  const isBusy = submitting || uploadingImage;

  // Image source state: 'upload' or 'stock'
  const [imageSource, setImageSource] = useState<'upload' | 'stock'>('upload');
  const [showStockPhotoPicker, setShowStockPhotoPicker] = useState(false);

  // Category selection state
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [originalCategoryIds, setOriginalCategoryIds] = useState<string[]>([]);
  const [categorySearch, setCategorySearch] = useState("");
  const [showCategorySection, setShowCategorySection] = useState(false);

  const [formData, setFormData] = useState<MenuFormData>({
    name: "",
    description: "",
    price: "",
    imageUrl: "",
    imageThumbUrl: "",
    imageThumbMeta: null,
    stockPhotoId: null,
    isActive: true,
    isSpicy: false,
    isBestSeller: false,
    isSignature: false,
    isRecommended: false,
    trackStock: false,
    stockQty: "",
    dailyStockTemplate: "",
    autoResetStock: false,
  });

  // Filtered categories
  const filteredCategories = useMemo(() => {
    if (!categorySearch.trim()) return allCategories;
    return allCategories.filter(cat =>
      cat.name.toLowerCase().includes(categorySearch.toLowerCase())
    );
  }, [allCategories, categorySearch]);

  // Check if form has changes compared to original data
  const hasChanges = (): boolean => {
    if (!originalFormData) return false;
    return (
      formData.name !== originalFormData.name ||
      formData.description !== originalFormData.description ||
      formData.price !== originalFormData.price ||
      formData.imageUrl !== originalFormData.imageUrl ||
      formData.stockPhotoId !== originalFormData.stockPhotoId ||
      formData.isActive !== originalFormData.isActive ||
      formData.isSpicy !== originalFormData.isSpicy ||
      formData.isBestSeller !== originalFormData.isBestSeller ||
      formData.isSignature !== originalFormData.isSignature ||
      formData.isRecommended !== originalFormData.isRecommended ||
      formData.trackStock !== originalFormData.trackStock ||
      formData.stockQty !== originalFormData.stockQty ||
      formData.dailyStockTemplate !== originalFormData.dailyStockTemplate ||
      formData.autoResetStock !== originalFormData.autoResetStock ||
      JSON.stringify(selectedCategoryIds.sort()) !== JSON.stringify(originalCategoryIds.sort())
    );
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("accessToken");
        if (!token) {
          router.push("/admin/login");
          return;
        }

        const [menuResponse, merchantResponse, categoriesResponse] = await Promise.all([
          fetch(`/api/merchant/menu/${menuId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("/api/merchant/profile", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("/api/merchant/categories", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (!menuResponse.ok) {
          throw new Error("Failed to fetch menu item");
        }

        const menuData = await menuResponse.json();
        const merchantData = await merchantResponse.json();

        if (merchantData.success && merchantData.data) {
          setMerchant(merchantData.data);
        }

        // Set all categories
        if (categoriesResponse.ok) {
          const categoriesData = await categoriesResponse.json();
          if (categoriesData.success && Array.isArray(categoriesData.data)) {
            setAllCategories(categoriesData.data);
          }
        }

        if (menuData.success && menuData.data) {
          const menu = menuData.data;
          const initialFormData = {
            name: menu.name || "",
            description: menu.description || "",
            price: menu.price ? menu.price.toString() : "",
            imageUrl: menu.imageUrl || "",
            imageThumbUrl: menu.imageThumbUrl || "",
            imageThumbMeta: menu.imageThumbMeta || null,
            stockPhotoId: menu.stockPhotoId || null,
            isActive: menu.isActive !== undefined ? menu.isActive : true,
            isSpicy: menu.isSpicy !== undefined ? menu.isSpicy : false,
            isBestSeller: menu.isBestSeller !== undefined ? menu.isBestSeller : false,
            isSignature: menu.isSignature !== undefined ? menu.isSignature : false,
            isRecommended: menu.isRecommended !== undefined ? menu.isRecommended : false,
            trackStock: menu.trackStock !== undefined ? menu.trackStock : false,
            stockQty: menu.stockQty ? menu.stockQty.toString() : "",
            dailyStockTemplate: menu.dailyStockTemplate ? menu.dailyStockTemplate.toString() : "",
            autoResetStock: menu.autoResetStock !== undefined ? menu.autoResetStock : false,
          };
          setFormData(initialFormData);
          setOriginalFormData(initialFormData); // Store original data for comparison
          setImageSource(menu.stockPhotoId ? 'stock' : 'upload');

          if (menu.addonCategories) {
            setAddonCategories(menu.addonCategories);
          }

          // Set current menu categories
          if (menu.categories && Array.isArray(menu.categories)) {
            const catIds = menu.categories.map((c: { categoryId: string }) => c.categoryId);
            setSelectedCategoryIds(catIds);
            setOriginalCategoryIds(catIds);
            if (catIds.length > 0) setShowCategorySection(true);
          }
        } else {
          throw new Error("Menu item not found");
        }
      } catch (err) {
        console.error("Fetch error:", err);
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    if (menuId) {
      fetchData();
    }
  }, [menuId, router]);

  const refetchAddonCategories = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) return;

      const response = await fetch(`/api/merchant/menu/${menuId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data && data.data.addonCategories) {
          setAddonCategories(data.data.addonCategories);
        }
      }
    } catch (err) {
      console.error("Failed to refetch addon categories:", err);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type - accept all image formats
    if (!file.type.startsWith('image/')) {
      setError(t('admin.menuUpload.error.invalidFileType'));
      setTimeout(() => setError(null), 3000);
      return;
    }

    const maxSizeMB = 5;
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setError(t('admin.menuUpload.error.fileTooLarge', { maxSize: maxSizeMB }));
      setTimeout(() => setError(null), 3000);
      return;
    }

    try {
      setUploadingImage(true);
      setError(null);
      setUploadProgress(0);

      const token = localStorage.getItem('accessToken');
      if (!token) {
        setError(t('admin.menuUpload.error.authRequired'));
        return;
      }

      const uploadResult = await uploadMenuImageViaApi(
        { token, file, menuId },
        (percent) => setUploadProgress(percent),
        menuImageMessages
      );

      setFormData(prev => ({
        ...prev,
        imageUrl: uploadResult.imageUrl,
        imageThumbUrl: uploadResult.imageThumbUrl,
        imageThumbMeta: uploadResult.imageThumbMeta,
        stockPhotoId: null,
      }));
      setImageSource('upload');
      setSuccess(
        uploadResult.warnings.length > 0
          ? uploadResult.warnings.join(' ')
          : 'Image uploaded successfully!'
      );
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.menuUpload.error.uploadFailed'));
      setTimeout(() => setError(null), 5000);
    } finally {
      setUploadingImage(false);
      setUploadProgress(0);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({
        ...prev,
        [name]: checked
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

    if (uploadingImage) {
      setError(t('admin.menuUpload.error.uploadInProgress'));
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/admin/login");
        return;
      }

      const payload = {
        name: formData.name,
        description: formData.description || undefined,
        price: parseFloat(formData.price),
        imageUrl: formData.imageUrl || undefined,
        imageThumbUrl: formData.imageThumbUrl || undefined,
        imageThumbMeta: formData.imageThumbMeta || undefined,
        stockPhotoId: formData.stockPhotoId || null,
        isActive: formData.isActive,
        isSpicy: formData.isSpicy,
        isBestSeller: formData.isBestSeller,
        isSignature: formData.isSignature,
        isRecommended: formData.isRecommended,
        trackStock: formData.trackStock,
        stockQty: formData.trackStock && formData.stockQty ? parseInt(formData.stockQty) : undefined,
        dailyStockTemplate: formData.trackStock && formData.dailyStockTemplate ? parseInt(formData.dailyStockTemplate) : undefined,
        autoResetStock: formData.autoResetStock,
      };

      const response = await fetch(`/api/merchant/menu/${menuId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update menu item");
      }

      // Update categories if changed
      const categoriesChanged = JSON.stringify(selectedCategoryIds.sort()) !== JSON.stringify(originalCategoryIds.sort());
      if (categoriesChanged) {
        await fetch(`/api/merchant/menu/${menuId}/categories`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ categoryIds: selectedCategoryIds }),
        });
      }

      router.push(menuListUrl);

    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setSubmitting(false);
    }
  };

  if (loading) {
    return <FormPageSkeleton />;
  }

  return (
    <div>
      <PageBreadcrumb pageTitle="Edit Menu Item" />

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
        {/* Header */}
        <div className="border-b border-gray-200 bg-gray-50/50 px-6 py-5 dark:border-gray-800 dark:bg-gray-900/50">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Edit Menu Item</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Update your menu item details</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-6 flex items-center gap-3 rounded-xl border border-error-200 bg-error-50 p-4 dark:border-error-800 dark:bg-error-900/20">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-error-100 text-error-600 dark:bg-error-900/30 dark:text-error-400">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-sm font-medium text-error-700 dark:text-error-300">{error}</p>
          </div>
        )}

        {success && (
          <div className="mx-6 mt-6 flex items-center gap-3 rounded-xl border border-success-200 bg-success-50 p-4 dark:border-success-800 dark:bg-success-900/20">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success-100 text-success-600 dark:bg-success-900/30 dark:text-success-400">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-sm font-medium text-success-700 dark:text-success-300">{success}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 lg:p-8" data-tutorial="menu-form">
          {/* Main Content Grid */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Left Column - Basic Info */}
            <div className="space-y-6 lg:col-span-2">
              {/* Name Input */}
              <div data-tutorial="menu-name">
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  Item Name <span className="text-error-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="e.g., Nasi Goreng Special"
                  className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
                />
              </div>

              {/* Description */}
              <div data-tutorial="menu-description">
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                  </svg>
                  Description <span className="text-xs text-gray-400">(Optional)</span>
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Describe your menu item, ingredients, serving size..."
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 resize-none"
                />
              </div>

              {/* Price */}
              <div data-tutorial="menu-price">
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Price <span className="text-error-500">*</span>
                </label>
                <div className="relative max-w-xs">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500">
                    {currencySymbol}
                  </span>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    required
                    min="0"
                    step={getCurrencyConfig(currency).decimals === 0 ? '1' : '0.01'}
                    onWheel={(e) => {
                      (e.target as HTMLInputElement).blur();
                    }}
                    placeholder="0.00"
                    className="h-12 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  />
                </div>
              </div>

              {/* Status Toggle */}
              <div data-tutorial="menu-status" className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/50">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${formData.isActive ? 'bg-success-100 text-success-600 dark:bg-success-900/30 dark:text-success-400' : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800 dark:text-white">Active Status</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Available for customers to order</p>
                  </div>
                </div>
                <StatusToggle
                  isActive={formData.isActive}
                  onToggle={() => setFormData((prev) => ({ ...prev, isActive: !prev.isActive }))}
                  size="md"
                  activeLabel={t('common.active')}
                  inactiveLabel={t('common.inactive')}
                />
              </div>
            </div>

            {/* Right Column - Image Upload */}
            <div data-tutorial="menu-image" className="lg:col-span-1">
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Menu Image
              </label>

              {/* Image Source Tabs */}
              <div className="mb-3 flex rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
                <button
                  type="button"
                  onClick={() => setImageSource('upload')}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all ${
                    imageSource === 'upload'
                      ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                      : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                  }`}
                >
                  <FaUpload className="h-3.5 w-3.5" />
                  Upload
                </button>
                <button
                  type="button"
                  onClick={() => setImageSource('stock')}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all ${
                    imageSource === 'stock'
                      ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                      : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                  }`}
                >
                  <FaImages className="h-3.5 w-3.5" />
                  Stock Photos
                </button>
              </div>

              <div className={`relative rounded-2xl border-2 border-dashed transition-all ${formData.imageUrl
                ? 'border-success-300 bg-success-50/50 dark:border-success-700 dark:bg-success-900/10'
                : 'border-gray-300 bg-gray-50 hover:border-brand-400 hover:bg-brand-50/50 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-brand-600'
                }`}>
                {formData.imageUrl ? (
                  <div className="relative aspect-square overflow-hidden rounded-xl">
                    <Image
                      src={formData.imageUrl}
                      alt="Preview"
                      fill
                      className="object-cover cursor-pointer"
                      onClick={() => setIsModalOpen(true)}
                    />
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, imageUrl: '', imageThumbUrl: '', imageThumbMeta: null, stockPhotoId: null }))}
                      className="absolute right-2 top-2 rounded-full bg-white/90 p-2 text-gray-600 shadow-lg transition-all hover:bg-error-100 hover:text-error-600 dark:bg-gray-800/90 dark:text-gray-300"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : imageSource === 'upload' ? (
                  <label className="flex aspect-square cursor-pointer flex-col items-center justify-center p-6">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                      className="sr-only"
                    />

                    {uploadingImage ? (
                      <div className="flex flex-col items-center gap-3">
                        <div className="relative h-16 w-16">
                          <svg className="h-16 w-16 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-brand-600">{uploadProgress}%</span>
                        </div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Uploading...</p>
                        <div className="h-2 w-32 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                          <div
                            className="h-full rounded-full bg-brand-500 transition-all duration-200"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400">
                          <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Click to upload</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">All image formats supported. Max 5MB</p>
                      </>
                    )}
                  </label>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowStockPhotoPicker(true)}
                    disabled={uploadingImage}
                    className="flex aspect-square w-full cursor-pointer flex-col items-center justify-center p-6"
                  >
                    <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400">
                      <FaImages className="h-7 w-7" />
                    </div>
                    <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Browse Stock Photos
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Choose from available stock photos
                    </p>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Stock Photo Picker Modal */}
          <StockPhotoPicker
            isOpen={showStockPhotoPicker}
            onClose={() => setShowStockPhotoPicker(false)}
            onSelect={(selection) => {
              setFormData(prev => ({
                ...prev,
                imageUrl: selection.imageUrl,
                imageThumbUrl: selection.thumbnailUrl || '',
                imageThumbMeta: null,
                stockPhotoId: selection.stockPhotoId,
              }));
              setImageSource('stock');
              setShowStockPhotoPicker(false);
            }}
            currentImageUrl={formData.imageUrl}
            currentStockPhotoId={formData.stockPhotoId || undefined}
          />

          {/* Divider */}
          <div className="my-8 border-t border-gray-100 dark:border-gray-800" />

          {/* Category Selection Section */}
          <div className="mb-8">
            <div data-tutorial="menu-category" className={`rounded-2xl border-2 p-5 transition-all ${showCategorySection
              ? 'border-brand-300 bg-brand-50/50 dark:border-brand-700 dark:bg-brand-900/10'
              : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900/50 dark:hover:border-gray-700'
              }`}>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${showCategorySection ? 'bg-brand-100 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-800 dark:text-white">Menu Categories</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{selectedCategoryIds.length} categories selected</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCategorySection(!showCategorySection)}
                  className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-colors ${showCategorySection
                    ? 'bg-brand-100 text-brand-700 hover:bg-brand-200 dark:bg-brand-900/30 dark:text-brand-400'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'
                    }`}
                >
                  {showCategorySection ? 'Hide' : 'Manage'}
                  <svg className={`h-4 w-4 transition-transform ${showCategorySection ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              {showCategorySection && (
                <div className="space-y-3">
                  {selectedCategoryIds.length > 0 && (
                    <div className="flex flex-wrap gap-2 pb-2">
                      {selectedCategoryIds.map(catId => {
                        const cat = allCategories.find(c => c.id === catId);
                        return cat ? (
                          <span key={catId} className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-xs font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-400">
                            {cat.name}
                            <button
                              type="button"
                              onClick={() => setSelectedCategoryIds(prev => prev.filter(id => id !== catId))}
                              className="hover:text-brand-900 dark:hover:text-brand-200"
                            >
                              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}
                  <input
                    type="text"
                    placeholder="Search categories..."
                    value={categorySearch}
                    onChange={(e) => setCategorySearch(e.target.value)}
                    className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white/90"
                  />
                  <div className="max-h-40 overflow-y-auto space-y-1.5">
                    {filteredCategories.map(cat => {
                      const isSelected = selectedCategoryIds.includes(cat.id);
                      return (
                        <label key={cat.id} className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2 transition-colors ${isSelected
                          ? 'border-brand-300 bg-brand-50 dark:border-brand-700 dark:bg-brand-900/20'
                          : 'border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700'
                          }`}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              if (isSelected) {
                                setSelectedCategoryIds(prev => prev.filter(id => id !== cat.id));
                              } else {
                                setSelectedCategoryIds(prev => [...prev, cat.id]);
                              }
                            }}
                            className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">{cat.name}</span>
                        </label>
                      );
                    })}
                    {filteredCategories.length === 0 && (
                      <p className="py-2 text-center text-xs text-gray-500">No categories found</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Settings Cards Row */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

            {/* Stock Management Card */}
            <div data-tutorial="menu-stock" className={`rounded-2xl border-2 p-5 transition-all ${formData.trackStock
              ? 'border-warning-300 bg-warning-50/50 dark:border-warning-700 dark:bg-warning-900/10'
              : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900/50 dark:hover:border-gray-700'
              }`}>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${formData.trackStock ? 'bg-warning-100 text-warning-600 dark:bg-warning-900/30 dark:text-warning-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-800 dark:text-white">Stock Tracking</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Monitor inventory levels</p>
                  </div>
                </div>
                <StatusToggle
                  isActive={formData.trackStock}
                  onToggle={() => setFormData((prev) => ({ ...prev, trackStock: !prev.trackStock }))}
                  size="md"
                  activeLabel={t('common.on')}
                  inactiveLabel={t('common.off')}
                />
              </div>

              {formData.trackStock && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">Current Stock</label>
                      <input
                        type="number"
                        name="stockQty"
                        value={formData.stockQty}
                        onChange={handleChange}
                        required={formData.trackStock}
                        min="0"
                        placeholder="0"
                        className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 focus:border-warning-400 focus:outline-none focus:ring-2 focus:ring-warning-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">Daily Reset</label>
                      <input
                        type="number"
                        name="dailyStockTemplate"
                        value={formData.dailyStockTemplate}
                        onChange={handleChange}
                        min="0"
                        placeholder="0"
                        className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 focus:border-warning-400 focus:outline-none focus:ring-2 focus:ring-warning-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-4 rounded-lg bg-warning-100/50 p-3 transition-colors hover:bg-warning-100 dark:bg-warning-900/20 dark:hover:bg-warning-900/30">
                    <span className="text-sm text-warning-700 dark:text-warning-300">Auto-reset stock daily at midnight</span>
                    <StatusToggle
                      isActive={formData.autoResetStock}
                      onToggle={() => setFormData((prev) => ({ ...prev, autoResetStock: !prev.autoResetStock }))}
                      size="sm"
                      activeLabel={t('common.on')}
                      inactiveLabel={t('common.off')}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Menu Badges Card */}
            <div className="rounded-2xl border-2 border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900/50">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-800 dark:text-white">Menu Badges</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Highlight special attributes</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className={`flex items-center justify-between gap-3 rounded-xl border-2 p-3 transition-all ${formData.isSpicy ? 'border-amber-400 bg-amber-50 dark:border-amber-600 dark:bg-amber-900/20' : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800/50 dark:hover:border-gray-600'}`}>
                  <div className="flex items-center gap-3">
                    <div className="group relative h-5 w-5 overflow-hidden rounded-full border border-gray-400/50 bg-white transition-all duration-300 hover:ring-2 hover:ring-amber-300 hover:ring-offset-1 dark:border-gray-500/50 dark:bg-gray-800">
                      <Image src="/images/menu-badges/spicy.png" alt="Spicy" width={20} height={20} className="h-full w-full object-cover" />
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Spicy</span>
                  </div>
                  <StatusToggle
                    isActive={formData.isSpicy}
                    onToggle={() => setFormData((prev) => ({ ...prev, isSpicy: !prev.isSpicy }))}
                    size="sm"
                    activeLabel={t('common.on')}
                    inactiveLabel={t('common.off')}
                  />
                </div>

                <div className={`flex items-center justify-between gap-3 rounded-xl border-2 p-3 transition-all ${formData.isBestSeller ? 'border-amber-400 bg-amber-50 dark:border-amber-600 dark:bg-amber-900/20' : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800/50 dark:hover:border-gray-600'}`}>
                  <div className="flex items-center gap-3">
                    <div className="group relative h-5 w-5 overflow-hidden rounded-full border border-gray-400/50 bg-white transition-all duration-300 hover:ring-2 hover:ring-amber-300 hover:ring-offset-1 dark:border-gray-500/50 dark:bg-gray-800">
                      <Image src="/images/menu-badges/best-seller.png" alt="Best Seller" width={20} height={20} className="h-full w-full object-cover" />
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Best Seller</span>
                  </div>
                  <StatusToggle
                    isActive={formData.isBestSeller}
                    onToggle={() => setFormData((prev) => ({ ...prev, isBestSeller: !prev.isBestSeller }))}
                    size="sm"
                    activeLabel={t('common.on')}
                    inactiveLabel={t('common.off')}
                  />
                </div>

                <div className={`flex items-center justify-between gap-3 rounded-xl border-2 p-3 transition-all ${formData.isSignature ? 'border-purple-400 bg-purple-50 dark:border-purple-600 dark:bg-purple-900/20' : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800/50 dark:hover:border-gray-600'}`}>
                  <div className="flex items-center gap-3">
                    <div className="group relative h-5 w-5 overflow-hidden rounded-full border border-gray-400/50 bg-white transition-all duration-300 hover:ring-2 hover:ring-purple-300 hover:ring-offset-1 dark:border-gray-500/50 dark:bg-gray-800">
                      <Image src="/images/menu-badges/signature.png" alt="Signature" width={20} height={20} className="h-full w-full object-cover" />
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Signature</span>
                  </div>
                  <StatusToggle
                    isActive={formData.isSignature}
                    onToggle={() => setFormData((prev) => ({ ...prev, isSignature: !prev.isSignature }))}
                    size="sm"
                    activeLabel={t('common.on')}
                    inactiveLabel={t('common.off')}
                  />
                </div>

                <div className={`flex items-center justify-between gap-3 rounded-xl border-2 p-3 transition-all ${formData.isRecommended ? 'border-green-400 bg-green-50 dark:border-green-600 dark:bg-green-900/20' : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800/50 dark:hover:border-gray-600'}`}>
                  <div className="flex items-center gap-3">
                    <div className="group relative h-5 w-5 overflow-hidden rounded-full border border-gray-400/50 bg-white transition-all duration-300 hover:ring-2 hover:ring-green-300 hover:ring-offset-1 dark:border-gray-500/50 dark:bg-gray-800">
                      <Image src="/images/menu-badges/recommended.png" alt="Recommended" width={20} height={20} className="h-full w-full object-cover" />
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Recommended</span>
                  </div>
                  <StatusToggle
                    isActive={formData.isRecommended}
                    onToggle={() => setFormData((prev) => ({ ...prev, isRecommended: !prev.isRecommended }))}
                    size="sm"
                    activeLabel={t('common.on')}
                    inactiveLabel={t('common.off')}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Addon Categories Section - EDIT PAGE ONLY */}
          <div className="mt-8 rounded-2xl border-2 border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900/50">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-800 dark:text-white">Addon Categories</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{addonCategories.length} linked categories</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {addonCategories.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowViewAddonsModal(true)}
                    className="inline-flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700 transition-all hover:bg-brand-100 dark:border-brand-800 dark:bg-brand-900/30 dark:text-brand-400 dark:hover:bg-brand-900/40"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    View
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowManageAddonsModal(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white transition-all hover:bg-brand-600"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Manage
                </button>
              </div>
            </div>

            {addonCategories.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 py-8 text-center dark:border-gray-700 dark:bg-gray-900/50">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-800">
                  <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">No addon categories linked</p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">Click &quot;Manage&quot; to add categories</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {addonCategories.map((mac) => (
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
                      <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-bold text-brand-700 dark:bg-brand-900/30 dark:text-brand-400">
                        {mac.addonCategory.addonItems?.length || 0}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Fixed Footer */}
          <AdminFormFooter
            onCancel={() => {
              if (isBusy) return;
              router.push(menuListUrl);
            }}
            isSubmitting={submitting}
            submitLabel="Update Menu Item"
            submittingLabel="Updating..."
            cancelLabel="Back"
            disabled={!hasChanges() || isBusy}
            submitDataTutorial="menu-save-btn"
          />
        </form>
      </div>

      {/* Image Modal */}
      {isModalOpen && formData.imageUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75" onClick={() => setIsModalOpen(false)}>
          <div className="relative max-w-4xl max-h-full p-4">
            <button className="absolute top-2 right-2 text-white text-2xl font-bold" onClick={() => setIsModalOpen(false)}>&times;</button>
            <Image src={formData.imageUrl} alt="Menu full view" width={800} height={800} className="object-contain" unoptimized />
          </div>
        </div>
      )}

      {/* Modals */}
      {showViewAddonsModal && (
        <ViewMenuAddonCategoriesModal
          show={showViewAddonsModal}
          menuName={formData.name}
          addonCategories={addonCategories}
          currency={merchant?.currency || "AUD"}
          onClose={() => setShowViewAddonsModal(false)}
        />
      )}

      {showManageAddonsModal && (
        <ManageMenuAddonCategoriesModal
          show={showManageAddonsModal}
          menuId={menuId}
          menuName={formData.name}
          currentAddonCategories={addonCategories}
          onClose={() => setShowManageAddonsModal(false)}
          onSuccess={() => {
            setShowManageAddonsModal(false);
            refetchAddonCategories();
          }}
        />
      )}
    </div>
  );
}
