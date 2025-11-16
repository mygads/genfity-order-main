/**
 * AddonRepository
 * Repository pattern for addon_categories and addon_items tables
 */
import {
  CreateAddonCategoryDTO,
  UpdateAddonCategoryDTO,
  CreateAddonItemDTO,
  UpdateAddonItemDTO,
} from '@/lib/types/addon';
import prisma from '@/lib/db/client';

export class AddonRepository {
  // ==================== ADDON CATEGORIES ====================

  /**
   * Get all addon categories for a merchant
   */
  async getAddonCategories(merchantId: bigint) {
    return await prisma.addonCategory.findMany({
      where: { merchantId },
      include: {
        addonItems: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' },
        },
        _count: {
          select: {
            addonItems: true,
            menuAddonCategories: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Get single addon category by ID
   */
  async getAddonCategoryById(id: bigint, merchantId: bigint) {
    return await prisma.addonCategory.findFirst({
      where: {
        id,
        merchantId,
      },
      include: {
        addonItems: {
          orderBy: { displayOrder: 'asc' },
        },
        _count: {
          select: {
            addonItems: true,
            menuAddonCategories: true,
          },
        },
      },
    });
  }

  /**
   * Create new addon category
   */
  async createAddonCategory(merchantId: bigint, data: CreateAddonCategoryDTO) {
    return await prisma.addonCategory.create({
      data: {
        merchantId,
        name: data.name,
        description: data.description || null,
        minSelection: data.minSelection || 0,
        maxSelection: data.maxSelection || null,
        isActive: true,
      },
      include: {
        addonItems: true,
      },
    });
  }

  /**
   * Update addon category
   */
  async updateAddonCategory(
    id: bigint,
    merchantId: bigint,
    data: UpdateAddonCategoryDTO
  ) {
    return await prisma.addonCategory.updateMany({
      where: {
        id,
        merchantId,
      },
      data: {
        name: data.name,
        description: data.description,
        minSelection: data.minSelection,
        maxSelection: data.maxSelection,
        isActive: data.isActive,
      },
    });
  }

  /**
   * Toggle addon category active status
   */
  async toggleAddonCategoryActive(id: bigint, merchantId: bigint) {
    const category = await this.getAddonCategoryById(id, merchantId);
    if (!category) return null;

    return await prisma.addonCategory.update({
      where: { id },
      data: { isActive: !category.isActive },
    });
  }

  /**
   * Delete addon category
   */
  async deleteAddonCategory(id: bigint, merchantId: bigint) {
    // Check if category has any menu associations
    const category = await prisma.addonCategory.findFirst({
      where: { id, merchantId },
      include: {
        _count: {
          select: {
            menuAddonCategories: true,
          },
        },
      },
    });

    if (!category) {
      throw new Error('Addon category not found');
    }

    if (category._count.menuAddonCategories > 0) {
      throw new Error(
        'Cannot delete addon category that is assigned to menu items'
      );
    }

    return await prisma.addonCategory.delete({
      where: { id },
    });
  }

  // ==================== ADDON ITEMS ====================

  /**
   * Get all addon items for a category
   */
  async getAddonItems(addonCategoryId: bigint, merchantId: bigint) {
    // Verify category belongs to merchant
    const category = await prisma.addonCategory.findFirst({
      where: { id: addonCategoryId, merchantId },
    });

    if (!category) {
      throw new Error('Addon category not found');
    }

    return await prisma.addonItem.findMany({
      where: { addonCategoryId },
      include: {
        addonCategory: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { displayOrder: 'asc' },
    });
  }

  /**
   * Get all addon items for a merchant (across all categories)
   */
  async getAllAddonItemsByMerchant(merchantId: bigint) {
    return await prisma.addonItem.findMany({
      where: {
        addonCategory: {
          merchantId,
        },
      },
      include: {
        addonCategory: {
          select: {
            id: true,
            name: true,
            merchantId: true,
          },
        },
      },
      orderBy: [{ addonCategory: { name: 'asc' } }, { displayOrder: 'asc' }],
    });
  }

  /**
   * Get single addon item by ID
   */
  async getAddonItemById(id: bigint, merchantId: bigint) {
    return await prisma.addonItem.findFirst({
      where: {
        id,
        addonCategory: {
          merchantId,
        },
      },
      include: {
        addonCategory: true,
      },
    });
  }

  /**
   * Create new addon item
   */
  async createAddonItem(merchantId: bigint, data: CreateAddonItemDTO) {
    // Verify category belongs to merchant
    const category = await prisma.addonCategory.findFirst({
      where: {
        id: data.addonCategoryId,
        merchantId,
      },
    });

    if (!category) {
      throw new Error('Addon category not found');
    }

    // Get the highest displayOrder for this category
    const highestOrder = await prisma.addonItem.findFirst({
      where: { addonCategoryId: data.addonCategoryId },
      orderBy: { displayOrder: 'desc' },
      select: { displayOrder: true },
    });

    const nextOrder = (highestOrder?.displayOrder ?? -1) + 1;

    return await prisma.addonItem.create({
      data: {
        addonCategoryId: data.addonCategoryId,
        name: data.name,
        description: data.description || null,
        price: data.price ?? 0,
        inputType: data.inputType || 'SELECT',
        displayOrder: data.displayOrder ?? nextOrder,
        isActive: true,
        trackStock: data.trackStock || false,
        stockQty: data.trackStock ? data.stockQty || 0 : null,
      },
      include: {
        addonCategory: true,
      },
    });
  }

  /**
   * Update addon item
   */
  async updateAddonItem(
    id: bigint,
    merchantId: bigint,
    data: UpdateAddonItemDTO
  ) {
    // Verify item belongs to merchant's category
    const item = await this.getAddonItemById(id, merchantId);
    if (!item) {
      throw new Error('Addon item not found');
    }

    const updateData: Record<string, unknown> = {
      name: data.name,
      description: data.description,
      price: data.price !== undefined ? data.price : undefined,
      inputType: data.inputType,
      isActive: data.isActive,
    };

    // Handle stock tracking
    if (data.trackStock !== undefined) {
      updateData.trackStock = data.trackStock;
      if (data.trackStock) {
        updateData.stockQty = data.stockQty !== undefined ? data.stockQty : 0;
      } else {
        updateData.stockQty = null;
      }
    } else if (data.stockQty !== undefined && item.trackStock) {
      updateData.stockQty = data.stockQty;
    }

    return await prisma.addonItem.update({
      where: { id },
      data: updateData,
      include: {
        addonCategory: true,
      },
    });
  }

  /**
   * Toggle addon item active status
   */
  async toggleAddonItemActive(id: bigint, merchantId: bigint) {
    const item = await this.getAddonItemById(id, merchantId);
    if (!item) return null;

    return await prisma.addonItem.update({
      where: { id },
      data: { isActive: !item.isActive },
      include: {
        addonCategory: true,
      },
    });
  }

  /**
   * Update addon item stock
   */
  async updateAddonItemStock(id: bigint, merchantId: bigint, quantity: number) {
    const item = await this.getAddonItemById(id, merchantId);
    if (!item) {
      throw new Error('Addon item not found');
    }

    if (!item.trackStock) {
      throw new Error('Stock tracking is not enabled for this addon item');
    }

    const currentStock = item.stockQty || 0;
    const newStock = currentStock + quantity;

    return await prisma.addonItem.update({
      where: { id },
      data: { stockQty: Math.max(0, newStock) },
      include: {
        addonCategory: true,
      },
    });
  }

  /**
   * Set addon item stock (absolute value)
   */
  async setAddonItemStock(id: bigint, merchantId: bigint, quantity: number) {
    const item = await this.getAddonItemById(id, merchantId);
    if (!item) {
      throw new Error('Addon item not found');
    }

    if (!item.trackStock) {
      throw new Error('Stock tracking is not enabled for this addon item');
    }

    return await prisma.addonItem.update({
      where: { id },
      data: { stockQty: Math.max(0, quantity) },
      include: {
        addonCategory: true,
      },
    });
  }

  /**
   * Delete addon item
   */
  async deleteAddonItem(id: bigint, merchantId: bigint) {
    // Verify item belongs to merchant's category
    const item = await this.getAddonItemById(id, merchantId);
    if (!item) {
      throw new Error('Addon item not found');
    }

    // Check if item is used in any orders
    const orderCount = await prisma.orderItemAddon.count({
      where: { addonItemId: id },
    });

    if (orderCount > 0) {
      throw new Error(
        'Cannot delete addon item that has been used in orders. Consider deactivating instead.'
      );
    }

    return await prisma.addonItem.delete({
      where: { id },
    });
  }

  /**
   * Reorder addon items within a category
   */
  async reorderAddonItems(
    addonCategoryId: bigint,
    merchantId: bigint,
    itemOrders: Array<{ id: bigint; displayOrder: number }>
  ) {
    // Verify category belongs to merchant
    const category = await prisma.addonCategory.findFirst({
      where: { id: addonCategoryId, merchantId },
    });

    if (!category) {
      throw new Error('Addon category not found');
    }

    // Update all items in a transaction
    await prisma.$transaction(
      itemOrders.map((item) =>
        prisma.addonItem.update({
          where: { id: item.id },
          data: { displayOrder: item.displayOrder },
        })
      )
    );

    return true;
  }

  // ==================== MENU-ADDON ASSOCIATIONS ====================

  /**
   * Get menus using an addon category
   */
  async getMenusByAddonCategory(addonCategoryId: bigint, merchantId: bigint) {
    // Verify category belongs to merchant
    const category = await prisma.addonCategory.findFirst({
      where: { id: addonCategoryId, merchantId },
    });

    if (!category) {
      throw new Error('Addon category not found');
    }

    return await prisma.menu.findMany({
      where: {
        merchantId,
        addonCategories: {
          some: {
            addonCategoryId,
          },
        },
      },
      select: {
        id: true,
        name: true,
        price: true,
        imageUrl: true,
        isActive: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Add addon category to menu
   */
  async addAddonCategoryToMenu(
    menuId: bigint,
    addonCategoryId: bigint,
    merchantId: bigint
  ) {
    // Verify both menu and category belong to merchant
    const [menu, category] = await Promise.all([
      prisma.menu.findFirst({
        where: { id: menuId, merchantId },
      }),
      prisma.addonCategory.findFirst({
        where: { id: addonCategoryId, merchantId },
      }),
    ]);

    if (!menu) {
      throw new Error('Menu not found');
    }

    if (!category) {
      throw new Error('Addon category not found');
    }

    // Check if association already exists
    const existing = await prisma.menuAddonCategory.findFirst({
      where: {
        menuId,
        addonCategoryId,
      },
    });

    if (existing) {
      throw new Error('Addon category is already assigned to this menu');
    }

    // Get highest display order for this menu
    const highestOrder = await prisma.menuAddonCategory.findFirst({
      where: { menuId },
      orderBy: { displayOrder: 'desc' },
      select: { displayOrder: true },
    });

    const nextOrder = (highestOrder?.displayOrder ?? -1) + 1;

    return await prisma.menuAddonCategory.create({
      data: {
        menuId,
        addonCategoryId,
        isRequired: false,
        displayOrder: nextOrder,
      },
      include: {
        menu: {
          select: {
            id: true,
            name: true,
            price: true,
          },
        },
        addonCategory: {
          include: {
            addonItems: {
              where: { isActive: true },
              orderBy: { name: 'asc' },
            },
          },
        },
      },
    });
  }

  /**
   * Remove addon category from menu
   */
  async removeAddonCategoryFromMenu(
    menuId: bigint,
    addonCategoryId: bigint,
    merchantId: bigint
  ) {
    // Verify both menu and category belong to merchant
    const [menu, category] = await Promise.all([
      prisma.menu.findFirst({
        where: { id: menuId, merchantId },
      }),
      prisma.addonCategory.findFirst({
        where: { id: addonCategoryId, merchantId },
      }),
    ]);

    if (!menu || !category) {
      throw new Error('Menu or addon category not found');
    }

    return await prisma.menuAddonCategory.delete({
      where: {
        menuId_addonCategoryId: {
          menuId,
          addonCategoryId,
        },
      },
    });
  }

  /**
   * Update menu addon category settings (isRequired, displayOrder)
   */
  async updateMenuAddonCategory(
    menuId: bigint,
    addonCategoryId: bigint,
    merchantId: bigint,
    data: { isRequired?: boolean; displayOrder?: number }
  ) {
    // Verify both menu and category belong to merchant
    const [menu, category] = await Promise.all([
      prisma.menu.findFirst({
        where: { id: menuId, merchantId },
      }),
      prisma.addonCategory.findFirst({
        where: { id: addonCategoryId, merchantId },
      }),
    ]);

    if (!menu || !category) {
      throw new Error('Menu or addon category not found');
    }

    return await prisma.menuAddonCategory.update({
      where: {
        menuId_addonCategoryId: {
          menuId,
          addonCategoryId,
        },
      },
      data: {
        isRequired: data.isRequired,
        displayOrder: data.displayOrder,
      },
      include: {
        addonCategory: {
          include: {
            addonItems: {
              where: { isActive: true },
              orderBy: { name: 'asc' },
            },
          },
        },
      },
    });
  }

  /**
   * Get all addon categories for a specific menu
   */
  async getAddonCategoriesByMenu(menuId: bigint, merchantId: bigint) {
    // Verify menu belongs to merchant
    const menu = await prisma.menu.findFirst({
      where: { id: menuId, merchantId },
    });

    if (!menu) {
      throw new Error('Menu not found');
    }

    const menuAddons = await prisma.menuAddonCategory.findMany({
      where: { menuId },
      include: {
        addonCategory: {
          include: {
            addonItems: {
              where: { isActive: true },
              orderBy: { name: 'asc' },
            },
          },
        },
      },
      orderBy: { displayOrder: 'asc' },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return menuAddons.map((ma: any) => ({
      ...ma.addonCategory,
      isRequired: ma.isRequired,
      displayOrder: ma.displayOrder,
    }));
  }
}

const addonRepository = new AddonRepository();
export default addonRepository;
