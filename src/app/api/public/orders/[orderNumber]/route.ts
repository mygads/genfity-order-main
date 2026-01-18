/**
 * Public Order Detail API
 * GET /api/public/orders/[orderNumber]
 * 
 * ✅ FIXED: Use Prisma directly with Payment relation and proper serialization
 * 
 * @specification STEP_04_API_ENDPOINTS.txt - Order Endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { serializeBigInt } from '@/lib/utils/serializer';
import { verifyOrderTrackingToken } from '@/lib/utils/orderTrackingToken';
import type { RouteContext } from '@/lib/utils/routeContext';

/**
 * GET /api/public/orders/[orderNumber]
 * Retrieve order details by order number with Payment relation
 * @public No authentication required
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  const params = await context.params;

  try {
    const { orderNumber } = params;

    const token = request.nextUrl.searchParams.get('token') || '';

    // Validate order number
    if (!orderNumber) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Order number is required',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    // console.log('📦 [API] Fetching order:', orderNumber);

    /**
     * ✅ SCHEMA VERIFIED: Complete Order relations
     * 
     * Order {
     *   customerId: BigInt? @map("customer_id")          // ✅ Nullable customer
     *   customer: Customer?                               // ✅ Separate Customer table
     *   merchant: Merchant                                // ✅ Get merchant data
     *   orderItems: OrderItem[] {
     *     addons: OrderItemAddon[]                        // ✅ Nested addons
     *   }
     *   payment: Payment? {                               // ✅ 1:1 relation
     *     orderId: BigInt @unique                         // ✅ Unique constraint
     *     paidByUserId: BigInt?                           // ✅ Staff who recorded
     *     paidBy: User? @relation("PaymentRecordedBy")   // ✅ Correct relation
     *   }
     * }
     */
    // Fetch order with all relations
    const order = await prisma.order.findFirst({
      where: { orderNumber },
      include: {
        orderItems: {
          include: {
            addons: true,
          },
        },
        reservation: {
          select: {
            status: true,
            partySize: true,
            reservationDate: true,
            reservationTime: true,
            tableNumber: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        merchant: {
          select: {
            id: true,
            code: true,
            name: true,
            phone: true,
            address: true,
            currency: true,
            logoUrl: true,
            receiptSettings: true,
          },
        },
        payment: {
          include: {
            paidBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        }, // ✅ Include Payment relation with staff who recorded
      },
    });

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          error: 'ORDER_NOT_FOUND',
          message: 'Order not found',
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    // Tokenized access is REQUIRED for public tracking
    // Avoid leaking whether the order exists for invalid/missing tokens.
    const merchantCode = order.merchant?.code || '';
    const ok = token
      ? verifyOrderTrackingToken({
          token,
          merchantCode,
          orderNumber: order.orderNumber,
        })
      : false;

    if (!ok) {
      return NextResponse.json(
        {
          success: false,
          error: 'ORDER_NOT_FOUND',
          message: 'Order not found',
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    // console.log('✅ [API] Order fetched successfully:', {
    //   orderNumber: order.orderNumber,
    //   status: order.status,
    //   totalAmount: Number(order.totalAmount),
    // });

    // ✅ Return with proper serialization
    const serialized = serializeBigInt(order) as Record<string, unknown>;
    // Never expose admin-only note fields to public tracking
    delete (serialized as any).adminNote;
    delete (serialized as any).kitchenNotes;
    delete (serialized as any).editedByUserId;

    // If this order was created from a reservation, include reservation details
    // (safe because tokenized access is already validated above).
    if (order.reservation) {
      (serialized as any).reservation = order.reservation;
    }

    return NextResponse.json({
      success: true,
      data: serialized,
      message: 'Order retrieved successfully',
      statusCode: 200,
    });

  } catch (error) {
    console.error('❌ [API] Get order error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to retrieve order',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}
