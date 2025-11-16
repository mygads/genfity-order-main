'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import MenuBuilderTabs from '@/components/menu/MenuBuilderTabs';

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
  isPromo: boolean;
  promoPrice?: number | null;
  promoStartDate?: string | null;
  promoEndDate?: string | null;
  trackStock: boolean;
  stockQty?: number | null;
  dailyStockTemplate?: number | null;
  autoResetStock: boolean;
  categoryIds?: number[];
  addonCategoryIds?: number[];
}

export default function MenuBuilderPage() {
  const router = useRouter();
  const params = useParams();
  const menuId = params.id === 'new' ? null : params.id ? parseInt(params.id as string) : null;

  const [categories, setCategories] = useState<Category[]>([]);
  const [addonCategories, setAddonCategories] = useState<AddonCategory[]>([]);
  const [initialData, setInitialData] = useState<MenuFormData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuId]);

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
            isPromo: menuData.data.isPromo,
            promoPrice: menuData.data.promoPrice ? parseFloat(menuData.data.promoPrice) : null,
            promoStartDate: menuData.data.promoStartDate,
            promoEndDate: menuData.data.promoEndDate,
            trackStock: menuData.data.trackStock,
            stockQty: menuData.data.stockQty,
            dailyStockTemplate: menuData.data.dailyStockTemplate,
            autoResetStock: menuData.data.autoResetStock,
            categoryIds: menuData.data.categories?.map((c: { category: { id: string } }) => parseInt(c.category.id)) || [],
            addonCategoryIds: menuData.data.addonCategories?.map((ac: { addonCategory: { id: string } }) => parseInt(ac.addonCategory.id)) || [],
          };

          setInitialData(formData);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Gagal memuat data');
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
        promoPrice: data.isPromo ? data.promoPrice : null,
        promoStartDate: data.isPromo ? data.promoStartDate : null,
        promoEndDate: data.isPromo ? data.promoEndDate : null,
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
        throw new Error(responseData.message || 'Gagal menyimpan menu');
      }
      
      alert(`Menu berhasil ${menuId ? 'diupdate' : 'dibuat'}!`);
      router.push('/admin/dashboard/menu');
    } catch (error) {
      console.error('Error saving menu:', error);
      alert(error instanceof Error ? error.message : 'Gagal menyimpan menu');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (confirm('Batalkan perubahan? Data yang belum disimpan akan hilang.')) {
      router.push('/admin/dashboard/menu');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">
          {menuId ? 'Edit Menu' : 'Create New Menu'}
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Complete all menu information in one streamlined interface
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
      />
    </div>
  );
}
