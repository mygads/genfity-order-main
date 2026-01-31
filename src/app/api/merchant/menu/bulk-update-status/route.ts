import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import prisma from "@/lib/db/client";
import { withMerchant } from "@/lib/middleware/auth";
import { serializeBigInt } from "@/lib/utils/serializer";

/**
 * POST /api/merchant/menu/bulk-update-status
 * Bulk update menu item status (activate/deactivate)
 */
export const POST = withMerchant(async (req: NextRequest, authContext) => {
  try {
    const { userId, merchantId } = authContext;
    const body = await req.json();
    const { ids, isActive } = body;

    // Validation
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'INVALID_IDS', message: "Menu item IDs are required", statusCode: 400 },
        { status: 400 }
      );
    }

    if (typeof isActive !== "boolean") {
      return NextResponse.json(
        { success: false, error: 'VALIDATION_ERROR', message: "isActive must be a boolean", statusCode: 400 },
        { status: 400 }
      );
    }

    // Convert string IDs to BigInt
    const menuIds = ids.map((id) => BigInt(id));

    // Verify all menus belong to this merchant
    const menus = await prisma.menu.findMany({
      where: {
        id: { in: menuIds },
        merchantId: merchantId,
      },
    });

    if (menus.length !== menuIds.length) {
      return NextResponse.json(
        {
          success: false,
          error: 'NOT_FOUND',
          message: "Some menu items not found or unauthorized",
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    // Bulk update
    const result = await prisma.menu.updateMany({
      where: {
        id: { in: menuIds },
        merchantId: merchantId,
      },
      data: {
        isActive: isActive,
        updatedByUserId: userId,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully ${isActive ? 'activated' : 'deactivated'} ${result.count} menu item(s)`,
      data: serializeBigInt({ count: result.count }),
    });
  } catch (error) {
    console.error("Bulk update menu status error:", error);
    return NextResponse.json(
      { 
        success: false,
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : "Failed to update menu items",
        statusCode: 500,
      },
      { status: 500 }
    );
  }
});
