import prisma from '@/lib/db/client';
import { Prisma } from '@prisma/client';

/**
 * Menu Builder Service
 * 
 * Handles complex menu creation and updates with categories and addon categories
 * in a single transaction. Simplifies the menu creation workflow from 4 pages to 1.
 */

export interface MenuBuilderInput {
  // Basic Info
  name: string;
  description?: string;
  price: number;
  imageUrl?: string | null;
  imageThumbUrl?: string | null;
  imageThumbMeta?: Prisma.InputJsonValue | null;
  stockPhotoId?: number | null;
  isActive?: boolean;
  // Note: Promo pricing is now managed via SpecialPrice table
  
  // Stock Management
  trackStock?: boolean;
  stockQty?: number | null;
  dailyStockTemplate?: number | null;
  autoResetStock?: boolean;
  
  // Menu Attributes
  isSpicy?: boolean;
  isBestSeller?: boolean;
  isSignature?: boolean;
  isRecommended?: boolean;
  
  // Categories (many-to-many)
  categoryIds?: number[];
  
  // Addon Categories (many-to-many)
  addonCategoryIds?: number[];
}

export interface MenuBuilderResult {
  menu: {
    id: string;
    name: string;
    price: number;
    categories: Array<{ id: string; name: string }>;
    addonCategories: Array<{ id: string; name: string }>;
  };
}

export class MenuBuilderService {
  /**
   * Create a complete menu with categories and addon categories
   * 
   * @param merchantId - Merchant ID
   * @param userId - User ID for audit trail
   * @param input - Menu builder input data
   * @returns Created menu with all relations
   */
  static async createMenu(
    merchantId: bigint,
    userId: bigint,
    input: MenuBuilderInput
  ): Promise<MenuBuilderResult> {
    return await prisma.$transaction(async (tx) => {
      const stockPhotoId = input.stockPhotoId
        ? BigInt(input.stockPhotoId)
        : null;
      let imageUrl = input.imageUrl;
      let imageThumbUrl = input.imageThumbUrl;
      let imageThumbMeta = input.imageThumbMeta ?? undefined;

      if (stockPhotoId) {
        const stockPhoto = await tx.stockPhoto.findUnique({
          where: { id: stockPhotoId },
        });

        if (!stockPhoto || !stockPhoto.isActive) {
          throw new Error('Foto stok tidak ditemukan');
        }

        imageUrl = stockPhoto.imageUrl;
        imageThumbUrl = stockPhoto.thumbnailUrl;
        imageThumbMeta = stockPhoto.thumbnailMeta ?? Prisma.DbNull;
      }

      // 1. Create the menu
      const menu = await tx.menu.create({
        data: {
          merchantId,
          name: input.name,
          description: input.description,
          price: new Prisma.Decimal(input.price),
          imageUrl,
          imageThumbUrl,
          imageThumbMeta,
          stockPhotoId: stockPhotoId ?? undefined,
          isActive: input.isActive ?? true,
          // Promo fields removed - use SpecialPrice table
          trackStock: input.trackStock ?? false,
          stockQty: input.stockQty,
          dailyStockTemplate: input.dailyStockTemplate,
          autoResetStock: input.autoResetStock ?? false,
          // Menu attributes
          isSpicy: input.isSpicy ?? false,
          isBestSeller: input.isBestSeller ?? false,
          isSignature: input.isSignature ?? false,
          isRecommended: input.isRecommended ?? false,
          createdByUserId: userId,
          updatedByUserId: userId,
        },
      });

      if (stockPhotoId) {
        const usageCount = await tx.menu.count({
          where: {
            stockPhotoId,
            deletedAt: null,
          },
        });

        await tx.stockPhoto.update({
          where: { id: stockPhotoId },
          data: { usageCount },
        });
      }

      // 2. Associate with categories (many-to-many)
      if (input.categoryIds && input.categoryIds.length > 0) {
        // Verify all categories belong to this merchant
        const categories = await tx.menuCategory.findMany({
          where: {
            id: { in: input.categoryIds.map(id => BigInt(id)) },
            merchantId,
            deletedAt: null,
          },
        });

        if (categories.length !== input.categoryIds.length) {
          throw new Error('Beberapa kategori tidak valid atau tidak ditemukan');
        }

        // Create menu-category associations
        await tx.menuCategoryItem.createMany({
          data: categories.map((cat: { id: bigint }) => ({
            menuId: menu.id,
            categoryId: cat.id,
          })),
        });
      }

      // 3. Associate with addon categories (many-to-many)
      if (input.addonCategoryIds && input.addonCategoryIds.length > 0) {
        // Verify all addon categories belong to this merchant
        const addonCategories = await tx.addonCategory.findMany({
          where: {
            id: { in: input.addonCategoryIds.map(id => BigInt(id)) },
            merchantId,
            deletedAt: null,
          },
        });

        if (addonCategories.length !== input.addonCategoryIds.length) {
          throw new Error('Beberapa kategori addon tidak valid atau tidak ditemukan');
        }

        // Create menu-addon-category associations
        await tx.menuAddonCategory.createMany({
          data: addonCategories.map((addonCat: { id: bigint }, index: number) => ({
            menuId: menu.id,
            addonCategoryId: addonCat.id,
            displayOrder: index,
          })),
        });
      }

      // 4. Fetch complete menu with relations
      const completeMenu = await tx.menu.findUnique({
        where: { id: menu.id },
        include: {
          categories: {
            include: {
              category: true,
            },
          },
          addonCategories: {
            include: {
              addonCategory: true,
            },
            orderBy: {
              displayOrder: 'asc',
            },
          },
        },
      });

      if (!completeMenu) {
        throw new Error('Menu tidak ditemukan setelah dibuat');
      }

      return {
        menu: {
          id: completeMenu.id.toString(),
          name: completeMenu.name,
          price: completeMenu.price.toNumber(),
          categories: completeMenu.categories.map((item) => ({
            id: item.category.id.toString(),
            name: item.category.name,
          })),
          addonCategories: completeMenu.addonCategories.map((item) => ({
            id: item.addonCategory.id.toString(),
            name: item.addonCategory.name,
          })),
        },
      };
    });
  }

  /**
   * Update a menu with categories and addon categories
   * 
   * @param menuId - Menu ID to update
   * @param merchantId - Merchant ID for verification
   * @param userId - User ID for audit trail
   * @param input - Menu builder input data
   * @returns Updated menu with all relations
   */
  static async updateMenu(
    menuId: bigint,
    merchantId: bigint,
    userId: bigint,
    input: MenuBuilderInput
  ): Promise<MenuBuilderResult> {
    return await prisma.$transaction(async (tx) => {
      // 1. Verify menu exists and belongs to merchant
      const existingMenu = await tx.menu.findFirst({
        where: {
          id: menuId,
          merchantId,
          deletedAt: null,
        },
      });

      if (!existingMenu) {
        throw new Error('Menu tidak ditemukan');
      }

      const previousStockPhotoId = existingMenu.stockPhotoId;
      const hasStockPhotoUpdate = typeof input.stockPhotoId !== 'undefined';
      const nextStockPhotoId = hasStockPhotoUpdate
        ? input.stockPhotoId
          ? BigInt(input.stockPhotoId)
          : null
        : previousStockPhotoId;
      let imageUrl = input.imageUrl;
      let imageThumbUrl = input.imageThumbUrl;
      let imageThumbMeta = input.imageThumbMeta ?? undefined;

      if (hasStockPhotoUpdate && nextStockPhotoId) {
        const stockPhoto = await tx.stockPhoto.findUnique({
          where: { id: nextStockPhotoId },
        });

        if (!stockPhoto || !stockPhoto.isActive) {
          throw new Error('Foto stok tidak ditemukan');
        }

        imageUrl = stockPhoto.imageUrl;
        imageThumbUrl = stockPhoto.thumbnailUrl;
        imageThumbMeta = stockPhoto.thumbnailMeta ?? Prisma.DbNull;
      }

      // 2. Update the menu
      const menu = await tx.menu.update({
        where: { id: menuId },
        data: {
          name: input.name,
          description: input.description,
          price: new Prisma.Decimal(input.price),
          imageUrl,
          imageThumbUrl,
          imageThumbMeta,
          stockPhotoId: hasStockPhotoUpdate ? nextStockPhotoId : undefined,
          isActive: input.isActive,
          // Promo fields removed - use SpecialPrice table
          trackStock: input.trackStock,
          stockQty: input.stockQty,
          dailyStockTemplate: input.dailyStockTemplate,
          autoResetStock: input.autoResetStock,
          // Menu attributes
          isSpicy: input.isSpicy,
          isBestSeller: input.isBestSeller,
          isSignature: input.isSignature,
          isRecommended: input.isRecommended,
          updatedByUserId: userId,
        },
      });

      if (hasStockPhotoUpdate) {
        if (previousStockPhotoId) {
          const usageCount = await tx.menu.count({
            where: {
              stockPhotoId: previousStockPhotoId,
              deletedAt: null,
            },
          });

          await tx.stockPhoto.update({
            where: { id: previousStockPhotoId },
            data: { usageCount },
          });
        }

        if (nextStockPhotoId) {
          const usageCount = await tx.menu.count({
            where: {
              stockPhotoId: nextStockPhotoId,
              deletedAt: null,
            },
          });

          await tx.stockPhoto.update({
            where: { id: nextStockPhotoId },
            data: { usageCount },
          });
        }
      }

      // 3. Update categories (delete all + recreate)
      if (input.categoryIds !== undefined) {
        await tx.menuCategoryItem.deleteMany({
          where: { menuId },
        });

        if (input.categoryIds.length > 0) {
          const categories = await tx.menuCategory.findMany({
            where: {
              id: { in: input.categoryIds.map(id => BigInt(id)) },
              merchantId,
              deletedAt: null,
            },
          });

          if (categories.length !== input.categoryIds.length) {
            throw new Error('Beberapa kategori tidak valid atau tidak ditemukan');
          }

          await tx.menuCategoryItem.createMany({
            data: categories.map((cat: { id: bigint }) => ({
              menuId: menu.id,
              categoryId: cat.id,
            })),
          });
        }
      }

      // 4. Update addon categories (delete all + recreate)
      if (input.addonCategoryIds !== undefined) {
        await tx.menuAddonCategory.deleteMany({
          where: { menuId },
        });

        if (input.addonCategoryIds.length > 0) {
          const addonCategories = await tx.addonCategory.findMany({
            where: {
              id: { in: input.addonCategoryIds.map(id => BigInt(id)) },
              merchantId,
              deletedAt: null,
            },
          });

          if (addonCategories.length !== input.addonCategoryIds.length) {
            throw new Error('Beberapa kategori addon tidak valid atau tidak ditemukan');
          }

          await tx.menuAddonCategory.createMany({
            data: addonCategories.map((addonCat: { id: bigint }, index: number) => ({
              menuId: menu.id,
              addonCategoryId: addonCat.id,
              displayOrder: index,
            })),
          });
        }
      }

      // 5. Fetch complete menu with relations
      const completeMenu = await tx.menu.findUnique({
        where: { id: menu.id },
        include: {
          categories: {
            include: {
              category: true,
            },
          },
          addonCategories: {
            include: {
              addonCategory: true,
            },
            orderBy: {
              displayOrder: 'asc',
            },
          },
        },
      });

      if (!completeMenu) {
        throw new Error('Menu tidak ditemukan setelah update');
      }

      return {
        menu: {
          id: completeMenu.id.toString(),
          name: completeMenu.name,
          price: completeMenu.price.toNumber(),
          categories: completeMenu.categories.map((item) => ({
            id: item.category.id.toString(),
            name: item.category.name,
          })),
          addonCategories: completeMenu.addonCategories.map((item) => ({
            id: item.addonCategory.id.toString(),
            name: item.addonCategory.name,
          })),
        },
      };
    });
  }

  /**
   * Get complete menu details for builder
   * 
   * @param menuId - Menu ID
   * @param merchantId - Merchant ID for verification
   * @returns Complete menu with all relations
   */
  static async getMenuForBuilder(menuId: bigint, merchantId: bigint) {
    const menu = await prisma.menu.findFirst({
      where: {
        id: menuId,
        merchantId,
        deletedAt: null,
      },
      include: {
        categories: {
          include: {
            category: true,
          },
        },
        addonCategories: {
          include: {
            addonCategory: {
              include: {
                addonItems: {
                  where: {
                    deletedAt: null,
                  },
                  orderBy: {
                    displayOrder: 'asc',
                  },
                },
              },
            },
          },
          orderBy: {
            displayOrder: 'asc',
          },
        },
      },
    });

    if (!menu) {
      throw new Error('Menu tidak ditemukan');
    }

    return menu;
  }
}
