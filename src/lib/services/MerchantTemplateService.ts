/**
 * Merchant Template Service
 * 
 * @description Creates starter template data for newly registered merchants
 * including sample category, menu, addon category, addon item, and default opening hours.
 * Supports localization based on currency (AUD = English, IDR = Indonesian).
 */

import prisma from '@/lib/db/client';

// Template data identifiers - used to track if user has modified template data
// Supports multiple languages based on merchant currency
const TEMPLATE_MARKERS = {
  AUD: {
    CATEGORY_NAME: 'Sample Category',
    CATEGORY_DESC: 'This is a sample category. Edit or add more categories to organize your menu.',
    MENU_NAME: 'Sample Menu Item',
    MENU_DESC: 'This is a sample menu item. Edit the name, price, and add a photo to make it yours!',
    ADDON_CATEGORY_NAME: 'Sample Addons',
    ADDON_CATEGORY_DESC: 'Sample addon options. Edit or add more to customize orders.',
    ADDON_ITEM_NAME: 'Sample Extra',
  },
  IDR: {
    CATEGORY_NAME: 'Kategori Contoh',
    CATEGORY_DESC: 'Ini adalah kategori contoh. Edit atau tambahkan kategori lain untuk mengatur menu Anda.',
    MENU_NAME: 'Menu Contoh',
    MENU_DESC: 'Ini adalah menu contoh. Ubah nama, harga, dan tambahkan foto untuk menjadikannya milik Anda!',
    ADDON_CATEGORY_NAME: 'Tambahan Contoh',
    ADDON_CATEGORY_DESC: 'Opsi tambahan contoh. Edit atau tambahkan untuk menyesuaikan pesanan.',
    ADDON_ITEM_NAME: 'Ekstra Contoh',
  },
} as const;

// Get all template names for checking (both languages)
// Using string[] type to allow includes() with string arguments
const ALL_TEMPLATE_NAMES: {
  CATEGORY_NAMES: string[];
  MENU_NAMES: string[];
  ADDON_CATEGORY_NAMES: string[];
  ADDON_ITEM_NAMES: string[];
} = {
  CATEGORY_NAMES: [TEMPLATE_MARKERS.AUD.CATEGORY_NAME, TEMPLATE_MARKERS.IDR.CATEGORY_NAME],
  MENU_NAMES: [TEMPLATE_MARKERS.AUD.MENU_NAME, TEMPLATE_MARKERS.IDR.MENU_NAME],
  ADDON_CATEGORY_NAMES: [TEMPLATE_MARKERS.AUD.ADDON_CATEGORY_NAME, TEMPLATE_MARKERS.IDR.ADDON_CATEGORY_NAME],
  ADDON_ITEM_NAMES: [TEMPLATE_MARKERS.AUD.ADDON_ITEM_NAME, TEMPLATE_MARKERS.IDR.ADDON_ITEM_NAME],
};

/**
 * Get localized template markers based on currency
 */
function getLocalizedMarkers(currency: string) {
  return currency.toUpperCase() === 'IDR' ? TEMPLATE_MARKERS.IDR : TEMPLATE_MARKERS.AUD;
}

export interface TemplateDataResult {
  category: { id: bigint; name: string };
  menu: { id: bigint; name: string };
  addonCategory: { id: bigint; name: string };
  addonItem: { id: bigint; name: string };
  openingHoursCount: number;
}

/**
 * Create template data for a newly registered merchant
 */
async function createTemplateData(
  merchantId: bigint,
  userId: bigint,
  currency: string = 'AUD'
): Promise<TemplateDataResult> {
  // Get sample price and localized markers based on currency
  const samplePrice = getSamplePrice(currency);
  const markers = getLocalizedMarkers(currency);

  // Use a transaction to ensure all data is created atomically
  return await prisma.$transaction(async (tx) => {
    // 1. Create sample category
    const category = await tx.menuCategory.create({
      data: {
        merchantId,
        name: markers.CATEGORY_NAME,
        description: markers.CATEGORY_DESC,
        sortOrder: 1,
        isActive: true,
        createdByUserId: userId,
      },
    });

    // 2. Create sample addon category
    const addonCategory = await tx.addonCategory.create({
      data: {
        merchantId,
        name: markers.ADDON_CATEGORY_NAME,
        description: markers.ADDON_CATEGORY_DESC,
        minSelection: 0,
        maxSelection: 3,
        isActive: true,
        createdByUserId: userId,
      },
    });

    // 3. Create sample addon item
    const addonItem = await tx.addonItem.create({
      data: {
        addonCategoryId: addonCategory.id,
        name: markers.ADDON_ITEM_NAME,
        price: samplePrice.addonPrice,
        isActive: true,
        displayOrder: 1,
        createdByUserId: userId,
      },
    });

    // 4. Create sample menu item
    const menu = await tx.menu.create({
      data: {
        merchantId,
        name: markers.MENU_NAME,
        description: markers.MENU_DESC,
        price: samplePrice.menuPrice,
        isActive: true,
        trackStock: false,
        createdByUserId: userId,
      },
    });

    // 5. Link menu to category
    await tx.menuCategoryItem.create({
      data: {
        menuId: menu.id,
        categoryId: category.id,
      },
    });

    // 6. Link menu to addon category (optional connection)
    await tx.menuAddonCategory.create({
      data: {
        menuId: menu.id,
        addonCategoryId: addonCategory.id,
      },
    });

    // 7. Create default opening hours (Monday-Sunday, 9AM-9PM)
    // dayOfWeek: 0=Sunday, 1=Monday, ..., 6=Saturday
    const daysOfWeek = [0, 1, 2, 3, 4, 5, 6]; // Sunday to Saturday

    for (const dayOfWeek of daysOfWeek) {
      await tx.merchantOpeningHour.create({
        data: {
          merchantId,
          dayOfWeek,
          openTime: '09:00',
          closeTime: '21:00',
          isClosed: dayOfWeek === 0, // Sunday closed by default
        },
      });
    }

    return {
      category: { id: category.id, name: category.name },
      menu: { id: menu.id, name: menu.name },
      addonCategory: { id: addonCategory.id, name: addonCategory.name },
      addonItem: { id: addonItem.id, name: addonItem.name },
      openingHoursCount: daysOfWeek.length,
    };
  });
}

/**
 * Check if merchant has only template data (not yet customized)
 */
async function hasOnlyTemplateData(merchantId: bigint): Promise<{
  categories: { isTemplate: boolean; count: number };
  menus: { isTemplate: boolean; count: number };
  addonCategories: { isTemplate: boolean; count: number };
  openingHours: { hasDefault: boolean; count: number };
}> {
  // Check categories
  const categories = await prisma.menuCategory.findMany({
    where: { merchantId, deletedAt: null },
    select: { name: true },
  });

  const hasOnlyTemplateCategory =
    categories.length === 1 && ALL_TEMPLATE_NAMES.CATEGORY_NAMES.includes(categories[0].name);

  // Check menus
  const menus = await prisma.menu.findMany({
    where: { merchantId, deletedAt: null },
    select: { name: true },
  });

  const hasOnlyTemplateMenu =
    menus.length === 1 && ALL_TEMPLATE_NAMES.MENU_NAMES.includes(menus[0].name);

  // Check addon categories
  const addonCategories = await prisma.addonCategory.findMany({
    where: { merchantId, deletedAt: null },
    select: { name: true },
  });

  const hasOnlyTemplateAddonCategory =
    addonCategories.length === 1 &&
    ALL_TEMPLATE_NAMES.ADDON_CATEGORY_NAMES.includes(addonCategories[0].name);

  // Check opening hours
  const openingHours = await prisma.merchantOpeningHour.findMany({
    where: { merchantId },
    select: { dayOfWeek: true, openTime: true, closeTime: true, isClosed: true },
  });

  // Check if hours are still default (9AM-9PM pattern)
  const hasDefaultHours = openingHours.every(
    (h) =>
      (h.openTime === '09:00' && h.closeTime === '21:00') ||
      h.isClosed
  );

  return {
    categories: { isTemplate: hasOnlyTemplateCategory, count: categories.length },
    menus: { isTemplate: hasOnlyTemplateMenu, count: menus.length },
    addonCategories: { isTemplate: hasOnlyTemplateAddonCategory, count: addonCategories.length },
    openingHours: { hasDefault: hasDefaultHours, count: openingHours.length },
  };
}

/**
 * Check if a specific step is completed (user has customized beyond template)
 */
async function isStepCompleted(
  merchantId: bigint,
  step: 'store' | 'categories' | 'menu' | 'addons' | 'hours'
): Promise<boolean> {
  switch (step) {
    case 'store': {
      // Store is complete if merchant has a logo
      const merchant = await prisma.merchant.findUnique({
        where: { id: merchantId },
        select: { logoUrl: true },
      });
      return !!merchant?.logoUrl;
    }

    case 'categories': {
      // Categories complete if user has added more than template OR renamed template
      const categories = await prisma.menuCategory.findMany({
        where: { merchantId, deletedAt: null },
        select: { name: true },
      });
      // Complete if: more than 1 category, OR single category is not a template name (any language)
      return (
        categories.length > 1 ||
        (categories.length === 1 && !ALL_TEMPLATE_NAMES.CATEGORY_NAMES.includes(categories[0].name))
      );
    }

    case 'menu': {
      // Menu complete if user has added more items OR renamed template
      const menus = await prisma.menu.findMany({
        where: { merchantId, deletedAt: null },
        select: { name: true },
      });
      // Complete if: 3+ menus, OR any menu is not a template name (any language)
      const hasCustomMenu = menus.some((m) => !ALL_TEMPLATE_NAMES.MENU_NAMES.includes(m.name));
      return menus.length >= 3 || hasCustomMenu;
    }

    case 'addons': {
      // Addons complete if user has added more OR renamed template
      const addonCategories = await prisma.addonCategory.findMany({
        where: { merchantId, deletedAt: null },
        select: { name: true },
      });
      // Complete if: more than 1 category, OR single category is not a template name (any language)
      return (
        addonCategories.length > 1 ||
        (addonCategories.length === 1 &&
          !ALL_TEMPLATE_NAMES.ADDON_CATEGORY_NAMES.includes(addonCategories[0].name))
      );
    }

    case 'hours': {
      // Hours complete if user has customized beyond default 9-9 pattern
      const openingHours = await prisma.merchantOpeningHour.findMany({
        where: { merchantId },
        select: { openTime: true, closeTime: true, isClosed: true },
      });

      if (openingHours.length === 0) return false;

      // Check if any hour is different from default
      const hasCustomHours = openingHours.some(
        (h) =>
          !h.isClosed && (h.openTime !== '09:00' || h.closeTime !== '21:00')
      );

      return hasCustomHours;
    }

    default:
      return false;
  }
}

/**
 * Get sample prices based on currency
 */
function getSamplePrice(currency: string): { menuPrice: number; addonPrice: number } {
  switch (currency.toUpperCase()) {
    case 'IDR':
      return { menuPrice: 25000, addonPrice: 5000 };
    case 'USD':
      return { menuPrice: 9.99, addonPrice: 1.99 };
    case 'SGD':
      return { menuPrice: 12.90, addonPrice: 2.50 };
    case 'MYR':
      return { menuPrice: 15.90, addonPrice: 3.00 };
    case 'AUD':
    default:
      return { menuPrice: 14.90, addonPrice: 2.50 };
  }
}

/**
 * Get template markers for a specific currency/locale
 */
function getTemplateMarkers(currency?: string) {
  if (currency) {
    return getLocalizedMarkers(currency);
  }
  return TEMPLATE_MARKERS;
}

/**
 * Get all template names for both languages (for checking)
 */
function getAllTemplateNames() {
  return ALL_TEMPLATE_NAMES;
}

export const merchantTemplateService = {
  createTemplateData,
  hasOnlyTemplateData,
  isStepCompleted,
  getTemplateMarkers,
  getAllTemplateNames,
  getLocalizedMarkers,
};

export default merchantTemplateService;
