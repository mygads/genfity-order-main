/**
 * Customer Order History API
 * GET /api/customer/orders - Get all orders for authenticated customer
 * 
 * @specification STEP_04_API_ENDPOINTS.txt - Order Endpoints
 * 
 * @description
 * Returns order history with:
 * - Order basic info (number, status, total)
 * - Merchant details
 * - Items count
 * - Latest status from order_status_history
 * 
 * @security
 * - JWT Bearer token required
 * - Customer can only see their own orders
 * 
 * @response
 * {
 *   success: true,
 *   data: OrderHistoryItem[],
 *   message: "Orders retrieved successfully",
 *   statusCode: 200
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { verifyCustomerToken } from '@/lib/utils/auth';
import { serializeBigInt } from '@/lib/utils/serializer';

/**
 * GET /api/customer/orders
 * Fetch all orders for authenticated customer
 */
export async function GET(req: NextRequest) {
  try {
    // ========================================
    // STEP 1: Authentication (STEP_02)
    // ========================================
    
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        {
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Token tidak ditemukan',
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
          message: 'Token tidak valid',
          statusCode: 401,
        },
        { status: 401 }
      );
    }

    console.log('👤 Fetching orders for customer:', decoded.customerId);

    // ========================================
    // STEP 2: Fetch Orders (STEP_01 Schema)
    // ========================================
    
    /**
     * ✅ SCHEMA VERIFIED: Order table structure
     * 
     * Order {
     *   customerId: BigInt? @map("customer_id")          // ✅ Nullable
     *   customer: User? @relation("CustomerOrders")      // ✅ Correct relation name
     *   merchant: Merchant
     *   orderItems: OrderItem[]
     *   payment: Payment?                                 // ✅ 1:1 relation
     *   placedAt: DateTime @default(now())               // ✅ Indexed for orderBy
     * }
     */
    const orders = await prisma.order.findMany({
      where: {
        customerId: BigInt(decoded.customerId), // ✅ Match schema: nullable BigInt
      },
      include: {
        merchant: {
          select: {
            name: true,
            code: true,
            currency: true,
            enableTax: true,
            taxPercentage: true,
          },
        },
        orderItems: {
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        placedAt: 'desc', // ✅ Use indexed field for performance
      },
    });

    console.log(`📦 Found ${orders.length} orders for customer ${decoded.customerId}`);

    // ========================================
    // STEP 3: Format Response
    // ========================================
    
    /**
     * Transform Prisma result to match frontend interface
     * 
     * @interface OrderHistoryItem (from page.tsx)
     * - id: bigint
     * - orderNumber: string
     * - merchantName: string
     * - merchantCode: string
     * - mode: 'dinein' | 'takeaway'
     * - status: string
     * - totalAmount: number
     * - placedAt: string
     * - itemsCount: number
     */
    const formattedOrders = orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      merchantName: order.merchant.name,
      merchantCode: order.merchant.code,
      merchantCurrency: order.merchant.currency,
      mode: order.orderType === 'DINE_IN' ? 'dinein' : 'takeaway',
      status: order.status,
      totalAmount: parseFloat(order.totalAmount.toString()),
      placedAt: order.placedAt.toISOString(),
      itemsCount: order.orderItems.length,
    }));

    // ✅ Serialize BigInt to string for JSON
    const serializedOrders = serializeBigInt(formattedOrders);

    return NextResponse.json({
      success: true,
      data: serializedOrders,
      message: 'Orders retrieved successfully',
      statusCode: 200,
    });

  } catch (error) {
    console.error('Get customer orders error:', error);

    // ========================================
    // ERROR HANDLING (STEP_05)
    // ========================================
    
    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Gagal memuat riwayat pesanan',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}
