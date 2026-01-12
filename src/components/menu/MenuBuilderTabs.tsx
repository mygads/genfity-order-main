'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Image from 'next/image';
import Link from 'next/link';
import { FileIcon, FolderIcon, PlusIcon, EyeIcon } from '@/icons';
import { useMerchant } from '@/context/MerchantContext';
import { getCurrencySymbol } from '@/lib/utils/format';
import { useToast } from '@/context/ToastContext';
import StockPhotoPicker from './StockPhotoPicker';

/**
 * Menu Builder Tabs Component
 * 
 * Unified tabbed interface for creating/editing menus with:
 * - Basic Info (name, price, description, stock, promo)
 * - Categories (multi-select from existing categories)
 * - Addons (multi-select from existing addon categories)
 * - Preview (customer-facing view)
 * 
 * Reduces menu creation time from 15 minutes to <5 minutes
 */

const menuBuilderSchema = z.object({
  name: z.string().min(1, 'Nama menu harus diisi'),
  description: z.string().optional(),
  price: z.number().positive('Harga harus lebih dari 0'),
  imageUrl: z.string().url().optional().or(z.literal('')),
  imageThumbUrl: z.string().url().optional().or(z.literal('')),
  isActive: z.boolean(),
  // Note: Promo is now managed via Special Prices page, not on individual menu items
  trackStock: z.boolean(),
  stockQty: z.number().int().min(0).optional().nullable(),
  dailyStockTemplate: z.number().int().min(0).optional().nullable(),
  autoResetStock: z.boolean(),
  // Menu attributes
  isSpicy: z.boolean().default(false),
  isBestSeller: z.boolean().default(false),
  isSignature: z.boolean().default(false),
  isRecommended: z.boolean().default(false),
  categoryIds: z.any().default([]), // Skip validation - akan di-override di handleFormSubmit
  addonCategoryIds: z.any().default([]), // Skip validation - akan di-override di handleFormSubmit
}).passthrough();

type MenuBuilderFormData = z.infer<typeof menuBuilderSchema>;

interface Category {
  id: number;
  name: string;
  description?: string;
}

interface AddonCategory {
  id: number;
  name: string;
  description?: string;
  minSelection: number;
  maxSelection?: number;
  addonItems?: Array<{
    id: number;
    name: string;
    price: number;
  }>;
}

interface MenuBuilderTabsProps {
  menuId?: number;
  initialData?: Partial<MenuBuilderFormData>;
  categories: Category[];
  addonCategories: AddonCategory[];
  onSubmit: (data: MenuBuilderFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

type TabKey = 'basic' | 'categories' | 'addons' | 'preview';

export default function MenuBuilderTabs({
  menuId,
  initialData,
  categories,
  addonCategories,
  onSubmit,
  onCancel,
  isLoading = false,
}: MenuBuilderTabsProps) {
  const { currency } = useMerchant();
  const { showError, showWarning } = useToast();
  const currencySymbol = getCurrencySymbol(currency);
  const [activeTab, setActiveTab] = useState<TabKey>('basic');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showStockPhotoPicker, setShowStockPhotoPicker] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<number[]>(
    initialData?.categoryIds || []
  );
  const [selectedAddonCategories, setSelectedAddonCategories] = useState<number[]>(
    initialData?.addonCategoryIds || []
  );
  const [imageError, setImageError] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(menuBuilderSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    shouldUseNativeValidation: false,
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      price: initialData?.price || 0,
      imageUrl: initialData?.imageUrl || '',
      imageThumbUrl: (initialData as Partial<MenuBuilderFormData> | undefined)?.imageThumbUrl || '',
      isActive: initialData?.isActive ?? true,
      // Note: Promo is now managed via Special Prices page
      trackStock: initialData?.trackStock || false,
      stockQty: initialData?.stockQty || null,
      dailyStockTemplate: initialData?.dailyStockTemplate || null,
      autoResetStock: initialData?.autoResetStock || false,
      // Menu attributes
      isSpicy: initialData?.isSpicy || false,
      isBestSeller: initialData?.isBestSeller || false,
      isSignature: initialData?.isSignature || false,
      isRecommended: initialData?.isRecommended || false,
      categoryIds: initialData?.categoryIds || [],
      addonCategoryIds: initialData?.addonCategoryIds || [],
    },
  });

  const watchTrackStock = watch('trackStock');
  const watchImageUrl = watch('imageUrl');

  useEffect(() => {
    setImageError(false);
  }, [watchImageUrl]);

  // Track the uploaded image URL (only for newly uploaded images, not initial data)
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [uploadedImageThumbUrl, setUploadedImageThumbUrl] = useState<string | null>(null);

  // Update form values when selections change
  useEffect(() => {
    setValue('categoryIds', selectedCategories, { shouldValidate: true, shouldDirty: true });
  }, [selectedCategories, setValue]);

  useEffect(() => {
    setValue('addonCategoryIds', selectedAddonCategories, { shouldValidate: true, shouldDirty: true });
  }, [selectedAddonCategories, setValue]);

  // Cleanup function to delete orphaned uploaded image
  const deleteUploadedImage = async (imageUrl: string, imageThumbUrl?: string | null) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token || !imageUrl) return;

      // Extract the file path from the URL for deletion
      await fetch('/api/merchant/upload/delete-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ imageUrl, imageThumbUrl: imageThumbUrl || undefined }),
      });
    } catch (error) {
      console.error('Failed to delete orphaned image:', error);
    }
  };

  // Cleanup on unmount if image was uploaded but menu not saved
  useEffect(() => {
    return () => {
      // Only cleanup if a new image was uploaded and form is dirty (not saved)
      if (uploadedImageUrl && isDirty) {
        deleteUploadedImage(uploadedImageUrl, uploadedImageThumbUrl);
      }
    };
  }, [uploadedImageUrl, uploadedImageThumbUrl, isDirty]);

  const handleFormSubmit = async (data: MenuBuilderFormData) => {
    // Manually set categoryIds and addonCategoryIds from state, convert to numbers
    const submissionData = {
      ...data,
      categoryIds: selectedCategories.map(id => typeof id === 'string' ? parseInt(id) : id),
      addonCategoryIds: selectedAddonCategories.map(id => typeof id === 'string' ? parseInt(id) : id),
    };

    try {
      await onSubmit(submissionData);
      // Clear the uploaded image tracking since it's now saved with the menu
      setUploadedImageUrl(null);
      setUploadedImageThumbUrl(null);
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type - accept all image formats
    if (!file.type.startsWith('image/')) {
      showError('Invalid file type. Please upload an image file.');
      return;
    }

    const maxSizeMB = 5;
    if (file.size > maxSizeMB * 1024 * 1024) {
      showError(`File size must be less than ${maxSizeMB}MB.`);
      return;
    }

    try {
      setUploadingImage(true);
      setUploadProgress(0);

      const formData = new FormData();
      formData.append('file', file);
      const token = localStorage.getItem('accessToken');

      // Use XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest();

      await new Promise<void>((resolve, reject) => {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(percentComplete);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const data = JSON.parse(xhr.responseText);
            const imageUrl = data.data.url;
            const imageThumbUrl = data.data.thumbUrl;
            const warnings = Array.isArray(data?.data?.warnings) ? data.data.warnings : [];
            setValue('imageUrl', imageUrl);
            setValue('imageThumbUrl', imageThumbUrl || '');
            // Track the uploaded image for cleanup if user cancels
            setUploadedImageUrl(imageUrl);
            setUploadedImageThumbUrl(imageThumbUrl || null);

            if (warnings.length > 0) {
              showWarning(warnings[0], 'Small image warning');
            }
            resolve();
          } else {
            try {
              const data = JSON.parse(xhr.responseText);
              reject(new Error(data.message || 'Failed to upload image'));
            } catch {
              reject(new Error('Failed to upload image'));
            }
          }
        });

        xhr.addEventListener('error', () => reject(new Error('Network error')));
        xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));

        xhr.open('POST', '/api/merchant/upload/menu-image');
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.send(formData);
      });
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to upload image');
    } finally {
      setUploadingImage(false);
      setUploadProgress(0);
    }
  };

  const toggleCategory = (categoryId: number) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const toggleAddonCategory = (addonCategoryId: number) => {
    setSelectedAddonCategories((prev) =>
      prev.includes(addonCategoryId)
        ? prev.filter((id) => id !== addonCategoryId)
        : [...prev, addonCategoryId]
    );
  };

  const tabs = [
    { key: 'basic' as TabKey, label: 'Basic Info', Icon: FileIcon },
    { key: 'categories' as TabKey, label: 'Categories', Icon: FolderIcon },
    { key: 'addons' as TabKey, label: 'Add-ons', Icon: PlusIcon },
    { key: 'preview' as TabKey, label: 'Preview', Icon: EyeIcon },
  ];

  const isTabComplete = (tab: TabKey): boolean => {
    const formData = watch();
    switch (tab) {
      case 'basic':
        return !!formData.name && formData.price > 0;
      case 'categories':
        return true; // Categories are optional - user can proceed without selecting
      case 'addons':
        return true; // Optional
      case 'preview':
        return true;
      default:
        return false;
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950" data-tutorial="builder-form">
      {/* Step Progress Indicator */}
      <div className="border-b border-gray-200 bg-gray-50/50 px-6 py-4 dark:border-gray-800 dark:bg-gray-900/50">
        <div className="flex items-center justify-between">
          {tabs.map((tab, index) => {
            const Icon = tab.Icon;
            const isCompleted = isTabComplete(tab.key);
            const isPreviousTabIncomplete = index > 0 && !isTabComplete(tabs[index - 1].key);
            const isDisabled = isPreviousTabIncomplete && tab.key !== activeTab;
            const isActive = activeTab === tab.key;
            const isPast = tabs.findIndex((t) => t.key === activeTab) > index;

            return (
              <div key={tab.key} className="flex flex-1 items-center">
                <button
                  type="button"
                  onClick={() => !isDisabled && setActiveTab(tab.key)}
                  disabled={isDisabled}
                  className={`group flex flex-col items-center gap-2 ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  {/* Step Circle */}
                  <div className={`relative flex h-10 w-10 items-center justify-center rounded-full transition-all ${isActive
                    ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/30 ring-4 ring-brand-100 dark:ring-brand-900/30'
                    : isPast || isCompleted
                      ? 'bg-success-500 text-white'
                      : isDisabled
                        ? 'bg-gray-200 text-gray-400 dark:bg-gray-800 dark:text-gray-600'
                        : 'bg-white text-gray-600 border-2 border-gray-300 group-hover:border-brand-400 dark:bg-gray-900 dark:border-gray-600 dark:text-gray-400'
                    }`}>
                    {isPast || (isCompleted && !isActive) ? (
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span className="text-sm font-semibold">{index + 1}</span>
                    )}
                  </div>

                  {/* Step Label */}
                  <div className="flex items-center gap-1.5">
                    <Icon className={`h-4 w-4 ${isActive ? 'text-brand-600 dark:text-brand-400'
                      : isDisabled ? 'text-gray-400 dark:text-gray-600'
                        : 'text-gray-500 dark:text-gray-400'
                      }`} />
                    <span className={`text-xs font-medium ${isActive ? 'text-brand-600 dark:text-brand-400'
                      : isDisabled ? 'text-gray-400 dark:text-gray-600'
                        : 'text-gray-600 dark:text-gray-400'
                      }`}>
                      {tab.label}
                    </span>
                  </div>
                </button>

                {/* Connector Line */}
                {index < tabs.length - 1 && (
                  <div className="mx-2 h-1 flex-1 rounded-full bg-gray-200 dark:bg-gray-800">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${isPast || isCompleted ? 'bg-success-500' : isActive ? 'bg-brand-300 dark:bg-brand-700' : ''
                        }`}
                      style={{ width: isPast || isCompleted ? '100%' : isActive ? '50%' : '0%' }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6 lg:p-8">
        {/* Basic Info Tab */}
        {activeTab === 'basic' && (
          <div className="space-y-6" data-tutorial="builder-basic">
            {/* Section Header */}
            <div className="mb-6">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">Basic Information</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Enter the essential details about your menu item
              </p>
            </div>

            {/* Main Content Grid - Name/Description on left, Image on right */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Left Column - Name, Description, Price */}
              <div className="space-y-5 lg:col-span-2">
                {/* Name Input with Icon */}
                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    Menu Name <span className="text-error-600">*</span>
                  </label>
                  <input
                    type="text"
                    {...register('name')}
                    className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
                    placeholder="e.g., Fried Rice Special"
                  />
                  {errors.name && (
                    <p className="mt-1.5 flex items-center gap-1 text-sm text-error-600 dark:text-error-400">
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.name.message}
                    </p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                    </svg>
                    Description <span className="text-xs text-gray-400">(Optional)</span>
                  </label>
                  <textarea
                    {...register('description')}
                    rows={4}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 resize-none"
                    placeholder="Describe your menu item, ingredients, serving size..."
                  />
                </div>

                {/* Price */}
                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Price <span className="text-error-600">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500">{currencySymbol}</span>
                    <input
                      type="number"
                      {...register('price', { valueAsNumber: true })}
                      className="h-12 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm text-gray-800 focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  {errors.price && (
                    <p className="mt-1.5 flex items-center gap-1 text-sm text-error-600 dark:text-error-400">
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.price.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Right Column - Image Upload */}
              <div className="lg:col-span-1" data-tutorial="builder-image">
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Menu Image
                </label>

                {/* Image Upload Area */}
                <div className={`relative rounded-2xl border-2 border-dashed transition-all ${watch('imageUrl')
                  ? 'border-success-300 bg-success-50/50 dark:border-success-700 dark:bg-success-900/10'
                  : 'border-gray-300 bg-gray-50 hover:border-brand-400 hover:bg-brand-50/50 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-brand-600'
                  }`}>
                  {watch('imageUrl') ? (
                    <div className="relative aspect-square overflow-hidden rounded-xl">
                      {watch('imageUrl') && !imageError ? (
                        <Image
                          src={watch('imageUrl') || ''}
                          alt="Preview"
                          fill
                          className="object-cover"
                          onError={() => setImageError(true)}
                          unoptimized
                        />
                      ) : null}
                      <button
                        type="button"
                        onClick={() => {
                          setValue('imageUrl', '');
                          setValue('imageThumbUrl', '');
                        }}
                        className="absolute right-2 top-2 rounded-full bg-white/90 p-2 text-gray-600 shadow-lg transition-all hover:bg-error-100 hover:text-error-600 dark:bg-gray-800/90 dark:text-gray-300"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
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
                          <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                            Click to upload image
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            All image formats supported. Max 5MB
                          </p>
                        </>
                      )}
                    </label>
                  )}
                </div>
                {/* Stock Photo Button */}
                <button
                  type="button"
                  onClick={() => setShowStockPhotoPicker(true)}
                  className="mt-3 w-full rounded-xl border-2 border-dashed border-gray-300 px-4 py-3 text-sm font-medium text-gray-600 transition-all hover:border-brand-400 hover:bg-brand-50 hover:text-brand-600 dark:border-gray-700 dark:text-gray-400 dark:hover:border-brand-500 dark:hover:bg-brand-900/20 dark:hover:text-brand-400"
                >
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Browse Stock Photos
                  </span>
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-100 dark:border-gray-800" />

            {/* Additional Settings - Stock Management */}
            <div className="grid grid-cols-1 gap-6">
              {/* Stock Management */}
              <div className={`rounded-2xl border-2 p-5 transition-all ${watchTrackStock
                ? 'border-warning-300 bg-warning-50/50 dark:border-warning-700 dark:bg-warning-900/10'
                : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900/50 dark:hover:border-gray-700'
                }`}>
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${watchTrackStock ? 'bg-warning-100 text-warning-600 dark:bg-warning-900/30 dark:text-warning-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                      }`}>
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-800 dark:text-white">Stock Tracking</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Monitor inventory levels</p>
                    </div>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input type="checkbox" {...register('trackStock')} className="peer sr-only" />
                    <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-warning-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-warning-300/20 dark:bg-gray-700 dark:peer-focus:ring-warning-800/20" />
                  </label>
                </div>

                {watchTrackStock && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">Current Stock</label>
                        <input
                          type="number"
                          {...register('stockQty', { valueAsNumber: true })}
                          className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 focus:border-warning-400 focus:outline-none focus:ring-2 focus:ring-warning-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                          placeholder="0"
                          min="0"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">Daily Reset Template</label>
                        <input
                          type="number"
                          {...register('dailyStockTemplate', { valueAsNumber: true })}
                          className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 focus:border-warning-400 focus:outline-none focus:ring-2 focus:ring-warning-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                          placeholder="0"
                          min="0"
                        />
                      </div>
                    </div>
                    <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-warning-100/50 p-3 transition-colors hover:bg-warning-100 dark:bg-warning-900/20 dark:hover:bg-warning-900/30">
                      <input
                        type="checkbox"
                        {...register('autoResetStock')}
                        className="h-4 w-4 rounded border-warning-400 text-warning-500 focus:ring-warning-500"
                      />
                      <span className="text-sm text-warning-700 dark:text-warning-300">Auto-reset stock daily at midnight</span>
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Menu Attributes */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/50">
              <h4 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Menu Attributes
              </h4>
              <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
                These badges will be displayed on the menu item to highlight special characteristics
              </p>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {/* Spicy */}
                <label
                  htmlFor="isSpicy"
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 transition-all hover:border-orange-300 hover:shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:hover:border-orange-500"
                >
                  <input
                    type="checkbox"
                    {...register('isSpicy')}
                    id="isSpicy"
                    className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                  />
                  <div className="flex items-center gap-2">
                    <div className="group relative h-5 w-5 cursor-pointer overflow-hidden rounded-full border border-gray-400/50 bg-white transition-all duration-300 hover:ring-2 hover:ring-orange-300 hover:ring-offset-1 dark:border-gray-500/50 dark:bg-gray-800">
                      <Image
                        src="/images/menu-badges/spicy.png"
                        alt="Spicy"
                        width={20}
                        height={20}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Spicy</span>
                  </div>
                </label>

                {/* Best Seller */}
                <label
                  htmlFor="isBestSeller"
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 transition-all hover:border-amber-300 hover:shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:hover:border-amber-500"
                >
                  <input
                    type="checkbox"
                    {...register('isBestSeller')}
                    id="isBestSeller"
                    className="h-4 w-4 rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                  />
                  <div className="flex items-center gap-2">
                    <div className="group relative h-5 w-5 cursor-pointer overflow-hidden rounded-full border border-gray-400/50 bg-white transition-all duration-300 hover:ring-2 hover:ring-amber-300 hover:ring-offset-1 dark:border-gray-500/50 dark:bg-gray-800">
                      <Image
                        src="/images/menu-badges/best-seller.png"
                        alt="Best Seller"
                        width={20}
                        height={20}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Best Seller</span>
                  </div>
                </label>

                {/* Signature */}
                <label
                  htmlFor="isSignature"
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 transition-all hover:border-purple-300 hover:shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:hover:border-purple-500"
                >
                  <input
                    type="checkbox"
                    {...register('isSignature')}
                    id="isSignature"
                    className="h-4 w-4 rounded border-gray-300 text-purple-500 focus:ring-purple-500"
                  />
                  <div className="flex items-center gap-2">
                    <div className="group relative h-5 w-5 cursor-pointer overflow-hidden rounded-full border border-gray-400/50 bg-white transition-all duration-300 hover:ring-2 hover:ring-purple-300 hover:ring-offset-1 dark:border-gray-500/50 dark:bg-gray-800">
                      <Image
                        src="/images/menu-badges/signature.png"
                        alt="Signature"
                        width={20}
                        height={20}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Signature</span>
                  </div>
                </label>

                {/* Recommended */}
                <label
                  htmlFor="isRecommended"
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 transition-all hover:border-green-300 hover:shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:hover:border-green-500"
                >
                  <input
                    type="checkbox"
                    {...register('isRecommended')}
                    id="isRecommended"
                    className="h-4 w-4 rounded border-gray-300 text-green-500 focus:ring-green-500"
                  />
                  <div className="flex items-center gap-2">
                    <div className="group relative h-5 w-5 cursor-pointer overflow-hidden rounded-full border border-gray-400/50 bg-white transition-all duration-300 hover:ring-2 hover:ring-green-300 hover:ring-offset-1 dark:border-gray-500/50 dark:bg-gray-800">
                      <Image
                        src="/images/menu-badges/recommended.png"
                        alt="Recommended"
                        width={20}
                        height={20}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Recommended</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Active Status */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                {...register('isActive')}
                id="isActive"
                className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Menu is Active (visible to customers)
              </label>
            </div>
          </div>
        )}

        {/* Categories Tab */}
        {activeTab === 'categories' && (
          <div className="space-y-6" data-tutorial="builder-categories">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Select Categories</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Choose one or more categories where this menu should appear
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => toggleCategory(category.id)}
                  className={`group relative rounded-lg border-2 p-4 text-left transition-all ${selectedCategories.includes(category.id)
                    ? 'border-brand-500 bg-brand-50 dark:border-brand-500 dark:bg-brand-900/10'
                    : 'border-gray-200 bg-white hover:border-brand-300 dark:border-gray-800 dark:bg-gray-900/50 dark:hover:border-brand-600'
                    }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-800 dark:text-white/90">{category.name}</h4>
                      {category.description && (
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                          {category.description}
                        </p>
                      )}
                    </div>
                    {selectedCategories.includes(category.id) && (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-500 text-white">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {selectedCategories.length > 0 && (
              <div className="mt-4 rounded-lg border border-success-200 bg-success-50 p-4 dark:border-success-800 dark:bg-success-900/20">
                <p className="text-sm text-success-700 dark:text-success-400">
                  ✓ {selectedCategories.length} {selectedCategories.length === 1 ? 'category' : 'categories'} selected
                </p>
              </div>
            )}
          </div>
        )}

        {/* Addons Tab */}
        {activeTab === 'addons' && (
          <div className="space-y-6" data-tutorial="builder-addons">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Select Add-on Categories</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Add-ons are optional. Customers can choose them when ordering.
              </p>
            </div>

            {addonCategories.length === 0 ? (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center dark:border-gray-800 dark:bg-gray-900/50">
                <p className="text-sm text-gray-500 dark:text-gray-400">No add-on categories available</p>
              </div>
            ) : (
              <div className="space-y-3">
                {addonCategories.map((addonCat) => (
                  <button
                    key={addonCat.id}
                    type="button"
                    onClick={() => toggleAddonCategory(addonCat.id)}
                    className={`group w-full rounded-lg border-2 p-4 text-left transition-all ${selectedAddonCategories.includes(addonCat.id)
                      ? 'border-brand-500 bg-brand-50 dark:border-brand-500 dark:bg-brand-900/10'
                      : 'border-gray-200 bg-white hover:border-brand-300 dark:border-gray-800 dark:bg-gray-900/50 dark:hover:border-brand-600'
                      }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-gray-800 dark:text-white/90">{addonCat.name}</h4>
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                            Min: {addonCat.minSelection} | Max: {addonCat.maxSelection || '∞'}
                          </span>
                        </div>
                        {addonCat.description && (
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {addonCat.description}
                          </p>
                        )}
                        {addonCat.addonItems && addonCat.addonItems.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {addonCat.addonItems.slice(0, 4).map((item) => (
                              <span
                                key={item.id}
                                className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                              >
                                {item.name} (+${item.price.toFixed(2)})
                              </span>
                            ))}
                            {addonCat.addonItems.length > 4 && (
                              <span className="text-xs text-gray-500 dark:text-gray-500">
                                +{addonCat.addonItems.length - 4} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="shrink-0">
                        {selectedAddonCategories.includes(addonCat.id) && (
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-500 text-white">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Preview Tab */}
        {activeTab === 'preview' && (
          <div className="space-y-6" data-tutorial="builder-preview">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Customer Preview</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                This is how customers will see your menu
              </p>
            </div>

            <div className="mx-auto max-w-2xl">
              <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900/50">
                {watch('imageUrl') && (
                  <div className="mb-4 overflow-hidden rounded-lg">
                    {!imageError && (
                      <Image
                        src={watch('imageUrl') || ''}
                        alt={watch('name')}
                        fill
                        className="object-cover"
                        onError={() => setImageError(true)}
                        unoptimized
                      />
                    )}
                  </div>
                )}

                <h2 className="text-2xl font-bold text-gray-800 dark:text-white/90">
                  {watch('name') || 'Menu Name'}
                </h2>

                {/* Menu Attribute Badges */}
                {(watch('isSpicy') || watch('isBestSeller') || watch('isSignature') || watch('isRecommended')) && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {watch('isSpicy') && (
                      <div
                        className="group relative h-6 w-6 cursor-pointer overflow-hidden rounded-full border border-gray-400/50 bg-white transition-all duration-300 hover:ring-2 hover:ring-orange-300 hover:ring-offset-1 dark:border-gray-500/50 dark:bg-gray-800"
                        title="Spicy"
                      >
                        <Image
                          src="/images/menu-badges/spicy.png"
                          alt="Spicy"
                          fill
                          className="object-cover transition-opacity duration-300 group-hover:opacity-80"
                        />
                      </div>
                    )}
                    {watch('isBestSeller') && (
                      <div
                        className="group relative h-6 w-6 cursor-pointer overflow-hidden rounded-full border border-gray-400/50 bg-white transition-all duration-300 hover:ring-2 hover:ring-amber-300 hover:ring-offset-1 dark:border-gray-500/50 dark:bg-gray-800"
                        title="Best Seller"
                      >
                        <Image
                          src="/images/menu-badges/best-seller.png"
                          alt="Best Seller"
                          fill
                          className="object-cover transition-opacity duration-300 group-hover:opacity-80"
                        />
                      </div>
                    )}
                    {watch('isSignature') && (
                      <div
                        className="group relative h-6 w-6 cursor-pointer overflow-hidden rounded-full border border-gray-400/50 bg-white transition-all duration-300 hover:ring-2 hover:ring-purple-300 hover:ring-offset-1 dark:border-gray-500/50 dark:bg-gray-800"
                        title="Signature"
                      >
                        <Image
                          src="/images/menu-badges/signature.png"
                          alt="Signature"
                          fill
                          className="object-cover transition-opacity duration-300 group-hover:opacity-80"
                        />
                      </div>
                    )}
                    {watch('isRecommended') && (
                      <div
                        className="group relative h-6 w-6 cursor-pointer overflow-hidden rounded-full border border-gray-400/50 bg-white transition-all duration-300 hover:ring-2 hover:ring-green-300 hover:ring-offset-1 dark:border-gray-500/50 dark:bg-gray-800"
                        title="Recommended"
                      >
                        <Image
                          src="/images/menu-badges/recommended.png"
                          alt="Recommended"
                          fill
                          className="object-cover transition-opacity duration-300 group-hover:opacity-80"
                        />
                      </div>
                    )}
                  </div>
                )}

                {watch('description') && (
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    {watch('description')}
                  </p>
                )}

                {/* Price display - Promo is now managed via SpecialPrice table */}
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-gray-800 dark:text-white/90">
                    ${(watch('price') as number)?.toFixed(2) || '0.00'}
                  </span>
                </div>

                {selectedCategories.length > 0 && (
                  <div className="mt-4 border-t border-gray-200 pt-4 dark:border-gray-800">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Categories
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedCategories.map((catId) => {
                        const cat = categories.find((c) => c.id === catId);
                        return (
                          <span
                            key={catId}
                            className="inline-flex rounded-full bg-brand-100 px-3 py-1 text-xs font-medium text-brand-700 dark:bg-brand-900/20 dark:text-brand-400"
                          >
                            {cat?.name}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {selectedAddonCategories.length > 0 && (
                  <div className="mt-4 border-t border-gray-200 pt-4 dark:border-gray-800">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Available Add-ons
                    </p>
                    <div className="space-y-1.5">
                      {selectedAddonCategories.map((addonCatId) => {
                        const addonCat = addonCategories.find((ac) => ac.id === addonCatId);
                        return (
                          <div key={addonCatId} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <svg className="h-4 w-4 text-success-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            {addonCat?.name}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {watch('trackStock') && watch('stockQty') !== undefined && watch('stockQty') !== null && (
                  <div className="mt-4 border-t border-gray-200 pt-4 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${(watch('stockQty') || 0) > 10
                        ? 'bg-success-100 text-success-700 dark:bg-success-900/20 dark:text-success-400'
                        : (watch('stockQty') || 0) > 0
                          ? 'bg-warning-100 text-warning-700 dark:bg-warning-900/20 dark:text-warning-400'
                          : 'bg-error-100 text-error-700 dark:bg-error-900/20 dark:text-error-400'
                        }`}>
                        {(watch('stockQty') || 0) > 0 ? '● In Stock' : '● Out of Stock'}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {watch('stockQty')} available
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-8 flex items-center justify-between border-t border-gray-200 pt-6 dark:border-gray-800">
          {(isDirty || menuId) ? (
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex h-11 items-center rounded-lg border border-gray-200 bg-white px-6 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              disabled={isLoading}
            >
              Cancel
            </button>
          ) : (
            <Link
              href="/admin/dashboard/menu"
              className="inline-flex h-11 items-center rounded-lg border border-gray-200 bg-white px-6 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              ← Back to Menu
            </Link>
          )}

          <div className="flex gap-3">
            {activeTab !== 'basic' && (
              <button
                type="button"
                onClick={() => {
                  const currentIndex = tabs.findIndex((t) => t.key === activeTab);
                  if (currentIndex > 0) {
                    setActiveTab(tabs[currentIndex - 1].key);
                  }
                }}
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-brand-500 bg-white px-6 text-sm font-medium text-brand-600 transition-colors hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-800 dark:hover:bg-brand-900/10"
                disabled={isLoading}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Previous
              </button>
            )}

            {activeTab !== 'preview' ? (
              <button
                type="button"
                onClick={() => {
                  const currentIndex = tabs.findIndex((t) => t.key === activeTab);
                  if (currentIndex < tabs.length - 1) {
                    setActiveTab(tabs[currentIndex + 1].key);
                  }
                }}
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-brand-500 px-6 text-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isLoading || !isTabComplete(activeTab)}
              >
                Next
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ) : (
              <button
                type="submit"
                data-tutorial="builder-save"
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-success-500 px-8 text-sm font-medium text-white transition-colors hover:bg-success-600 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isLoading || !watch('name') || !watch('price') || watch('price') <= 0}
              >
                {isLoading ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {menuId ? 'Update Menu' : 'Create Menu'}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Stock Photo Picker Modal */}
      <StockPhotoPicker
        isOpen={showStockPhotoPicker}
        onClose={() => setShowStockPhotoPicker(false)}
        onSelect={(selection) => {
          setValue('imageUrl', selection.imageUrl);
          setValue('imageThumbUrl', selection.thumbnailUrl || '');
          setShowStockPhotoPicker(false);
        }}
      />
    </div>
  );
}
