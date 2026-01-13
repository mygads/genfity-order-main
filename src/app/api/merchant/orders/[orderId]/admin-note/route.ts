/**
 * Merchant Admin Note API
 * PUT /api/merchant/orders/[orderId]/admin-note
 *
 * Updates admin-only note for an order.
 * - Customer note (order.notes) remains unchanged
 * - Persists adminNote and kitchenNotes (combined string) for Kitchen Display + Kanban
 */

import { NextRequest, NextResponse } from 'next/server';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/types/auth';
import { OrderManagementService } from '@/lib/services/OrderManagementService';
import { serializeBigInt } from '@/lib/utils/serializer';
import { requireBigIntRouteParam, type RouteContext } from '@/lib/utils/routeContext';

interface Body {
  adminNote?: string | null;
}

async function handlePut(req: NextRequest, authContext: AuthContext, routeContext: RouteContext) {
  try {
    const orderIdResult = await requireBigIntRouteParam(routeContext, 'orderId');
    if (!orderIdResult.ok) {
      return NextResponse.json(orderIdResult.body, { status: orderIdResult.status });
    }

    const { merchantId } = authContext;
    if (!merchantId) {
      return NextResponse.json({ success: false, error: 'Merchant ID is required' }, { status: 400 });
    }

    const body = (await req.json()) as Body;

    const adminNote = typeof body.adminNote === 'string' ? body.adminNote : null;

    // Basic safety limit (prevents accidental huge payloads)
    if (adminNote && adminNote.length > 2000) {
      return NextResponse.json(
        { success: false, error: 'VALIDATION_ERROR', message: 'Admin note is too long' },
        { status: 400 }
      );
    }

    const updated = await OrderManagementService.updateAdminNote(orderIdResult.value, merchantId, adminNote);

    return NextResponse.json({
      success: true,
      data: serializeBigInt(updated),
    });
  } catch (error) {
    console.error('[PUT /api/merchant/orders/[orderId]/admin-note] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update admin note' },
      { status: 500 }
    );
  }
}

export const PUT = withMerchant(handlePut);
