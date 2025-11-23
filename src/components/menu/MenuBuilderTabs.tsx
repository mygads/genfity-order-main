'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FileIcon, FolderIcon, PlusIcon, EyeIcon } from '@/icons';

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
  isActive: z.boolean(),
  isPromo: z.boolean(),
  promoPrice: z.number().positive().optional().nullable(),
  promoStartDate: z.string().optional().nullable(),
  promoEndDate: z.string().optional().nullable(),
  trackStock: z.boolean(),
  stockQty: z.number().int().min(0).optional().nullable(),
  dailyStockTemplate: z.number().int().min(0).optional().nullable(),
  autoResetStock: z.boolean(),
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
  const [activeTab, setActiveTab] = useState<TabKey>('basic');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<number[]>(
    initialData?.categoryIds || []
  );
  const [selectedAddonCategories, setSelectedAddonCategories] = useState<number[]>(
    initialData?.addonCategoryIds || []
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
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
      isActive: initialData?.isActive ?? true,
      isPromo: initialData?.isPromo || false,
      promoPrice: initialData?.promoPrice || null,
      promoStartDate: initialData?.promoStartDate || null,
      promoEndDate: initialData?.promoEndDate || null,
      trackStock: initialData?.trackStock || false,
      stockQty: initialData?.stockQty || null,
      dailyStockTemplate: initialData?.dailyStockTemplate || null,
      autoResetStock: initialData?.autoResetStock || false,
      categoryIds: initialData?.categoryIds || [],
      addonCategoryIds: initialData?.addonCategoryIds || [],
    },
  });

  const watchIsPromo = watch('isPromo');
  const watchTrackStock = watch('trackStock');

  // Update form values when selections change
  useEffect(() => {
    setValue('categoryIds', selectedCategories, { shouldValidate: true, shouldDirty: true });
  }, [selectedCategories, setValue]);

  useEffect(() => {
    setValue('addonCategoryIds', selectedAddonCategories, { shouldValidate: true, shouldDirty: true });
  }, [selectedAddonCategories, setValue]);

  const handleFormSubmit = async (data: MenuBuilderFormData) => {
    // Manually set categoryIds and addonCategoryIds from state, convert to numbers
    const submissionData = {
      ...data,
      categoryIds: selectedCategories.map(id => typeof id === 'string' ? parseInt(id) : id),
      addonCategoryIds: selectedAddonCategories.map(id => typeof id === 'string' ? parseInt(id) : id),
    };
    
    try {
      await onSubmit(submissionData);
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('Invalid file type. Only JPEG, PNG, and WebP are allowed.');
      return;
    }

    const maxSizeMB = 5;
    if (file.size > maxSizeMB * 1024 * 1024) {
      alert(`File size must be less than ${maxSizeMB}MB.`);
      return;
    }

    try {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/merchant/upload/menu-image', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to upload image');
      }

      setValue('imageUrl', data.data.url);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to upload image');
    } finally {
      setUploadingImage(false);
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
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-800">
        <div className="flex overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.Icon;
            const isCompleted = isTabComplete(tab.key);
            const tabIndex = tabs.findIndex((t) => t.key === tab.key);
            const isPreviousTabIncomplete = tabIndex > 0 && !isTabComplete(tabs[tabIndex - 1].key);
            const isDisabled = isPreviousTabIncomplete && tab.key !== activeTab;
            
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => !isDisabled && setActiveTab(tab.key)}
                disabled={isDisabled}
                className={`relative flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors whitespace-nowrap ${
                  isDisabled
                    ? 'cursor-not-allowed text-gray-400 dark:text-gray-600'
                    : activeTab === tab.key
                    ? 'text-brand-600 dark:text-brand-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{tab.label}</span>
                {isCompleted && activeTab !== tab.key && (
                  <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-success-100 text-xs text-success-700 dark:bg-success-900/20 dark:text-success-400">
                    ✓
                  </span>
                )}
                {activeTab === tab.key && !isDisabled && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6 lg:p-8">
        {/* Basic Info Tab */}
        {activeTab === 'basic' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Basic Information</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Essential details about your menu item</p>
            </div>

            {/* Name */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Menu Name <span className="text-error-600">*</span>
              </label>
              <input
                type="text"
                {...register('name')}
                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
                placeholder="e.g., Fried Rice Special"
              />
              {errors.name && (
                <p className="mt-1.5 text-sm text-error-600 dark:text-error-400">{errors.name.message}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
              <textarea
                {...register('description')}
                rows={3}
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
                placeholder="Describe your menu item..."
              />
            </div>

            {/* Price & Image */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Price <span className="text-error-600">*</span>
                </label>
                <input
                  type="number"
                  {...register('price', { valueAsNumber: true })}
                  className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
                  placeholder="0"
                  min="0"
                  step="0.01"
                />
                {errors.price && (
                  <p className="mt-1.5 text-sm text-error-600 dark:text-error-400">{errors.price.message}</p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Image Upload</label>
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                  className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 file:mr-4 file:rounded file:border-0 file:bg-brand-50 file:px-4 file:py-1 file:text-sm file:font-medium file:text-brand-600 hover:file:bg-brand-100 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:file:bg-brand-900/20 dark:file:text-brand-400"
                />
                {uploadingImage && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Uploading image...</p>
                )}
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Supported: JPEG, PNG, WebP (max 5MB)
                </p>
              </div>
            </div>

            {watch('imageUrl') && (
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Image Preview
                </label>
                <div className="overflow-hidden rounded-lg">
                  <img
                    src={watch('imageUrl') || ''}
                    alt="Preview"
                    className="h-48 w-48 object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              </div>
            )}

            {/* Promo Section */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/50">
              <div className="mb-3 flex items-center gap-2">
                <input
                  type="checkbox"
                  {...register('isPromo')}
                  id="isPromo"
                  className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                />
                <label htmlFor="isPromo" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Enable Promotional Pricing
                </label>
              </div>

              {watchIsPromo && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Promo Price
                    </label>
                    <input
                      type="number"
                      {...register('promoPrice', { valueAsNumber: true })}
                      className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
                      placeholder="0"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Start Date
                    </label>
                    <input
                      type="datetime-local"
                      {...register('promoStartDate')}
                      className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      End Date
                    </label>
                    <input
                      type="datetime-local"
                      {...register('promoEndDate')}
                      className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Stock Management */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/50">
              <div className="mb-3 flex items-center gap-2">
                <input
                  type="checkbox"
                  {...register('trackStock')}
                  id="trackStock"
                  className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                />
                <label htmlFor="trackStock" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Track Stock Inventory
                </label>
              </div>

              {watchTrackStock && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Current Stock
                      </label>
                      <input
                        type="number"
                        {...register('stockQty', { valueAsNumber: true })}
                        className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
                        placeholder="0"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Daily Stock Template
                      </label>
                      <input
                        type="number"
                        {...register('dailyStockTemplate', { valueAsNumber: true })}
                        className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
                        placeholder="0"
                        min="0"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      {...register('autoResetStock')}
                      id="autoResetStock"
                      className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                    />
                    <label htmlFor="autoResetStock" className="text-sm text-gray-600 dark:text-gray-400">
                      Automatically reset stock daily
                    </label>
                  </div>
                </div>
              )}
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
          <div className="space-y-6">
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
                  className={`group relative rounded-lg border-2 p-4 text-left transition-all ${
                    selectedCategories.includes(category.id)
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
          <div className="space-y-6">
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
                    className={`group w-full rounded-lg border-2 p-4 text-left transition-all ${
                      selectedAddonCategories.includes(addonCat.id)
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
          <div className="space-y-6">
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
                    <img
                      src={watch('imageUrl') || ''}
                      alt={watch('name')}
                      className="h-64 w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}

                <h2 className="text-2xl font-bold text-gray-800 dark:text-white/90">
                  {watch('name') || 'Menu Name'}
                </h2>

                {watch('description') && (
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    {watch('description')}
                  </p>
                )}

                <div className="mt-4 flex items-baseline gap-2">
                  {watch('isPromo') && watch('promoPrice') ? (
                    <>
                      <span className="text-2xl font-bold text-error-600 dark:text-error-400">
                        ${watch('promoPrice')?.toFixed(2)}
                      </span>
                      <span className="text-lg text-gray-500 line-through dark:text-gray-400">
                        ${watch('price')?.toFixed(2)}
                      </span>
                      <span className="ml-2 rounded-full bg-error-100 px-2 py-1 text-xs font-medium text-error-700 dark:bg-error-900/20 dark:text-error-400">
                        PROMO
                      </span>
                    </>
                  ) : (
                    <span className="text-2xl font-bold text-gray-800 dark:text-white/90">
                      ${watch('price')?.toFixed(2) || '0.00'}
                    </span>
                  )}
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
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                        (watch('stockQty') || 0) > 10
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
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-11 items-center rounded-lg border border-gray-200 bg-white px-6 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            disabled={isLoading}
          >
            Cancel
          </button>

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
    </div>
  );
}
