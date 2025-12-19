/**
 * Merchant Orders API - Phase 1
 * GET /api/merchant/orders - List orders with filters & pagination
 * 
 * Supports:
 * - Filter by status, paymentStatus, orderType
 * - Date range filtering
 * - Pagination
 * - Real-time polling via 'since' parameter
 */

import { NextRequest, NextResponse } from 'next/server';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import { OrderManagementService } from '@/lib/services/OrderManagementService';
import { serializeBigInt } from '@/lib/utils/serializer';
import { OrderStatus, PaymentStatus, OrderType } from '@prisma/client';

/**
 * GET /api/merchant/orders
 * Query Params:
 * - status?: OrderStatus
 * - paymentStatus?: PaymentStatus
 * - orderType?: 'DINE_IN' | 'TAKEAWAY'
 * - startDate?: string (ISO date)
 * - endDate?: string (ISO date)
 * - page?: number (default: 1)
 * - limit?: number (default: 20)
 * - since?: number (timestamp for real-time polling)
 * - includeItems?: boolean (include full orderItems for kitchen display)
 */
async function handleGet(req: NextRequest, context: AuthContext) {
  try {
    const { merchantId } = context;

    if (!merchantId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Merchant ID is required',
        },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);

    // Parse query parameters
    // Support comma-separated statuses for efficient kitchen display (e.g., status=ACCEPTED,IN_PROGRESS)
    const statusParam = searchParams.get('status');
    const status = statusParam?.includes(',') 
      ? statusParam.split(',') as OrderStatus[]
      : (statusParam as OrderStatus | undefined);
    const paymentStatus = searchParams.get('paymentStatus') as PaymentStatus | undefined;
    const orderType = searchParams.get('orderType') as OrderType | undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const since = searchParams.get('since') ? parseInt(searchParams.get('since')!) : undefined;
    const includeItems = searchParams.get('includeItems') === 'true';

    // Build filters
    const filters = {
      status,
      paymentStatus,
      orderType,
      dateRange: startDate && endDate ? { start: startDate, end: endDate } : undefined,
      page,
      limit,
      since,
      includeItems,
    };

    // Fetch orders using OrderManagementService
    const result = await OrderManagementService.getOrders(merchantId, filters);

    return NextResponse.json({
      success: true,
      data: serializeBigInt(result.orders),
      total: result.total,
    });
  } catch (error) {
    console.error('[GET /api/merchant/orders] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch orders',
      },
      { status: 500 }
    );
  }
}

export const GET = withMerchant(handleGet);
