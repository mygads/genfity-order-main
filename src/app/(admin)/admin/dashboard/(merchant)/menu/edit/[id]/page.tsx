"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Image from "next/image";
import ManageMenuAddonCategoriesModal from "@/components/menu/ManageMenuAddonCategoriesModal";
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
  isActive: boolean;
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

export default function EditMenuPage() {
  const router = useRouter();
  const params = useParams();
  const menuId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [addonCategories, setAddonCategories] = useState<MenuAddonCategory[]>([]);
  const [showManageAddonsModal, setShowManageAddonsModal] = useState(false);
  const [showViewAddonsModal, setShowViewAddonsModal] = useState(false);
  
  const [formData, setFormData] = useState<MenuFormData>({
    name: "",
    description: "",
    price: "",
    imageUrl: "",
    isActive: true,
    trackStock: false,
    stockQty: "",
    dailyStockTemplate: "",
    autoResetStock: false,
  });

  useEffect(() => {
    const fetchData = async () => {
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
          throw new Error("Failed to fetch menu item");
        }

        const menuData = await menuResponse.json();
        const merchantData = await merchantResponse.json();
        
        if (merchantData.success && merchantData.data) {
          setMerchant(merchantData.data);
        }
        
        if (menuData.success && menuData.data) {
          const menu = menuData.data;
          setFormData({
            name: menu.name || "",
            description: menu.description || "",
            price: menu.price ? menu.price.toString() : "",
            imageUrl: menu.imageUrl || "",
            isActive: menu.isActive !== undefined ? menu.isActive : true,
            trackStock: menu.trackStock !== undefined ? menu.trackStock : false,
            stockQty: menu.stockQty ? menu.stockQty.toString() : "",
            dailyStockTemplate: menu.dailyStockTemplate ? menu.dailyStockTemplate.toString() : "",
            autoResetStock: menu.autoResetStock !== undefined ? menu.autoResetStock : false,
          });
          
          // Set addon categories
          if (menu.addonCategories) {
            setAddonCategories(menu.addonCategories);
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

    // Validate file
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Invalid file type. Only JPEG, PNG, and WebP are allowed.');
      setTimeout(() => setError(null), 3000);
      return;
    }

    const maxSizeMB = 5;
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setError(`File size must be less than ${maxSizeMB}MB.`);
      setTimeout(() => setError(null), 3000);
      return;
    }

    try {
      setUploadingImage(true);
      setError(null);
      setUploadProgress(0);
      setUploadMessage('Preparing upload...');

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      formDataUpload.append('menuId', menuId);

      setUploadMessage('Uploading image...');

      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/merchant/upload/menu-image', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formDataUpload,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to upload image');
      }

      setUploadMessage('Upload complete!');
      setFormData(prev => ({
        ...prev,
        imageUrl: data.data.url,
      }));

      setSuccess('Image uploaded successfully!');
      setTimeout(() => {
        setSuccess(null);
        setUploadMessage(null);
        setUploadProgress(0);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image');
      setTimeout(() => setError(null), 5000);
      setUploadMessage(null);
      setUploadProgress(0);
    } finally {
      setUploadingImage(false);
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
        isActive: formData.isActive,
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

      router.push("/admin/dashboard/menu");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div>
        <PageBreadcrumb pageTitle="Edit" />
        <div className="mt-6 py-10 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-500 border-r-transparent"></div>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageBreadcrumb pageTitle="Edit Menu Item" />

      <div className="space-y-6">
        {/* Toast Notifications */}
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

        {/* Upload Progress Toast */}
        {uploadMessage && (
          <div className="rounded-lg bg-brand-50 p-4 dark:bg-brand-900/20">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-brand-600 dark:text-brand-400">{uploadMessage}</p>
              <span className="text-sm font-semibold text-brand-600 dark:text-brand-400">{uploadProgress}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-brand-100 dark:bg-brand-900/40">
              <div 
                className="h-full bg-brand-500 transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Image Upload & Preview Card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03] lg:p-5">
          <h3 className="mb-3 text-lg font-semibold text-gray-800 dark:text-white/90">Menu Image</h3>
          
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Image Preview */}
            {formData.imageUrl ? (
              <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Current Image
            </label>
            <div className="relative aspect-square w-full max-w-32 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer" onClick={() => setIsModalOpen(true)}>
              <Image 
            src={formData.imageUrl} 
            alt="Menu preview"
            fill
            className="object-cover"
            unoptimized
              />
            </div>
              </div>
            ) : (
              <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              No Image
            </label>
            <div className="flex aspect-square w-full max-w-32 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
              <div className="text-center">
            <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">No image uploaded</p>
              </div>
            </div>
              </div>
            )}

            {/* Upload Controls */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Upload New Image
              </label>
              <div className="space-y-3">
            <div className="flex items-center justify-center w-full">
              <label className="flex w-full cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-brand-300 bg-brand-50 px-4 py-6 hover:bg-brand-100 dark:border-brand-700 dark:bg-brand-900/20 dark:hover:bg-brand-900/30">
            <svg className="mb-2 h-8 w-8 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="mb-1 text-sm font-medium text-brand-600 dark:text-brand-400">
              {uploadingImage ? 'Uploading...' : 'Click to upload'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              JPEG, PNG, WebP (max 5MB)
            </p>
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleImageUpload}
              disabled={uploadingImage}
              className="hidden"
            />
              </label>
            </div>
            
            {formData.imageUrl && (
              <button
            type="button"
            onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
            className="w-full rounded-lg border border-error-200 bg-error-50 px-3 py-2 text-sm font-medium text-error-600 hover:bg-error-100 dark:border-error-900/50 dark:bg-error-900/20 dark:text-error-400 dark:hover:bg-error-900/30"
              >
            Remove Image
              </button>
            )}
              </div>
            </div>
          </div>
        </div>

        {/* Image Modal */}
        {isModalOpen && formData.imageUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75" onClick={() => setIsModalOpen(false)}>
            <div className="relative max-w-4xl max-h-full p-4">
              <button
            className="absolute top-2 right-2 text-white text-2xl font-bold"
            onClick={() => setIsModalOpen(false)}
              >
            &times;
              </button>
              <Image
            src={formData.imageUrl}
            alt="Menu full view"
            width={800}
            height={800}
            className="object-contain"
            unoptimized
              />
            </div>
          </div>
        )}

        {/* Form Card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">Menu Details</h3>
          
          <form onSubmit={handleSubmit} className="space-y-6">

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Item Name <span className="text-error-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="e.g. Espresso"
              className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              placeholder="Describe your menu item..."
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Price <span className="text-error-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                  {merchant?.currency === 'IDR' ? 'Rp' : merchant?.currency === 'AUD' ? 'A$' : 'AUD'}
                </span>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  required
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="h-11 w-full rounded-lg border border-gray-200 bg-white pl-12 pr-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isActive"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
                className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Active (available for order)
              </label>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="trackStock"
                name="trackStock"
                checked={formData.trackStock}
                onChange={handleChange}
                className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
              />
              <label htmlFor="trackStock" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Track stock quantity
              </label>
            </div>
          </div>

          {formData.trackStock && (
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Stock Quantity <span className="text-error-500">*</span>
                </label>
                <input
                  type="number"
                  name="stockQty"
                  value={formData.stockQty}
                  onChange={handleChange}
                  required={formData.trackStock}
                  min="0"
                  placeholder="0"
                  className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Daily Stock Template <span className="text-xs text-gray-500">(Optional)</span>
                </label>
                <input
                  type="number"
                  name="dailyStockTemplate"
                  value={formData.dailyStockTemplate}
                  onChange={handleChange}
                  min="0"
                  placeholder="e.g., 50 (for auto-reset)"
                  className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Stock will auto-reset to this value daily if enabled
                </p>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="autoResetStock"
                  name="autoResetStock"
                  checked={formData.autoResetStock}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                />
                <label htmlFor="autoResetStock" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Auto-reset stock daily (requires template)
                </label>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-4 border-t border-gray-200 pt-6 dark:border-gray-800">
            <Link
              href="/admin/dashboard/menu"
              className="h-11 rounded-lg border border-gray-200 bg-white px-6 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-300 dark:hover:bg-white/[0.05] inline-flex items-center justify-center"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="h-11 rounded-lg bg-brand-500 px-6 text-sm font-medium text-white hover:bg-brand-600 focus:outline-none focus:ring-3 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Updating..." : "Update Menu Item"}
            </button>
          </div>
        </form>
      </div>

      {/* Addon Categories Section */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 lg:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Addon Categories
            </h3>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              {addonCategories.length} linked
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {addonCategories.length > 0 && (
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
            <button
              type="button"
              onClick={() => setShowManageAddonsModal(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white transition-all hover:bg-brand-600"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Manage Addons
            </button>
          </div>
        </div>

        <div>
          {addonCategories.length === 0 ? (
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
                Click &quot;Manage Addons&quot; to add categories
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {addonCategories.map((mac) => (
                <div
                  key={mac.addonCategoryId}
                  className="rounded-lg border border-gray-200 bg-white p-3.5 dark:border-gray-700 dark:bg-gray-900/50"
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
