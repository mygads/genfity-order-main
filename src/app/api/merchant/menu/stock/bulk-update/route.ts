import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/serverAuth';
import prisma from '@/lib/db/client';
import { z } from 'zod';

/**
 * Bulk Stock Update API Endpoint
 * 
 * Allows merchants to update stock quantities for multiple menu items and addon items
 * in a single request. Supports:
 * - Manual stock quantity updates
 * - Reset to daily stock template
 * - Batch operations for efficiency
 * 
 * @route POST /api/merchant/menu/stock/bulk-update
 */

// Validation schema
const bulkStockUpdateSchema = z.object({
  updates: z.array(z.object({
    type: z.enum(['menu', 'addon']),
    id: z.number().int().positive(),
    stockQty: z.number().int().min(0).optional(),
    resetToTemplate: z.boolean().optional(),
  })).min(1),
});

interface UpdateResult {
  success: boolean;
  type: 'menu' | 'addon';
  id: number;
  name: string;
  previousStock: number | null;
  newStock: number | null;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json(
        {
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Anda harus login terlebih dahulu',
          statusCode: 401,
        },
        { status: 401 }
      );
    }

    const userId = authUser.id;

    // Get merchant for current user
    const merchantUser = await prisma.merchantUser.findFirst({
      where: {
        userId: userId,
      },
      include: {
        merchant: true,
      },
    });

    if (!merchantUser) {
      return NextResponse.json(
        {
          success: false,
          error: 'MERCHANT_NOT_FOUND',
          message: 'Merchant tidak ditemukan',
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    const merchantId = merchantUser.merchantId;

    // Parse and validate request body
    const body = await request.json();
    const validation = bulkStockUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Data tidak valid',
          details: validation.error.issues,
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    const { updates } = validation.data;
    const results: UpdateResult[] = [];

    // Process each update
    for (const update of updates) {
      try {
        if (update.type === 'menu') {
          // Update menu item stock
          const menuItem = await prisma.menu.findFirst({
            where: {
              id: BigInt(update.id),
              merchantId: merchantId,
              deletedAt: null,
            },
          });

          if (!menuItem) {
            results.push({
              success: false,
              type: 'menu',
              id: update.id,
              name: 'Unknown',
              previousStock: null,
              newStock: null,
              error: 'Menu tidak ditemukan',
            });
            continue;
          }

          let newStockQty: number | null = null;

          if (update.resetToTemplate) {
            // Reset to daily stock template
            if (menuItem.dailyStockTemplate !== null) {
              newStockQty = menuItem.dailyStockTemplate;
            } else {
              results.push({
                success: false,
                type: 'menu',
                id: update.id,
                name: menuItem.name,
                previousStock: menuItem.stockQty,
                newStock: null,
                error: 'Template stok harian belum diatur',
              });
              continue;
            }
          } else if (update.stockQty !== undefined) {
            // Manual stock update
            newStockQty = update.stockQty;
          } else {
            results.push({
              success: false,
              type: 'menu',
              id: update.id,
              name: menuItem.name,
              previousStock: menuItem.stockQty,
              newStock: null,
              error: 'stockQty atau resetToTemplate harus diisi',
            });
            continue;
          }

          // Update the menu item
          const updated = await prisma.menu.update({
            where: { id: menuItem.id },
            data: {
              stockQty: newStockQty,
              lastStockResetAt: update.resetToTemplate ? new Date() : menuItem.lastStockResetAt,
              updatedByUserId: userId,
            },
          });

          results.push({
            success: true,
            type: 'menu',
            id: update.id,
            name: menuItem.name,
            previousStock: menuItem.stockQty,
            newStock: updated.stockQty,
          });

        } else if (update.type === 'addon') {
          // Update addon item stock
          const addonItem = await prisma.addonItem.findFirst({
            where: {
              id: BigInt(update.id),
              addonCategory: {
                merchantId: merchantId,
              },
              deletedAt: null,
            },
            include: {
              addonCategory: true,
            },
          });

          if (!addonItem) {
            results.push({
              success: false,
              type: 'addon',
              id: update.id,
              name: 'Unknown',
              previousStock: null,
              newStock: null,
              error: 'Addon tidak ditemukan',
            });
            continue;
          }

          let newStockQty: number | null = null;

          if (update.resetToTemplate) {
            // Reset to daily stock template
            if (addonItem.dailyStockTemplate !== null) {
              newStockQty = addonItem.dailyStockTemplate;
            } else {
              results.push({
                success: false,
                type: 'addon',
                id: update.id,
                name: addonItem.name,
                previousStock: addonItem.stockQty,
                newStock: null,
                error: 'Template stok harian belum diatur',
              });
              continue;
            }
          } else if (update.stockQty !== undefined) {
            // Manual stock update
            newStockQty = update.stockQty;
          } else {
            results.push({
              success: false,
              type: 'addon',
              id: update.id,
              name: addonItem.name,
              previousStock: addonItem.stockQty,
              newStock: null,
              error: 'stockQty atau resetToTemplate harus diisi',
            });
            continue;
          }

          // Update the addon item
          const updated = await prisma.addonItem.update({
            where: { id: addonItem.id },
            data: {
              stockQty: newStockQty,
              lastStockResetAt: update.resetToTemplate ? new Date() : addonItem.lastStockResetAt,
              updatedByUserId: userId,
            },
          });

          results.push({
            success: true,
            type: 'addon',
            id: update.id,
            name: addonItem.name,
            previousStock: addonItem.stockQty,
            newStock: updated.stockQty,
          });
        }
      } catch (error) {
        console.error(`Error updating ${update.type} ${update.id}:`, error);
        results.push({
          success: false,
          type: update.type,
          id: update.id,
          name: 'Unknown',
          previousStock: null,
          newStock: null,
          error: 'Terjadi kesalahan saat update stok',
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    return NextResponse.json(
      {
        success: true,
        data: {
          results,
          summary: {
            total: results.length,
            success: successCount,
            failed: failCount,
          },
        },
        message: `Berhasil update ${successCount} item, ${failCount} gagal`,
        statusCode: 200,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Bulk stock update error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Terjadi kesalahan internal',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}
