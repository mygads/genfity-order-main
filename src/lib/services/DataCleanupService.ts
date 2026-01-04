/**
 * Data Cleanup Service
 * Handles permanent deletion of old soft-deleted records and orphaned images
 * 
 * Tasks:
 * 1. Permanently delete soft-deleted records older than 30 days
 * 2. Clean up orphaned blob images (menu images from deleted menus)
 * 3. Restore soft-deleted items
 */

import prisma from '@/lib/db/client';
import { BlobService } from '@/lib/services/BlobService';
import { serializeBigInt } from '@/lib/utils/serializer';

interface CleanupResult {
  task: string;
  deletedCount: number;
  success: boolean;
  details?: string[];
  error?: string;
}

interface CleanupSummary {
  startedAt: Date;
  completedAt: Date;
  results: CleanupResult[];
  totalDeleted: number;
  totalErrors: number;
}

// Default retention period: 30 days
const RETENTION_DAYS = 30;

class DataCleanupService {
  /**
   * Run all cleanup tasks
   */
  async runAllTasks(): Promise<CleanupSummary> {
    const startedAt = new Date();
    const results: CleanupResult[] = [];

    // Task 1: Permanently delete old soft-deleted menus and their images
    results.push(await this.cleanupDeletedMenus());

    // Task 2: Permanently delete old soft-deleted menu categories
    results.push(await this.cleanupDeletedMenuCategories());

    // Task 3: Permanently delete old soft-deleted addon categories
    results.push(await this.cleanupDeletedAddonCategories());

    // Task 4: Permanently delete old soft-deleted addon items
    results.push(await this.cleanupDeletedAddonItems());

    // Task 5: Clean up orphaned menu images
    results.push(await this.cleanupOrphanedMenuImages());

    const completedAt = new Date();
    const totalDeleted = results.reduce((sum, r) => sum + r.deletedCount, 0);
    const totalErrors = results.filter(r => !r.success).length;

    return {
      startedAt,
      completedAt,
      results,
      totalDeleted,
      totalErrors,
    };
  }

  /**
   * Permanently delete soft-deleted menus older than 30 days
   * Also deletes associated images from blob storage
   */
  async cleanupDeletedMenus(): Promise<CleanupResult> {
    const details: string[] = [];
    let deletedCount = 0;

    try {
      const threshold = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

      // Find all soft-deleted menus older than threshold
      const deletedMenus = await prisma.menu.findMany({
        where: {
          deletedAt: {
            not: null,
            lt: threshold,
          },
        },
        select: {
          id: true,
          name: true,
          imageUrl: true,
          merchantId: true,
        },
      });

      for (const menu of deletedMenus) {
        try {
          // Delete menu image from blob storage if exists
          if (menu.imageUrl && menu.imageUrl.includes('vercel-storage.com')) {
            try {
              await BlobService.deleteFile(menu.imageUrl);
              details.push(`Deleted image for menu: ${menu.name} (ID: ${menu.id})`);
            } catch (imgError) {
              console.warn(`Failed to delete image for menu ${menu.id}:`, imgError);
              // Continue even if image deletion fails
            }
          }

          // Permanently delete the menu
          await prisma.menu.delete({
            where: { id: menu.id },
          });

          deletedCount++;
          details.push(`Permanently deleted menu: ${menu.name} (ID: ${menu.id})`);
        } catch (menuError) {
          console.error(`Failed to delete menu ${menu.id}:`, menuError);
        }
      }

      return {
        task: 'Cleanup Deleted Menus',
        deletedCount,
        success: true,
        details: details.length > 0 ? details : undefined,
      };
    } catch (error) {
      return {
        task: 'Cleanup Deleted Menus',
        deletedCount,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Permanently delete soft-deleted menu categories older than 30 days
   */
  async cleanupDeletedMenuCategories(): Promise<CleanupResult> {
    const details: string[] = [];
    let deletedCount = 0;

    try {
      const threshold = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

      // Find all soft-deleted categories older than threshold
      const deletedCategories = await prisma.menuCategory.findMany({
        where: {
          deletedAt: {
            not: null,
            lt: threshold,
          },
        },
        select: {
          id: true,
          name: true,
        },
      });

      for (const category of deletedCategories) {
        try {
          // Permanently delete the category
          await prisma.menuCategory.delete({
            where: { id: category.id },
          });

          deletedCount++;
          details.push(`Permanently deleted category: ${category.name} (ID: ${category.id})`);
        } catch (catError) {
          console.error(`Failed to delete category ${category.id}:`, catError);
        }
      }

      return {
        task: 'Cleanup Deleted Menu Categories',
        deletedCount,
        success: true,
        details: details.length > 0 ? details : undefined,
      };
    } catch (error) {
      return {
        task: 'Cleanup Deleted Menu Categories',
        deletedCount,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Permanently delete soft-deleted addon categories older than 30 days
   */
  async cleanupDeletedAddonCategories(): Promise<CleanupResult> {
    const details: string[] = [];
    let deletedCount = 0;

    try {
      const threshold = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

      // Find all soft-deleted addon categories older than threshold
      const deletedCategories = await prisma.addonCategory.findMany({
        where: {
          deletedAt: {
            not: null,
            lt: threshold,
          },
        },
        select: {
          id: true,
          name: true,
        },
      });

      for (const category of deletedCategories) {
        try {
          // Permanently delete the addon category
          await prisma.addonCategory.delete({
            where: { id: category.id },
          });

          deletedCount++;
          details.push(`Permanently deleted addon category: ${category.name} (ID: ${category.id})`);
        } catch (catError) {
          console.error(`Failed to delete addon category ${category.id}:`, catError);
        }
      }

      return {
        task: 'Cleanup Deleted Addon Categories',
        deletedCount,
        success: true,
        details: details.length > 0 ? details : undefined,
      };
    } catch (error) {
      return {
        task: 'Cleanup Deleted Addon Categories',
        deletedCount,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Permanently delete soft-deleted addon items older than 30 days
   */
  async cleanupDeletedAddonItems(): Promise<CleanupResult> {
    const details: string[] = [];
    let deletedCount = 0;

    try {
      const threshold = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

      // Find all soft-deleted addon items older than threshold
      const deletedItems = await prisma.addonItem.findMany({
        where: {
          deletedAt: {
            not: null,
            lt: threshold,
          },
        },
        select: {
          id: true,
          name: true,
        },
      });

      for (const item of deletedItems) {
        try {
          // Permanently delete the addon item
          await prisma.addonItem.delete({
            where: { id: item.id },
          });

          deletedCount++;
          details.push(`Permanently deleted addon item: ${item.name} (ID: ${item.id})`);
        } catch (itemError) {
          console.error(`Failed to delete addon item ${item.id}:`, itemError);
        }
      }

      return {
        task: 'Cleanup Deleted Addon Items',
        deletedCount,
        success: true,
        details: details.length > 0 ? details : undefined,
      };
    } catch (error) {
      return {
        task: 'Cleanup Deleted Addon Items',
        deletedCount,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Clean up orphaned menu images
   * Images that exist in blob storage but the menu is deleted or image URL changed
   */
  async cleanupOrphanedMenuImages(): Promise<CleanupResult> {
    const details: string[] = [];
    let deletedCount = 0;

    try {
      // List all images in the merchants/menus/ folder
      const allImages = await BlobService.listFiles('merchants/menus/', 5000);

      // Get all menu image URLs from database (including soft-deleted that are over 30 days)
      const threshold = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
      
      const activeMenuImages = await prisma.menu.findMany({
        where: {
          imageUrl: { not: null },
          OR: [
            { deletedAt: null },
            { deletedAt: { gte: threshold } }, // Keep images for recently deleted menus
          ],
        },
        select: { imageUrl: true },
      });

      const activeImageUrls = new Set(
        activeMenuImages.map(m => m.imageUrl).filter(Boolean)
      );

      // Find and delete orphaned images
      for (const image of allImages) {
        if (!activeImageUrls.has(image.url)) {
          try {
            await BlobService.deleteFile(image.url);
            deletedCount++;
            details.push(`Deleted orphaned image: ${image.pathname}`);
          } catch (imgError) {
            console.warn(`Failed to delete orphaned image ${image.pathname}:`, imgError);
          }
        }
      }

      return {
        task: 'Cleanup Orphaned Menu Images',
        deletedCount,
        success: true,
        details: details.length > 0 ? details : undefined,
      };
    } catch (error) {
      return {
        task: 'Cleanup Orphaned Menu Images',
        deletedCount,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // =============================================
  // RESTORE METHODS
  // =============================================

  /**
   * Restore a soft-deleted menu
   */
  async restoreMenu(menuId: bigint, userId: bigint): Promise<{ success: boolean; data?: unknown; error?: string }> {
    try {
      const menu = await prisma.menu.findUnique({
        where: { id: menuId },
        include: { merchant: { select: { id: true, name: true } } },
      });

      if (!menu) {
        return { success: false, error: 'Menu not found' };
      }

      if (!menu.deletedAt) {
        return { success: false, error: 'Menu is not deleted' };
      }

      // Note: restoredAt and restoredByUserId are schema fields that may not be in cached TS types
      // Use type assertion to allow these fields until TS server reloads
      const restored = await prisma.menu.update({
        where: { id: menuId },
        data: {
          deletedAt: null,
          deletedByUserId: null,
          restoredAt: new Date(),
          restoredByUserId: userId,
          isActive: true, // Optionally reactivate the menu
        } as Parameters<typeof prisma.menu.update>[0]['data'],
      });

      return { success: true, data: serializeBigInt(restored) };
    } catch (error) {
      console.error('Failed to restore menu:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Restore a soft-deleted menu category
   */
  async restoreMenuCategory(categoryId: bigint, userId: bigint): Promise<{ success: boolean; data?: unknown; error?: string }> {
    try {
      const category = await prisma.menuCategory.findUnique({
        where: { id: categoryId },
      });

      if (!category) {
        return { success: false, error: 'Category not found' };
      }

      if (!category.deletedAt) {
        return { success: false, error: 'Category is not deleted' };
      }

      const restored = await prisma.menuCategory.update({
        where: { id: categoryId },
        data: {
          deletedAt: null,
          deletedByUserId: null,
          restoredAt: new Date(),
          restoredByUserId: userId,
          isActive: true,
        } as Parameters<typeof prisma.menuCategory.update>[0]['data'],
      });

      return { success: true, data: serializeBigInt(restored) };
    } catch (error) {
      console.error('Failed to restore category:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Restore a soft-deleted addon category
   */
  async restoreAddonCategory(categoryId: bigint, userId: bigint): Promise<{ success: boolean; data?: unknown; error?: string }> {
    try {
      const category = await prisma.addonCategory.findUnique({
        where: { id: categoryId },
      });

      if (!category) {
        return { success: false, error: 'Addon category not found' };
      }

      if (!category.deletedAt) {
        return { success: false, error: 'Addon category is not deleted' };
      }

      const restored = await prisma.addonCategory.update({
        where: { id: categoryId },
        data: {
          deletedAt: null,
          deletedByUserId: null,
          restoredAt: new Date(),
          restoredByUserId: userId,
          isActive: true,
        } as Parameters<typeof prisma.addonCategory.update>[0]['data'],
      });

      return { success: true, data: serializeBigInt(restored) };
    } catch (error) {
      console.error('Failed to restore addon category:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Restore a soft-deleted addon item
   */
  async restoreAddonItem(itemId: bigint, userId: bigint): Promise<{ success: boolean; data?: unknown; error?: string }> {
    try {
      const item = await prisma.addonItem.findUnique({
        where: { id: itemId },
      });

      if (!item) {
        return { success: false, error: 'Addon item not found' };
      }

      if (!item.deletedAt) {
        return { success: false, error: 'Addon item is not deleted' };
      }

      const restored = await prisma.addonItem.update({
        where: { id: itemId },
        data: {
          deletedAt: null,
          deletedByUserId: null,
          restoredAt: new Date(),
          restoredByUserId: userId,
          isActive: true,
        } as Parameters<typeof prisma.addonItem.update>[0]['data'],
      });

      return { success: true, data: serializeBigInt(restored) };
    } catch (error) {
      console.error('Failed to restore addon item:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // =============================================
  // GET DELETED ITEMS (for showing in UI)
  // =============================================

  /**
   * Get all soft-deleted menus for a merchant
   */
  async getDeletedMenus(merchantId: bigint): Promise<unknown[]> {
    const menus = await prisma.menu.findMany({
      where: {
        merchantId,
        deletedAt: { not: null },
      },
      include: {
        deletedBy: { select: { id: true, email: true, name: true } },
      },
      orderBy: { deletedAt: 'desc' },
    });

    return serializeBigInt(menus);
  }

  /**
   * Get all soft-deleted menu categories for a merchant
   */
  async getDeletedMenuCategories(merchantId: bigint): Promise<unknown[]> {
    const categories = await prisma.menuCategory.findMany({
      where: {
        merchantId,
        deletedAt: { not: null },
      },
      include: {
        deletedBy: { select: { id: true, email: true, name: true } },
      },
      orderBy: { deletedAt: 'desc' },
    });

    return serializeBigInt(categories);
  }

  /**
   * Get all soft-deleted addon categories for a merchant
   */
  async getDeletedAddonCategories(merchantId: bigint): Promise<unknown[]> {
    const categories = await prisma.addonCategory.findMany({
      where: {
        merchantId,
        deletedAt: { not: null },
      },
      include: {
        deletedBy: { select: { id: true, email: true, name: true } },
      },
      orderBy: { deletedAt: 'desc' },
    });

    return serializeBigInt(categories);
  }

  /**
   * Get all soft-deleted addon items for an addon category
   */
  async getDeletedAddonItems(addonCategoryId: bigint): Promise<unknown[]> {
    const items = await prisma.addonItem.findMany({
      where: {
        addonCategoryId,
        deletedAt: { not: null },
      },
      include: {
        deletedBy: { select: { id: true, email: true, name: true } },
      },
      orderBy: { deletedAt: 'desc' },
    });

    return serializeBigInt(items);
  }

  // =============================================
  // BULK DELETE METHODS
  // =============================================

  /**
   * Bulk soft-delete multiple menus
   */
  async bulkDeleteMenus(menuIds: bigint[], userId: bigint): Promise<{ success: boolean; deletedCount: number }> {
    try {
      const result = await prisma.menu.updateMany({
        where: {
          id: { in: menuIds },
          deletedAt: null, // Only delete non-deleted menus
        },
        data: {
          deletedAt: new Date(),
          deletedByUserId: userId,
        },
      });

      return { success: true, deletedCount: result.count };
    } catch (error) {
      console.error('Bulk delete menus failed:', error);
      return { success: false, deletedCount: 0 };
    }
  }

  /**
   * Bulk soft-delete multiple menu categories
   */
  async bulkDeleteMenuCategories(categoryIds: bigint[], userId: bigint): Promise<{ success: boolean; deletedCount: number }> {
    try {
      const result = await prisma.menuCategory.updateMany({
        where: {
          id: { in: categoryIds },
          deletedAt: null,
        },
        data: {
          deletedAt: new Date(),
          deletedByUserId: userId,
        },
      });

      return { success: true, deletedCount: result.count };
    } catch (error) {
      console.error('Bulk delete categories failed:', error);
      return { success: false, deletedCount: 0 };
    }
  }

  /**
   * Bulk soft-delete multiple addon categories
   */
  async bulkDeleteAddonCategories(categoryIds: bigint[], userId: bigint): Promise<{ success: boolean; deletedCount: number }> {
    try {
      const result = await prisma.addonCategory.updateMany({
        where: {
          id: { in: categoryIds },
          deletedAt: null,
        },
        data: {
          deletedAt: new Date(),
          deletedByUserId: userId,
        },
      });

      return { success: true, deletedCount: result.count };
    } catch (error) {
      console.error('Bulk delete addon categories failed:', error);
      return { success: false, deletedCount: 0 };
    }
  }

  /**
   * Bulk soft-delete multiple addon items
   */
  async bulkDeleteAddonItems(itemIds: bigint[], userId: bigint): Promise<{ success: boolean; deletedCount: number }> {
    try {
      const result = await prisma.addonItem.updateMany({
        where: {
          id: { in: itemIds },
          deletedAt: null,
        },
        data: {
          deletedAt: new Date(),
          deletedByUserId: userId,
        },
      });

      return { success: true, deletedCount: result.count };
    } catch (error) {
      console.error('Bulk delete addon items failed:', error);
      return { success: false, deletedCount: 0 };
    }
  }

  /**
   * Bulk restore multiple menus
   */
  async bulkRestoreMenus(menuIds: bigint[], userId: bigint): Promise<{ success: boolean; restoredCount: number }> {
    try {
      const result = await prisma.menu.updateMany({
        where: {
          id: { in: menuIds },
          deletedAt: { not: null },
        },
        data: {
          deletedAt: null,
          deletedByUserId: null,
          restoredAt: new Date(),
          restoredByUserId: userId,
          isActive: true,
        } as Parameters<typeof prisma.menu.updateMany>[0]['data'],
      });

      return { success: true, restoredCount: result.count };
    } catch (error) {
      console.error('Bulk restore menus failed:', error);
      return { success: false, restoredCount: 0 };
    }
  }
}

const dataCleanupService = new DataCleanupService();
export default dataCleanupService;
