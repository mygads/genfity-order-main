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

/**
 * GET /api/public/orders/[orderNumber]
 * Retrieve order details by order number with Payment relation
 * @public No authentication required
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<Record<string, string>> }
) {
  const params = await context.params;
  
  try {
    const { orderNumber } = params;
    
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

    console.log('📦 [API] Fetching order:', orderNumber);

    /**
     * ✅ SCHEMA VERIFIED: Complete Order relations
     * 
     * Order {
     *   customerId: BigInt? @map("customer_id")          // ✅ Nullable customer
     *   customer: User? @relation("CustomerOrders")      // ✅ Get customer data
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
          },
        },
        payment: true, // ✅ Include Payment relation (1:1)
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

    console.log('✅ [API] Order fetched successfully:', {
      orderNumber: order.orderNumber,
      status: order.status,
      totalAmount: Number(order.totalAmount),
    });

    // ✅ Return with proper serialization
    return NextResponse.json({
      success: true,
      data: serializeBigInt(order),
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
