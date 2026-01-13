/**
 * Co-Purchase Recommendations API
 * 
 * @description
 * Returns menu items frequently purchased together based on historical order data.
 * Used for upselling suggestions like "Yang beli X juga beli Y".
 * 
 * @endpoint GET /api/public/merchants/{code}/recommendations?menuIds={id1,id2,...}
 * 
 * @query menuIds - Comma-separated list of menu IDs currently in cart
 * @returns Top 5 menu items most frequently purchased with the given items
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { Prisma } from '@prisma/client';
import { invalidRouteParam, type RouteContext } from '@/lib/utils/routeContext';

export async function GET(
    request: NextRequest,
    { params }: RouteContext<{ code: string }>
) {
    try {
        const { code } = await params;
        const { searchParams } = new URL(request.url);
        const menuIdsParam = searchParams.get('menuIds');

        if (!menuIdsParam) {
            return NextResponse.json(
                { success: false, error: 'menuIds parameter is required' },
                { status: 400 }
            );
        }

        // Parse menu IDs from comma-separated string
        const cartMenuIds: bigint[] = [];
        for (const raw of menuIdsParam.split(',')) {
            const value = raw.trim();
            if (!value) continue;
            if (!/^\d+$/.test(value)) {
                const err = invalidRouteParam('menuIds', 'menuIds must be a comma-separated list of numeric IDs');
                return NextResponse.json(err.body, { status: err.status });
            }
            cartMenuIds.push(BigInt(value));
        }

        if (cartMenuIds.length === 0) {
            return NextResponse.json({ success: true, data: [] });
        }

        // Find merchant by code
        const merchant = await prisma.merchant.findUnique({
            where: { code },
            select: { id: true }
        });

        if (!merchant) {
            return NextResponse.json(
                { success: false, error: 'Merchant not found' },
                { status: 404 }
            );
        }

        // Query: Find items frequently purchased together
        // 1. Find orders containing any of the cart items (completed/accepted orders only)
        // 2. Get other items in those orders
        // 3. Count frequency and return top items

        const courchaseResults = await prisma.$queryRaw<Array<{
            menu_id: bigint;
            menu_name: string;
            image_url: string | null;
            menu_price: number;
            frequency: bigint;
        }>>`
      SELECT 
        oi2.menu_id,
        oi2.menu_name,
        m.image_url,
        m.price as menu_price,
        COUNT(DISTINCT oi2.order_id) as frequency
      FROM order_items oi1
      JOIN order_items oi2 ON oi1.order_id = oi2.order_id
      JOIN orders o ON oi1.order_id = o.id
      JOIN menus m ON oi2.menu_id = m.id
      WHERE o.merchant_id = ${merchant.id}
        AND o.status IN ('ACCEPTED', 'COMPLETED', 'READY')
        AND oi1.menu_id = ANY(${cartMenuIds})
        AND oi2.menu_id != ALL(${cartMenuIds})
        AND m.is_active = true
        AND m.deleted_at IS NULL
        AND (m.track_stock = false OR m.stock_qty IS NULL OR m.stock_qty > 0)
      GROUP BY oi2.menu_id, oi2.menu_name, m.image_url, m.price
      ORDER BY frequency DESC
      LIMIT 5
    `;

        // Transform results to match the expected format
        const recommendations = courchaseResults.map(item => ({
            id: item.menu_id.toString(),
            name: item.menu_name,
            price: Number(item.menu_price),
            imageUrl: item.image_url,
            frequency: Number(item.frequency)
        }));

        return NextResponse.json({
            success: true,
            data: recommendations,
            meta: {
                source: 'co-purchase',
                cartItemCount: cartMenuIds.length
            }
        });

    } catch (error) {
        console.error('Error fetching recommendations:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch recommendations' },
            { status: 500 }
        );
    }
}
