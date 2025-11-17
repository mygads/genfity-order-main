/**
 * Merchant Payment Verification API - Phase 1
 * GET /api/merchant/payment/verify - Verify orderNumber and get order with payment data
 */

import { NextRequest, NextResponse } from 'next/server';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import { OrderManagementService } from '@/lib/services/OrderManagementService';
import { serializeBigInt } from '@/lib/utils/serializer';

/**
 * GET /api/merchant/payment/verify
 * Verify orderNumber and get order with payment data
 * 
 * Query Params:
 * - orderNumber: string (required) - The order number to verify (from QR code or manual input)
 * 
 * Usage: Kasir scans QR code or inputs orderNumber to verify order before accepting payment
 */
async function handleGet(req: NextRequest, context: AuthContext) {
  try {
    const merchantId = context.merchantId;
    
    if (!merchantId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Merchant ID not found in context',
        },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    const orderNumber = searchParams.get('orderNumber');

    if (!orderNumber) {
      return NextResponse.json(
        {
          success: false,
          error: 'Order number is required',
        },
        { status: 400 }
      );
    }

    // Verify order number using OrderManagementService
    const order = await OrderManagementService.verifyOrderNumber(orderNumber, merchantId);

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          error: 'Order not found',
          message: `No order found with order number: ${orderNumber}`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: serializeBigInt(order),
      message: 'Order verified successfully',
    });
  } catch (error) {
    console.error('[GET /api/merchant/payment/verify] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to verify order',
      },
      { status: 500 }
    );
  }
}

export const GET = withMerchant(handleGet);
