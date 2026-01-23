'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Image from 'next/image';
import Link from 'next/link';
import { FileIcon, FolderIcon, PlusIcon, EyeIcon } from '@/icons';
import { useMerchant } from '@/context/MerchantContext';
import { getCurrencySymbol } from '@/lib/utils/format';
import { getCurrencyConfig } from '@/lib/constants/location';
import { useToast } from '@/context/ToastContext';
import StockPhotoPicker from './StockPhotoPicker';
import { StatusToggle } from '@/components/common/StatusToggle';
import { useTranslation } from '@/lib/i18n/useTranslation';
import DetailedMenuSection from '@/components/customer/DetailedMenuSection';
import HorizontalMenuSection from '@/components/customer/HorizontalMenuSection';
import ViewModeToggle, { type ViewMode } from '@/components/customer/ViewModeToggle';
import MenuDetailModal from '@/components/menu/MenuDetailModal';
import {
  uploadMenuImageViaApi,
} from '@/lib/utils/menuImage';

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
  imageThumbMeta: z.any().optional().nullable(),
  stockPhotoId: z.number().int().positive().optional().nullable(),
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
  /** Register cleanup function (draft + temp uploads) for parent navigation guards */
  onRegisterCleanup?: (cleanup: () => Promise<void>) => void;
  /** Notify parent whether there is an unsaved draft */
  onDraftStateChange?: (hasDraft: boolean) => void;
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
  onRegisterCleanup,
  onDraftStateChange,
}: MenuBuilderTabsProps) {
  const { currency, merchant } = useMerchant();
  const { t } = useTranslation();
  const { showError, showWarning } = useToast();
  const menuImageMessages = useMemo(() => ({
    prepareFailed: t('admin.menuUpload.error.prepareFailed'),
    invalidResponse: t('admin.menuUpload.error.invalidResponse'),
    uploadFailed: t('admin.menuUpload.error.uploadFailed'),
    networkError: t('admin.menuUpload.error.networkError'),
    uploadCancelled: t('admin.menuUpload.error.uploadCancelled'),
    canvasUnsupported: t('admin.menuUpload.error.canvasUnsupported'),
    thumbnailFailed: t('admin.menuUpload.error.thumbnailFailed'),
  }), [t]);
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
    reset,
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
      imageThumbMeta: (initialData as Partial<MenuBuilderFormData> | undefined)?.imageThumbMeta ?? null,
      stockPhotoId: (initialData as Partial<MenuBuilderFormData> | undefined)?.stockPhotoId ?? null,
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
  const watchImageThumbUrl = watch('imageThumbUrl');
  const watchStockPhotoId = watch('stockPhotoId');
  const watchIsActive = watch('isActive');

  const [previewViewMode, setPreviewViewMode] = useState<ViewMode>('list');
  const [previewSelectedMenuId, setPreviewSelectedMenuId] = useState<string | null>(null);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

  const isBusy = isLoading || uploadingImage;

  const draftStorageKey = useMemo(() => {
    return menuId ? `genfity_menu_builder_draft_${menuId}` : 'genfity_menu_builder_draft_new';
  }, [menuId]);
  const [hasLoadedDraft, setHasLoadedDraft] = useState(false);
  const persistTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setImageError(false);
  }, [watchImageUrl]);

  // Track the uploaded image URL (only for newly uploaded images, not initial data)
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [uploadedImageThumbUrl, setUploadedImageThumbUrl] = useState<string | null>(null);
  const [uploadedImageThumb2xUrl, setUploadedImageThumb2xUrl] = useState<string | null>(null);
  const [imageSource, setImageSource] = useState<'initial' | 'upload' | 'stock'>('initial');

  // Update form values when selections change
  useEffect(() => {
    setValue('categoryIds', selectedCategories, { shouldValidate: true, shouldDirty: true });
  }, [selectedCategories, setValue]);

  useEffect(() => {
    setValue('addonCategoryIds', selectedAddonCategories, { shouldValidate: true, shouldDirty: true });
  }, [selectedAddonCategories, setValue]);

  // Cleanup function to delete orphaned uploaded image
  const deleteUploadedImage = async (
    imageUrl: string,
    imageThumbUrl?: string | null,
    imageThumb2xUrl?: string | null
  ) => {
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
        body: JSON.stringify({
          imageUrl,
          imageThumbUrl: imageThumbUrl || undefined,
          imageThumb2xUrl: imageThumb2xUrl || undefined,
        }),
      });
    } catch (error) {
      console.error('Failed to delete orphaned image:', error);
    }
  };

  const replaceTempUpload = async (nextSource: 'upload' | 'stock' | 'initial') => {
    // If there is a previously uploaded image that hasn't been saved, delete it.
    if (uploadedImageUrl) {
      await deleteUploadedImage(uploadedImageUrl, uploadedImageThumbUrl, uploadedImageThumb2xUrl);
      setUploadedImageUrl(null);
      setUploadedImageThumbUrl(null);
      setUploadedImageThumb2xUrl(null);
    }

    if (nextSource !== 'stock') {
      setValue('stockPhotoId', null, { shouldValidate: true, shouldDirty: true });
    }

    setImageSource(nextSource);
  };

  const cleanupDraftAndTemp = async () => {
    try {
      await replaceTempUpload('initial');
    } finally {
      try {
        localStorage.removeItem(draftStorageKey);
      } catch {
        // ignore
      }
      onDraftStateChange?.(false);
    }
  };

  useEffect(() => {
    if (!onRegisterCleanup) return;
    onRegisterCleanup(cleanupDraftAndTemp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onRegisterCleanup, draftStorageKey, uploadedImageUrl, uploadedImageThumbUrl, uploadedImageThumb2xUrl, imageSource]);

  // Load draft (if any)
  useEffect(() => {
    if (hasLoadedDraft) return;
    try {
      const raw = localStorage.getItem(draftStorageKey);
      if (!raw) {
        setHasLoadedDraft(true);
        return;
      }
      const parsed = JSON.parse(raw) as {
        activeTab?: TabKey;
        form?: Partial<MenuBuilderFormData>;
        selectedCategories?: number[];
        selectedAddonCategories?: number[];
        imageSource?: 'initial' | 'upload' | 'stock';
        uploadedImageUrl?: string | null;
        uploadedImageThumbUrl?: string | null;
        uploadedImageThumb2xUrl?: string | null;
      };

      if (parsed?.form) {
        reset({
          name: parsed.form.name ?? initialData?.name ?? '',
          description: parsed.form.description ?? initialData?.description ?? '',
          price: parsed.form.price ?? initialData?.price ?? 0,
          imageUrl: parsed.form.imageUrl ?? initialData?.imageUrl ?? '',
          imageThumbUrl: parsed.form.imageThumbUrl ?? (initialData as Partial<MenuBuilderFormData> | undefined)?.imageThumbUrl ?? '',
          imageThumbMeta: parsed.form.imageThumbMeta ?? (initialData as Partial<MenuBuilderFormData> | undefined)?.imageThumbMeta ?? null,
          stockPhotoId: parsed.form.stockPhotoId ?? (initialData as Partial<MenuBuilderFormData> | undefined)?.stockPhotoId ?? null,
          isActive: parsed.form.isActive ?? initialData?.isActive ?? true,
          trackStock: parsed.form.trackStock ?? initialData?.trackStock ?? false,
          stockQty: parsed.form.stockQty ?? initialData?.stockQty ?? null,
          dailyStockTemplate: parsed.form.dailyStockTemplate ?? initialData?.dailyStockTemplate ?? null,
          autoResetStock: parsed.form.autoResetStock ?? initialData?.autoResetStock ?? false,
          isSpicy: parsed.form.isSpicy ?? initialData?.isSpicy ?? false,
          isBestSeller: parsed.form.isBestSeller ?? initialData?.isBestSeller ?? false,
          isSignature: parsed.form.isSignature ?? initialData?.isSignature ?? false,
          isRecommended: parsed.form.isRecommended ?? initialData?.isRecommended ?? false,
          categoryIds: parsed.form.categoryIds ?? initialData?.categoryIds ?? [],
          addonCategoryIds: parsed.form.addonCategoryIds ?? initialData?.addonCategoryIds ?? [],
        });
      }

      if (Array.isArray(parsed.selectedCategories)) setSelectedCategories(parsed.selectedCategories);
      if (Array.isArray(parsed.selectedAddonCategories)) setSelectedAddonCategories(parsed.selectedAddonCategories);
      if (parsed.activeTab) setActiveTab(parsed.activeTab);

      if (parsed.imageSource) setImageSource(parsed.imageSource);
      if (typeof parsed.uploadedImageUrl !== 'undefined') setUploadedImageUrl(parsed.uploadedImageUrl);
      if (typeof parsed.uploadedImageThumbUrl !== 'undefined') setUploadedImageThumbUrl(parsed.uploadedImageThumbUrl);
      if (typeof parsed.uploadedImageThumb2xUrl !== 'undefined') setUploadedImageThumb2xUrl(parsed.uploadedImageThumb2xUrl);

      onDraftStateChange?.(true);
    } catch {
      // ignore corrupted draft
    } finally {
      setHasLoadedDraft(true);
    }
  }, [draftStorageKey, hasLoadedDraft, initialData, onDraftStateChange, reset]);

  // Persist draft (form changes)
  useEffect(() => {
    if (!hasLoadedDraft) return;

    const subscription = watch((form) => {
      if (persistTimerRef.current) window.clearTimeout(persistTimerRef.current);
      persistTimerRef.current = window.setTimeout(() => {
        try {
          const payload = {
            activeTab,
            form,
            selectedCategories,
            selectedAddonCategories,
            imageSource,
            uploadedImageUrl: imageSource === 'upload' ? uploadedImageUrl : null,
            uploadedImageThumbUrl: imageSource === 'upload' ? uploadedImageThumbUrl : null,
            uploadedImageThumb2xUrl: imageSource === 'upload' ? uploadedImageThumb2xUrl : null,
          };
          localStorage.setItem(draftStorageKey, JSON.stringify(payload));
          onDraftStateChange?.(true);
        } catch {
          // ignore
        }
      }, 250);
    });

    return () => {
      subscription.unsubscribe();
      if (persistTimerRef.current) window.clearTimeout(persistTimerRef.current);
    };
  }, [watch, hasLoadedDraft, activeTab, selectedCategories, selectedAddonCategories, imageSource, uploadedImageUrl, uploadedImageThumbUrl, uploadedImageThumb2xUrl, draftStorageKey, onDraftStateChange]);

  // Persist draft when non-form state changes (tab / selections)
  useEffect(() => {
    if (!hasLoadedDraft) return;
    try {
      const form = watch();
      const payload = {
        activeTab,
        form,
        selectedCategories,
        selectedAddonCategories,
        imageSource,
        uploadedImageUrl: imageSource === 'upload' ? uploadedImageUrl : null,
        uploadedImageThumbUrl: imageSource === 'upload' ? uploadedImageThumbUrl : null,
        uploadedImageThumb2xUrl: imageSource === 'upload' ? uploadedImageThumb2xUrl : null,
      };
      localStorage.setItem(draftStorageKey, JSON.stringify(payload));
      onDraftStateChange?.(true);
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedCategories, selectedAddonCategories, imageSource, uploadedImageUrl, uploadedImageThumbUrl, uploadedImageThumb2xUrl, hasLoadedDraft, draftStorageKey]);

  // Cleanup on unmount if image was uploaded but menu not saved
  useEffect(() => {
    return () => {
      // Cleanup if a new image was uploaded and not saved
      if (uploadedImageUrl) {
        deleteUploadedImage(uploadedImageUrl, uploadedImageThumbUrl, uploadedImageThumb2xUrl);
      }
    };
  }, [uploadedImageUrl, uploadedImageThumbUrl, uploadedImageThumb2xUrl]);

  const handleFormSubmit = async (data: MenuBuilderFormData) => {
    // Manually set categoryIds and addonCategoryIds from state, convert to numbers
    const submissionData = {
      ...data,
      categoryIds: selectedCategories.map(id => typeof id === 'string' ? parseInt(id) : id),
      addonCategoryIds: selectedAddonCategories.map(id => typeof id === 'string' ? parseInt(id) : id),
      stockPhotoId:
        typeof data.stockPhotoId === 'string'
          ? parseInt(data.stockPhotoId)
          : data.stockPhotoId ?? null,
    };

    try {
      await onSubmit(submissionData);
      // Clear the uploaded image tracking since it's now saved with the menu
      setUploadedImageUrl(null);
      setUploadedImageThumbUrl(null);
      setUploadedImageThumb2xUrl(null);
      setImageSource('initial');

      // For create flow, restart the wizard so the user can add another menu quickly.
      if (!menuId) {
        setActiveTab('basic');
        setSelectedCategories([]);
        setSelectedAddonCategories([]);
        setPreviewSelectedMenuId(null);
        setPreviewViewMode('list');

        reset({
          name: '',
          description: '',
          price: 0,
          imageUrl: '',
          imageThumbUrl: '',
          imageThumbMeta: null,
          stockPhotoId: null,
          isActive: true,
          trackStock: false,
          stockQty: null,
          dailyStockTemplate: null,
          autoResetStock: false,
          isSpicy: false,
          isBestSeller: false,
          isSignature: false,
          isRecommended: false,
          categoryIds: [],
          addonCategoryIds: [],
        });
      }

      try {
        localStorage.removeItem(draftStorageKey);
      } catch {
        // ignore
      }
      onDraftStateChange?.(false);
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type - accept all image formats
    if (!file.type.startsWith('image/')) {
      showError(t('admin.menuUpload.error.invalidFileType'));
      return;
    }

    const maxSizeMB = 5;
    if (file.size > maxSizeMB * 1024 * 1024) {
      showError(t('admin.menuUpload.error.fileTooLarge', { maxSize: maxSizeMB }));
      return;
    }

    try {
      setUploadingImage(true);
      setUploadProgress(0);

      // Replacing an existing temp upload? Clean it up first.
      // We intentionally do not delete initial/stock images here.
      await replaceTempUpload('upload');

      const token = localStorage.getItem('accessToken');
      if (!token) {
        showError(t('admin.menuUpload.error.authRequired'));
        return;
      }

      const uploadResult = await uploadMenuImageViaApi(
        { token, file, menuId: menuId ? String(menuId) : undefined },
        (percent) => setUploadProgress(percent),
        menuImageMessages
      );

      if (uploadResult.warnings.length > 0) {
        showWarning(uploadResult.warnings.join(' '), t('common.warning') || 'Warning');
      }

      setValue('imageUrl', uploadResult.imageUrl, { shouldValidate: true, shouldDirty: true });
      setValue('imageThumbUrl', uploadResult.imageThumbUrl, { shouldValidate: true, shouldDirty: true });
      setValue('imageThumbMeta', uploadResult.imageThumbMeta, { shouldValidate: true, shouldDirty: true });
      setUploadedImageUrl(uploadResult.imageUrl);
      setUploadedImageThumbUrl(uploadResult.imageThumbUrl);
      setUploadedImageThumb2xUrl(uploadResult.imageThumb2xUrl);
      setImageSource('upload');
    } catch (error) {
      showError(error instanceof Error ? error.message : t('admin.menuUpload.error.uploadFailed'));
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
    { key: 'basic' as TabKey, label: t('admin.menuBuilder.tabs.basic') || 'Basic Info', Icon: FileIcon },
    { key: 'categories' as TabKey, label: t('admin.menuBuilder.tabs.categories') || 'Categories', Icon: FolderIcon },
    { key: 'addons' as TabKey, label: t('admin.menuBuilder.tabs.addons') || 'Add-ons', Icon: PlusIcon },
    { key: 'preview' as TabKey, label: t('admin.menuBuilder.tabs.preview') || 'Preview', Icon: EyeIcon },
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
      <form
        onSubmit={(e) => {
          // Guard: never allow implicit form submissions (buttons without type inside preview, Enter key, etc.)
          // Save must be explicit via the confirmation modal.
          e.preventDefault();
        }}
        className="p-6 lg:p-8"
      >
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
                      step={getCurrencyConfig(currency).decimals === 0 ? '1' : '0.01'}
                      onWheel={(e) => {
                        // Prevent scroll wheel changing the value (common source of 20 -> 19.96)
                        (e.target as HTMLInputElement).blur();
                      }}
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
                          // If there is a temp upload tracked, delete it immediately
                          if (uploadedImageUrl) {
                            deleteUploadedImage(uploadedImageUrl, uploadedImageThumbUrl, uploadedImageThumb2xUrl);
                            setUploadedImageUrl(null);
                            setUploadedImageThumbUrl(null);
                            setUploadedImageThumb2xUrl(null);
                          }

                          setImageSource('initial');

                          setValue('imageUrl', '', { shouldValidate: true, shouldDirty: true });
                          setValue('imageThumbUrl', '', { shouldValidate: true, shouldDirty: true });
                          setValue('imageThumbMeta', null, { shouldValidate: true, shouldDirty: true });
                          setValue('stockPhotoId', null, { shouldValidate: true, shouldDirty: true });
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
                  disabled={uploadingImage}
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
                    <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-warning-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-warning-300/20 dark:bg-gray-700 dark:peer-focus:ring-warning-800/20" />
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
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 transition-all hover:border-brand-300 hover:shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:hover:border-brand-500"
                >
                  <input
                    type="checkbox"
                    {...register('isSpicy')}
                    id="isSpicy"
                    className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                  />
                  <div className="flex items-center gap-2">
                    <div className="group relative h-5 w-5 cursor-pointer overflow-hidden rounded-full border border-gray-400/50 bg-white transition-all duration-300 hover:ring-2 hover:ring-brand-300 hover:ring-offset-1 dark:border-gray-500/50 dark:bg-gray-800">
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
            <div className="flex items-center gap-3">
              <StatusToggle
                isActive={Boolean(watchIsActive)}
                onToggle={() => {
                  setValue('isActive', !Boolean(watchIsActive), { shouldDirty: true, shouldValidate: true });
                }}
                activeLabel="Active"
                inactiveLabel="Inactive"
                activateTitle="Activate menu"
                deactivateTitle="Deactivate menu"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Visible to customers
              </span>
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
            {(() => {
              type PreviewMenuItem = {
                id: string;
                name: string;
                description: string;
                price: number;
                imageUrl: string | null;
                imageThumbUrl?: string | null;
                stockQty: number | null;
                isActive: boolean;
                trackStock: boolean;
                isPromo?: boolean;
                promoPrice?: number;
                isSpicy?: boolean;
                isBestSeller?: boolean;
                isSignature?: boolean;
                isRecommended?: boolean;
                addonCategories?: Array<{ id: string; name: string }>;
              };

              const selectedAddonCategoryDetails = selectedAddonCategories
                .map((addonCatId) => addonCategories.find((ac) => ac.id === addonCatId))
                .filter((ac): ac is AddonCategory => Boolean(ac));

              const previewMenu: PreviewMenuItem = {
                id: 'preview-menu',
                name: String(watch('name') || t('admin.menuBuilder.preview.menuPlaceholderName') || 'New Menu'),
                description: String(watch('description') || ''),
                price: Number(watch('price') || 0),
                imageUrl: watchImageUrl ? String(watchImageUrl) : null,
                imageThumbUrl: watchImageThumbUrl ? String(watchImageThumbUrl) : null,
                stockQty: watchTrackStock ? (watch('stockQty') ?? null) : null,
                isActive: Boolean(watchIsActive),
                trackStock: Boolean(watchTrackStock),
                isPromo: false,
                promoPrice: undefined,
                isSpicy: Boolean(watch('isSpicy')),
                isBestSeller: Boolean(watch('isBestSeller')),
                isSignature: Boolean(watch('isSignature')),
                isRecommended: Boolean(watch('isRecommended')),
                addonCategories: selectedAddonCategoryDetails.map((ac) => ({ id: String(ac.id), name: ac.name })),
              };

              const dummyMenu: PreviewMenuItem = {
                ...previewMenu,
                id: 'preview-dummy',
                name: String(t('admin.menuBuilder.preview.dummyName') || 'Dummy Menu (Disabled)'),
                description: String(t('admin.menuBuilder.preview.dummyDescription') || 'This item is only for layout preview and cannot be clicked.'),
                isActive: false,
                trackStock: false,
                stockQty: null,
              };

              const previewItems: PreviewMenuItem[] = [previewMenu, dummyMenu];
              const selectedMenu = previewItems.find((m) => m.id === previewSelectedMenuId) ?? null;

              const prefetchedAddonsForModal = selectedAddonCategoryDetails.map((ac) => ({
                id: ac.id,
                name: ac.name,
                minSelection: ac.minSelection,
                maxSelection: ac.maxSelection ?? 0,
                addonItems: ac.addonItems ?? [],
              }));

              return (
                <div className="mx-auto w-full max-w-130">
                  {/* Mobile Device Frame */}
                  <div className="relative overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
                    <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-800">
                      <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                        {t('admin.menuBuilder.preview.deviceTitle') || 'Mobile Preview'}
                      </div>
                      <div className="h-1.5 w-14 rounded-full bg-gray-300 dark:bg-gray-700" />
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {t('admin.menuBuilder.preview.deviceHint') || 'Tap menu to open detail'}
                      </div>
                    </div>

                    <div className="p-4 sm:p-5 bg-white dark:bg-gray-950">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                        {t('admin.menuBuilder.preview.title') || 'Preview'}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {t('admin.menuBuilder.preview.subtitle') || 'Preview how this menu will look to customers (list, grid, and horizontal cards).'}
                      </p>
                    </div>
                    <ViewModeToggle value={previewViewMode} onChange={setPreviewViewMode} persist={false} />
                  </div>
                  <div className="space-y-4">
                    <DetailedMenuSection
                      title={String(t('admin.menuBuilder.preview.listTitle') || 'Menu List Preview')}
                      items={previewItems}
                      currency={currency}
                      merchantCode=""
                      onAddItem={(item) => setPreviewSelectedMenuId(item.id)}
                      storeOpen={false}
                      viewMode={previewViewMode}
                    />

                    <HorizontalMenuSection
                      title={String(t('admin.menuBuilder.preview.horizontalTitle') || 'Horizontal Card Preview')}
                      items={previewItems}
                      currency={currency}
                      merchantCode=""
                      onItemClick={(item) => setPreviewSelectedMenuId(item.id)}
                      storeOpen={false}
                    />
                  </div>


                  {selectedMenu && (
                    <MenuDetailModal
                      menu={{
                        id: selectedMenu.id,
                        name: selectedMenu.name,
                        description: selectedMenu.description,
                        price: selectedMenu.price,
                        imageUrl: selectedMenu.imageUrl,
                        stockQty: selectedMenu.stockQty,
                        isActive: selectedMenu.isActive,
                        trackStock: selectedMenu.trackStock,
                        isPromo: false,
                        promoPrice: undefined,
                        isSpicy: selectedMenu.isSpicy,
                        isBestSeller: selectedMenu.isBestSeller,
                        isSignature: selectedMenu.isSignature,
                        isRecommended: selectedMenu.isRecommended,
                      }}
                      merchantCode={merchant?.code || 'preview'}
                      mode="dinein"
                      currency={currency}
                      onClose={() => setPreviewSelectedMenuId(null)}
                      prefetchedAddons={prefetchedAddonsForModal}
                      storeOpen={false}
                      skipCartInit
                      container="parent"
                    />
                  )}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-8 flex items-center justify-between border-t border-gray-200 pt-6 dark:border-gray-800">
          {(isDirty || menuId || uploadingImage) ? (
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex h-11 items-center rounded-lg border border-gray-200 bg-white px-6 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              disabled={isBusy}
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
                disabled={isBusy}
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
                disabled={isBusy || !isTabComplete(activeTab)}
              >
                Next
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ) : (
              <button
                type="button"
                data-tutorial="builder-save"
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-success-500 px-8 text-sm font-medium text-white transition-colors hover:bg-success-600 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isBusy || !watch('name') || !watch('price') || watch('price') <= 0}
                onClick={() => setShowSaveConfirm(true)}
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

      {/* Save Confirmation Modal */}
      {showSaveConfirm && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('common.confirm') || 'Confirm'}
              </h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {t('admin.menuBuilder.preview.confirmSave') || 'Save this menu now?'}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowSaveConfirm(false)}
                className="flex-1 h-11 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                disabled={isBusy}
              >
                {t('common.cancel') || 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSaveConfirm(false);
                  void handleSubmit(handleFormSubmit)();
                }}
                className="flex-1 h-11 rounded-lg bg-success-600 text-sm font-medium text-white hover:bg-success-700 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isBusy}
              >
                {t('common.save') || 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Photo Picker Modal */}
      <StockPhotoPicker
        isOpen={showStockPhotoPicker}
        onClose={() => setShowStockPhotoPicker(false)}
        onSelect={async (selection) => {
          // Switching to stock photo: delete any previously uploaded (temporary) blob.
          await replaceTempUpload('stock');
          setValue('imageUrl', selection.imageUrl, { shouldValidate: true, shouldDirty: true });
          setValue('imageThumbUrl', selection.thumbnailUrl || '', { shouldValidate: true, shouldDirty: true });
          setValue('imageThumbMeta', null, { shouldValidate: true, shouldDirty: true });
          setValue('stockPhotoId', parseInt(selection.stockPhotoId), { shouldValidate: true, shouldDirty: true });
          setShowStockPhotoPicker(false);
        }}
        currentStockPhotoId={watchStockPhotoId ? String(watchStockPhotoId) : undefined}
      />
    </div>
  );
}
