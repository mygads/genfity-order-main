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
    CATEGORY_FOOD_NAME: 'Food',
    CATEGORY_FOOD_DESC: 'Starter category for food items.',
    CATEGORY_DRINK_NAME: 'Drinks',
    CATEGORY_DRINK_DESC: 'Starter category for drink items.',
    MENU_FOOD_NAME: 'Food Item',
    MENU_FOOD_DESC: 'Starter food menu item. Edit the name, price, and add a photo.',
    MENU_DRINK_NAME: 'Drink Item',
    MENU_DRINK_DESC: 'Starter drink menu item. Edit the name, price, and add a photo.',
    ADDON_CATEGORY_NAME: 'Addons',
    ADDON_CATEGORY_DESC: 'Starter addon options. Edit or add more to customize orders.',
    ADDON_ITEM_1_NAME: 'Extra 1',
    ADDON_ITEM_2_NAME: 'Extra 2',
  },
  IDR: {
    CATEGORY_FOOD_NAME: 'Makanan',
    CATEGORY_FOOD_DESC: 'Kategori awal untuk menu makanan.',
    CATEGORY_DRINK_NAME: 'Minuman',
    CATEGORY_DRINK_DESC: 'Kategori awal untuk menu minuman.',
    MENU_FOOD_NAME: 'Menu Makanan',
    MENU_FOOD_DESC: 'Menu contoh makanan. Ubah nama, harga, dan tambahkan foto.',
    MENU_DRINK_NAME: 'Menu Minuman',
    MENU_DRINK_DESC: 'Menu contoh minuman. Ubah nama, harga, dan tambahkan foto.',
    ADDON_CATEGORY_NAME: 'Tambahan',
    ADDON_CATEGORY_DESC: 'Opsi tambahan awal. Edit atau tambahkan untuk menyesuaikan pesanan.',
    ADDON_ITEM_1_NAME: 'Ekstra 1',
    ADDON_ITEM_2_NAME: 'Ekstra 2',
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
  CATEGORY_NAMES: [
    TEMPLATE_MARKERS.AUD.CATEGORY_FOOD_NAME,
    TEMPLATE_MARKERS.AUD.CATEGORY_DRINK_NAME,
    TEMPLATE_MARKERS.IDR.CATEGORY_FOOD_NAME,
    TEMPLATE_MARKERS.IDR.CATEGORY_DRINK_NAME,
  ],
  MENU_NAMES: [
    TEMPLATE_MARKERS.AUD.MENU_FOOD_NAME,
    TEMPLATE_MARKERS.AUD.MENU_DRINK_NAME,
    TEMPLATE_MARKERS.IDR.MENU_FOOD_NAME,
    TEMPLATE_MARKERS.IDR.MENU_DRINK_NAME,
  ],
  ADDON_CATEGORY_NAMES: [TEMPLATE_MARKERS.AUD.ADDON_CATEGORY_NAME, TEMPLATE_MARKERS.IDR.ADDON_CATEGORY_NAME],
  ADDON_ITEM_NAMES: [
    TEMPLATE_MARKERS.AUD.ADDON_ITEM_1_NAME,
    TEMPLATE_MARKERS.AUD.ADDON_ITEM_2_NAME,
    TEMPLATE_MARKERS.IDR.ADDON_ITEM_1_NAME,
    TEMPLATE_MARKERS.IDR.ADDON_ITEM_2_NAME,
  ],
};

/**
 * Get localized template markers based on currency
 */
function getLocalizedMarkers(currency: string) {
  return currency.toUpperCase() === 'IDR' ? TEMPLATE_MARKERS.IDR : TEMPLATE_MARKERS.AUD;
}

export interface TemplateDataResult {
  categories: Array<{ id: bigint; name: string }>;
  menus: Array<{ id: bigint; name: string }>;
  addonCategory: { id: bigint; name: string };
  addonItems: Array<{ id: bigint; name: string }>;
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
    // 1. Create starter categories
    const foodCategory = await tx.menuCategory.create({
      data: {
        merchantId,
        name: markers.CATEGORY_FOOD_NAME,
        description: markers.CATEGORY_FOOD_DESC,
        sortOrder: 1,
        isActive: true,
        createdByUserId: userId,
      },
    });

    const drinkCategory = await tx.menuCategory.create({
      data: {
        merchantId,
        name: markers.CATEGORY_DRINK_NAME,
        description: markers.CATEGORY_DRINK_DESC,
        sortOrder: 2,
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

    // 3. Create starter addon items (2 items)
    const addonItem1 = await tx.addonItem.create({
      data: {
        addonCategoryId: addonCategory.id,
        name: markers.ADDON_ITEM_1_NAME,
        price: samplePrice.addonPrice,
        isActive: true,
        displayOrder: 1,
        createdByUserId: userId,
      },
    });

    const addonItem2 = await tx.addonItem.create({
      data: {
        addonCategoryId: addonCategory.id,
        name: markers.ADDON_ITEM_2_NAME,
        price: samplePrice.addonPrice,
        isActive: true,
        displayOrder: 2,
        createdByUserId: userId,
      },
    });

    // 4. Create starter menu items (1 per category)
    const foodMenu = await tx.menu.create({
      data: {
        merchantId,
        name: markers.MENU_FOOD_NAME,
        description: markers.MENU_FOOD_DESC,
        price: samplePrice.menuPrice,
        isActive: true,
        trackStock: false,
        createdByUserId: userId,
      },
    });

    const drinkMenu = await tx.menu.create({
      data: {
        merchantId,
        name: markers.MENU_DRINK_NAME,
        description: markers.MENU_DRINK_DESC,
        price: samplePrice.menuPrice,
        isActive: true,
        trackStock: false,
        createdByUserId: userId,
      },
    });

    // 5. Link menus to categories
    await tx.menuCategoryItem.create({
      data: {
        menuId: foodMenu.id,
        categoryId: foodCategory.id,
      },
    });

    await tx.menuCategoryItem.create({
      data: {
        menuId: drinkMenu.id,
        categoryId: drinkCategory.id,
      },
    });

    // 6. Link addon category ONLY to the food menu
    await tx.menuAddonCategory.create({
      data: {
        menuId: foodMenu.id,
        addonCategoryId: addonCategory.id,
      },
    });

    // 7. Create default opening hours (24/7, all days open)
    // dayOfWeek: 0=Sunday, 1=Monday, ..., 6=Saturday
    const daysOfWeek = [0, 1, 2, 3, 4, 5, 6]; // Sunday to Saturday

    for (const dayOfWeek of daysOfWeek) {
      await tx.merchantOpeningHour.create({
        data: {
          merchantId,
          dayOfWeek,
          openTime: '00:00',
          closeTime: '23:59',
          isClosed: false,
        },
      });
    }

    return {
      categories: [
        { id: foodCategory.id, name: foodCategory.name },
        { id: drinkCategory.id, name: drinkCategory.name },
      ],
      menus: [
        { id: foodMenu.id, name: foodMenu.name },
        { id: drinkMenu.id, name: drinkMenu.name },
      ],
      addonCategory: { id: addonCategory.id, name: addonCategory.name },
      addonItems: [
        { id: addonItem1.id, name: addonItem1.name },
        { id: addonItem2.id, name: addonItem2.name },
      ],
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
    categories.length === 2 && categories.every((c) => ALL_TEMPLATE_NAMES.CATEGORY_NAMES.includes(c.name));

  // Check menus
  const menus = await prisma.menu.findMany({
    where: { merchantId, deletedAt: null },
    select: { name: true },
  });

  const hasOnlyTemplateMenu =
    menus.length === 2 && menus.every((m) => ALL_TEMPLATE_NAMES.MENU_NAMES.includes(m.name));

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
      h.openTime === '00:00' && h.closeTime === '23:59' && h.isClosed === false
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
      // Complete if: more than 2 categories, OR any category is not a template name (any language)
      return (
        categories.length > 2 ||
        (categories.length > 0 && categories.some((c) => !ALL_TEMPLATE_NAMES.CATEGORY_NAMES.includes(c.name)))
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
      // Hours complete if user has customized beyond default 24/7 pattern
      const openingHours = await prisma.merchantOpeningHour.findMany({
        where: { merchantId },
        select: { openTime: true, closeTime: true, isClosed: true },
      });

      if (openingHours.length === 0) return false;

      // Check if any hour is different from default
      const hasCustomHours = openingHours.some(
        (h) =>
          h.isClosed !== false || h.openTime !== '00:00' || h.closeTime !== '23:59'
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
