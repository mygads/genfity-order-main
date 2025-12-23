/**
 * Recent Orders API for Customers
 * GET /api/customer/orders/recent
 * 
 * @description
 * Fetches unique menu items from customer's completed orders for quick reordering.
 * Returns menu items sorted by last ordered date.
 * 
 * @security
 * - JWT Bearer token required
 * - Customer can only see their own orders
 * 
 * @query
 * - merchantCode: Required - Filter by merchant
 * - limit: Optional - Number of items to return (default: 10)
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { verifyCustomerToken } from '@/lib/utils/auth';
import { serializeBigInt } from '@/lib/utils/serializer';

export async function GET(req: NextRequest) {
    try {
        // ========================================
        // STEP 1: Authentication
        // ========================================

        const authHeader = req.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'UNAUTHORIZED',
                    message: 'Token not provided',
                    statusCode: 401,
                },
                { status: 401 }
            );
        }

        const token = authHeader.substring(7);
        const decoded = await verifyCustomerToken(token);

        if (!decoded) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'INVALID_TOKEN',
                    message: 'Invalid token',
                    statusCode: 401,
                },
                { status: 401 }
            );
        }

        // ========================================
        // STEP 2: Get Query Params
        // ========================================

        const { searchParams } = new URL(req.url);
        const merchantCode = searchParams.get('merchantCode');
        const limit = parseInt(searchParams.get('limit') || '10', 10);

        if (!merchantCode) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'MISSING_PARAM',
                    message: 'merchantCode is required',
                    statusCode: 400,
                },
                { status: 400 }
            );
        }

        console.log('🔍 Fetching recent orders for customer:', decoded.customerId, 'merchant:', merchantCode);

        // ========================================
        // STEP 3: Find Merchant
        // ========================================

        const merchant = await prisma.merchant.findUnique({
            where: { code: merchantCode },
            select: { id: true, currency: true },
        });

        if (!merchant) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'MERCHANT_NOT_FOUND',
                    message: 'Merchant not found',
                    statusCode: 404,
                },
                { status: 404 }
            );
        }

        // ========================================
        // STEP 4: Fetch Completed Orders with Menu Items
        // ========================================

        const completedOrders = await prisma.order.findMany({
            where: {
                customerId: BigInt(decoded.customerId),
                merchantId: merchant.id,
                status: 'COMPLETED',
            },
            include: {
                orderItems: {
                    include: {
                        menu: {
                            select: {
                                id: true,
                                name: true,
                                price: true,
                                imageUrl: true,
                                isActive: true,
                                trackStock: true,
                                stockQty: true,
                                isPromo: true,
                                promoPrice: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                placedAt: 'desc',
            },
        });

        console.log(`📦 Found ${completedOrders.length} completed orders`);

        // ========================================
        // STEP 5: Extract Unique Menu Items
        // ========================================

        // Map to track unique menus with their order count and last ordered date
        const menuMap = new Map<string, {
            menuId: string;
            menuName: string;
            menuPrice: number;
            menuImageUrl: string | null;
            lastOrderedAt: Date;
            orderCount: number;
            isActive: boolean;
            trackStock: boolean;
            stockQty: number | null;
            isPromo: boolean;
            promoPrice: number | null;
        }>();

        for (const order of completedOrders) {
            for (const item of order.orderItems) {
                if (!item.menu) continue;

                const menuIdStr = item.menu.id.toString();
                const existing = menuMap.get(menuIdStr);

                if (existing) {
                    // Update count and check for more recent order
                    existing.orderCount += 1;
                    if (order.placedAt > existing.lastOrderedAt) {
                        existing.lastOrderedAt = order.placedAt;
                    }
                } else {
                    // Add new menu item
                    menuMap.set(menuIdStr, {
                        menuId: menuIdStr,
                        menuName: item.menu.name,
                        menuPrice: parseFloat(item.menu.price.toString()),
                        menuImageUrl: item.menu.imageUrl,
                        lastOrderedAt: order.placedAt,
                        orderCount: 1,
                        isActive: item.menu.isActive,
                        trackStock: item.menu.trackStock,
                        stockQty: item.menu.stockQty,
                        isPromo: item.menu.isPromo || false,
                        promoPrice: item.menu.promoPrice ? parseFloat(item.menu.promoPrice.toString()) : null,
                    });
                }
            }
        }

        // Convert to array, filter active menus, sort by last ordered, and limit
        const recentItems = Array.from(menuMap.values())
            .filter(item => item.isActive) // Only show active menus
            .sort((a, b) => b.lastOrderedAt.getTime() - a.lastOrderedAt.getTime())
            .slice(0, limit)
            .map(item => ({
                menuId: item.menuId,
                menuName: item.menuName,
                menuPrice: item.menuPrice,
                menuImageUrl: item.menuImageUrl,
                lastOrderedAt: item.lastOrderedAt.toISOString(),
                orderCount: item.orderCount,
                isAvailable: !item.trackStock || (item.stockQty !== null && item.stockQty > 0),
                isPromo: item.isPromo,
                promoPrice: item.promoPrice,
            }));

        console.log(`✅ Returning ${recentItems.length} unique recent menu items`);

        // ========================================
        // STEP 6: Return Response
        // ========================================

        return NextResponse.json({
            success: true,
            data: {
                items: serializeBigInt(recentItems),
                currency: merchant.currency,
            },
            message: 'Recent orders retrieved successfully',
            statusCode: 200,
        });

    } catch (error) {
        console.error('Get recent orders error:', error);

        return NextResponse.json(
            {
                success: false,
                error: 'INTERNAL_ERROR',
                message: 'Failed to load recent orders',
                statusCode: 500,
            },
            { status: 500 }
        );
    }
}
