/**
 * Addon Data Extractor Utility
 * Extracts and transforms addon data from menu API response
 */

interface AddonItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  inputType: string;
  isActive: boolean;
  trackStock: boolean;
  stockQty: number | null;
  displayOrder: number;
}

interface AddonCategory {
  id: string;
  name: string;
  description: string | null;
  isRequired: boolean;
  minSelection: number;
  maxSelection: number;
  displayOrder: number;
  addonItems: AddonItem[];
}

interface MenuWithAddons {
  id: string;
  addonCategories?: AddonCategory[];
}

/**
 * Extract addon data from menu items and transform to cache format
 * @param menus - Array of menu items from API
 * @returns Record of menuId -> transformed addon categories
 */
export function extractAddonDataFromMenus(menus: MenuWithAddons[]): Record<string, any> {
  const addonCache: Record<string, any> = {};

  menus.forEach((menu) => {
    if (menu.addonCategories && menu.addonCategories.length > 0) {
      addonCache[menu.id] = menu.addonCategories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        description: cat.description,
        type: cat.isRequired ? 'required' : 'optional',
        minSelections: cat.minSelection,
        maxSelections: cat.maxSelection,
        displayOrder: cat.displayOrder,
        addons: cat.addonItems.map((item) => ({
          id: item.id,
          categoryId: cat.id,
          name: item.name,
          description: item.description,
          price: item.price,
          inputType: item.inputType,
          isAvailable: item.isActive && (!item.trackStock || (item.stockQty !== null && item.stockQty > 0)),
          trackStock: item.trackStock,
          stockQty: item.stockQty,
          displayOrder: item.displayOrder,
        })),
      }));
    }
  });

  return addonCache;
}
