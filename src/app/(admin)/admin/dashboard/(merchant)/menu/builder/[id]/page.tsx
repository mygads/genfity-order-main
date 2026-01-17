'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import MenuBuilderTabs from '@/components/menu/MenuBuilderTabs';
import { MenuBuilderSkeleton } from '@/components/common/SkeletonLoaders';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useToast } from '@/context/ToastContext';

/**
 * Menu Builder Page
 * 
 * Unified interface for creating/editing menus with categories and addons.
 * Replaces the fragmented 4-page workflow with a single tabbed interface.
 * 
 * Routes:
 * - /admin/dashboard/menu/builder/new - Create new menu
 * - /admin/dashboard/menu/builder/[id] - Edit existing menu
 */

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

interface MenuFormData {
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  isActive: boolean;
  // Note: Promo fields removed - use SpecialPrice table
  trackStock: boolean;
  stockQty?: number | null;
  dailyStockTemplate?: number | null;
  autoResetStock: boolean;
  // Menu attributes
  isSpicy?: boolean;
  isBestSeller?: boolean;
  isSignature?: boolean;
  isRecommended?: boolean;
  categoryIds?: number[];
  addonCategoryIds?: number[];
}

export default function MenuBuilderPage() {
  const router = useRouter();
  const params = useParams();
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();
  const menuId = params.id === 'new' ? null : params.id ? parseInt(params.id as string) : null;

  const [categories, setCategories] = useState<Category[]>([]);
  const [addonCategories, setAddonCategories] = useState<AddonCategory[]>([]);
  const [initialData, setInitialData] = useState<MenuFormData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const cleanupRef = useRef<null | (() => Promise<void>)>(null);
  const allowPopRef = useRef(false);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuId]);

  // Warn on refresh/close if draft exists
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!hasDraft) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasDraft]);

  // Intercept browser back button when draft exists
  useEffect(() => {
    // Push a sentinel entry so we can intercept a single back press.
    try {
      window.history.pushState({ __menuBuilder: true }, '', window.location.href);
    } catch {
      // ignore
    }

    const handlePopState = () => {
      if (allowPopRef.current) return;
      if (!hasDraft) {
        // No draft: allow navigating away by going back again.
        allowPopRef.current = true;
        router.back();
        return;
      }

      // Draft exists: block navigation and show confirm modal.
      setShowCancelConfirm(true);
      try {
        window.history.pushState({ __menuBuilder: true }, '', window.location.href);
      } catch {
        // ignore
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [router, hasDraft]);

  const fetchData = async () => {
    setIsLoading(true);

    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/admin/login");
        return;
      }

      const headers = {
        Authorization: `Bearer ${token}`,
      };

      // Fetch categories
      const categoriesRes = await fetch('/api/merchant/categories', { headers });
      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        setCategories(categoriesData.data || []);
      }

      // Fetch addon categories
      const addonCategoriesRes = await fetch('/api/merchant/addon-categories', { headers });
      if (addonCategoriesRes.ok) {
        const addonCategoriesData = await addonCategoriesRes.json();
        setAddonCategories(addonCategoriesData.data || []);
      }

      // Fetch menu data if editing
      if (menuId) {
        const menuRes = await fetch(`/api/merchant/menu/${menuId}`, { headers });
        if (menuRes.ok) {
          const menuData = await menuRes.json();
          
          // Transform menu data to match form structure
          const formData: MenuFormData = {
            name: menuData.data.name,
            description: menuData.data.description,
            price: parseFloat(menuData.data.price),
            imageUrl: menuData.data.imageUrl,
            isActive: menuData.data.isActive,
            // Note: Promo fields removed - use SpecialPrice table
            trackStock: menuData.data.trackStock,
            stockQty: menuData.data.stockQty,
            dailyStockTemplate: menuData.data.dailyStockTemplate,
            autoResetStock: menuData.data.autoResetStock,
            // Menu attributes
            isSpicy: menuData.data.isSpicy || false,
            isBestSeller: menuData.data.isBestSeller || false,
            isSignature: menuData.data.isSignature || false,
            isRecommended: menuData.data.isRecommended || false,
            categoryIds: menuData.data.categories?.map((c: { category: { id: string } }) => parseInt(c.category.id)) || [],
            addonCategoryIds: menuData.data.addonCategories?.map((ac: { addonCategory: { id: string } }) => parseInt(ac.addonCategory.id)) || [],
          };

          setInitialData(formData);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      showError(t('admin.menuBuilder.loadingError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (data: MenuFormData) => {
    setIsSaving(true);

    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/admin/login");
        return;
      }

      const endpoint = menuId
        ? '/api/merchant/menu/builder'
        : '/api/merchant/menu/builder';
      
      const method = menuId ? 'PUT' : 'POST';
      
      // Clean up data: convert empty strings to null for optional fields
      const cleanedData = {
        ...data,
        imageUrl: data.imageUrl || null,
        description: data.description || undefined,
        // Note: Promo fields removed - use SpecialPrice table
        stockQty: data.trackStock ? data.stockQty : null,
        dailyStockTemplate: data.trackStock ? data.dailyStockTemplate : null,
      };
      
      const payload = menuId ? { ...cleanedData, id: menuId } : cleanedData;

      const response = await fetch(endpoint, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.message || t('admin.menuBuilder.saveFailed'));
      }
      
      showSuccess(t('admin.menuBuilder.saveSuccess'));
      // Do not navigate away on save.
      // MenuBuilderTabs will clear local draft state and (for create) reset the wizard.
    } catch (error) {
      console.error('Error saving menu:', error);
      showError(error instanceof Error ? error.message : t('admin.menuBuilder.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setShowCancelConfirm(true);
  };

  const discardAndLeave = async () => {
    try {
      if (cleanupRef.current) {
        await cleanupRef.current();
      }
    } finally {
      router.push('/admin/dashboard/menu');
    }
  };

  if (isLoading) {
    return <MenuBuilderSkeleton />;
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">
          {menuId ? t('admin.menuBuilder.editMenu') : t('admin.menuBuilder.createNew')}
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {t('admin.menuBuilder.title')}
        </p>
      </div>

      {/* Menu Builder Tabs */}
      <MenuBuilderTabs
        menuId={menuId || undefined}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        initialData={initialData as any}
        categories={categories}
        addonCategories={addonCategories}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={isSaving}
        onRegisterCleanup={(cleanup) => {
          cleanupRef.current = cleanup;
        }}
        onDraftStateChange={setHasDraft}
      />

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-warning-100 dark:bg-warning-900/20">
                <svg className="h-6 w-6 text-warning-600 dark:text-warning-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t('admin.menuBuilder.cancelConfirmTitle') || 'Discard Changes?'}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('admin.menuBuilder.cancelConfirmSubtitle') || 'Your unsaved changes will be lost'}
                </p>
              </div>
            </div>

            <p className="mb-6 text-sm text-gray-700 dark:text-gray-300">
              {t('admin.menuBuilder.cancelConfirm') || 'Are you sure you want to cancel? All unsaved changes will be lost.'}
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 h-11 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                {t('common.keepEditing') || 'Keep Editing'}
              </button>
              <button
                onClick={() => {
                  void discardAndLeave();
                }}
                className="flex-1 h-11 rounded-lg bg-error-600 text-sm font-medium text-white hover:bg-error-700"
              >
                {t('common.discardChanges') || 'Discard Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
