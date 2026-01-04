/**
 * Soft Delete Cleanup API
 * POST /api/admin/cleanup/soft-deleted - Permanently delete records older than 30 days
 * 
 * This endpoint should be called by a scheduled job (cron) daily
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withSuperAdmin } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/types/auth';

// Cleanup threshold - records older than this will be permanently deleted
const CLEANUP_THRESHOLD_DAYS = 30;

interface CleanupResult {
  table: string;
  deletedCount: number;
}

/**
 * POST /api/admin/cleanup/soft-deleted
 * Permanently delete soft-deleted records older than 30 days
 */
async function handlePost(
  req: NextRequest,
  _context: AuthContext,
  _routeContext: { params: Promise<Record<string, string>> }
) {
  try {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - CLEANUP_THRESHOLD_DAYS);

    const results: CleanupResult[] = [];

    // 1. Delete old soft-deleted MenuCategoryItems (junction table)
    // These need to be deleted first due to foreign key constraints
    const deletedMenuCategoryItems = await prisma.menuCategoryItem.deleteMany({
      where: {
        menu: {
          deletedAt: {
            not: null,
            lt: thresholdDate,
          },
        },
      },
    });
    results.push({ table: 'MenuCategoryItem', deletedCount: deletedMenuCategoryItems.count });

    // 2. Delete old soft-deleted MenuAddonCategories (junction table)
    const deletedMenuAddonCategories = await prisma.menuAddonCategory.deleteMany({
      where: {
        menu: {
          deletedAt: {
            not: null,
            lt: thresholdDate,
          },
        },
      },
    });
    results.push({ table: 'MenuAddonCategory', deletedCount: deletedMenuAddonCategories.count });

    // 3. Delete old soft-deleted AddonItems
    const deletedAddonItems = await prisma.addonItem.deleteMany({
      where: {
        deletedAt: {
          not: null,
          lt: thresholdDate,
        },
      },
    });
    results.push({ table: 'AddonItem', deletedCount: deletedAddonItems.count });

    // 4. Delete old soft-deleted AddonCategories
    const deletedAddonCategories = await prisma.addonCategory.deleteMany({
      where: {
        deletedAt: {
          not: null,
          lt: thresholdDate,
        },
      },
    });
    results.push({ table: 'AddonCategory', deletedCount: deletedAddonCategories.count });

    // 5. Delete old soft-deleted Menus
    const deletedMenus = await prisma.menu.deleteMany({
      where: {
        deletedAt: {
          not: null,
          lt: thresholdDate,
        },
      },
    });
    results.push({ table: 'Menu', deletedCount: deletedMenus.count });

    // 6. Delete old soft-deleted MenuCategories
    const deletedMenuCategories = await prisma.menuCategory.deleteMany({
      where: {
        deletedAt: {
          not: null,
          lt: thresholdDate,
        },
      },
    });
    results.push({ table: 'MenuCategory', deletedCount: deletedMenuCategories.count });

    const totalDeleted = results.reduce((sum, r) => sum + r.deletedCount, 0);

    console.log(`[Cleanup] Permanently deleted ${totalDeleted} soft-deleted records older than ${CLEANUP_THRESHOLD_DAYS} days`);

    return NextResponse.json({
      success: true,
      message: `Permanently deleted ${totalDeleted} soft-deleted records older than ${CLEANUP_THRESHOLD_DAYS} days`,
      data: {
        thresholdDate: thresholdDate.toISOString(),
        thresholdDays: CLEANUP_THRESHOLD_DAYS,
        results,
        totalDeleted,
      },
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error cleaning up soft-deleted records:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to cleanup soft-deleted records',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/cleanup/soft-deleted
 * Preview what would be deleted without actually deleting
 */
async function handleGet(
  req: NextRequest,
  _context: AuthContext,
  _routeContext: { params: Promise<Record<string, string>> }
) {
  try {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - CLEANUP_THRESHOLD_DAYS);

    // Count records that would be deleted
    const [menuCount, menuCategoryCount, addonCategoryCount, addonItemCount] = await Promise.all([
      prisma.menu.count({
        where: {
          deletedAt: {
            not: null,
            lt: thresholdDate,
          },
        },
      }),
      prisma.menuCategory.count({
        where: {
          deletedAt: {
            not: null,
            lt: thresholdDate,
          },
        },
      }),
      prisma.addonCategory.count({
        where: {
          deletedAt: {
            not: null,
            lt: thresholdDate,
          },
        },
      }),
      prisma.addonItem.count({
        where: {
          deletedAt: {
            not: null,
            lt: thresholdDate,
          },
        },
      }),
    ]);

    const totalToDelete = menuCount + menuCategoryCount + addonCategoryCount + addonItemCount;

    return NextResponse.json({
      success: true,
      message: `Preview of records that would be permanently deleted`,
      data: {
        thresholdDate: thresholdDate.toISOString(),
        thresholdDays: CLEANUP_THRESHOLD_DAYS,
        preview: {
          menus: menuCount,
          menuCategories: menuCategoryCount,
          addonCategories: addonCategoryCount,
          addonItems: addonItemCount,
          total: totalToDelete,
        },
      },
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error previewing cleanup:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to preview cleanup',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

export const GET = withSuperAdmin(handleGet);
export const POST = withSuperAdmin(handlePost);
