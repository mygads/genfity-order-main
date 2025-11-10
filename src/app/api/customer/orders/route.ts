import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { db } from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

/**
 * Get Customer Orders
 * GET /api/customer/orders
 * 
 * Returns order history for the authenticated customer
 * Requires Authorization: Bearer <token> header
 */
export async function GET(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization');
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

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify JWT token
    let payload: JWTPayload;
    try {
      payload = jwt.verify(token, JWT_SECRET) as JWTPayload;
    } catch {
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

    // Check if role is CUSTOMER
    if (payload.role !== 'CUSTOMER') {
      return NextResponse.json(
        {
          success: false,
          error: 'FORBIDDEN',
          message: 'Akses ditolak',
          statusCode: 403,
        },
        { status: 403 }
      );
    }

    // Fetch orders for this customer
    const ordersResult = await db.query(
      `SELECT 
        o.id,
        o.order_number,
        o.mode,
        o.table_number,
        o.status,
        o.subtotal_amount,
        o.service_fee_amount,
        o.total_amount,
        o.created_at,
        m.name as merchant_name,
        m.code as merchant_code
       FROM orders o
       INNER JOIN merchants m ON o.merchant_id = m.id
       WHERE o.customer_id = $1
       ORDER BY o.created_at DESC
       LIMIT 50`,
      [payload.userId]
    );

    const orders = ordersResult.rows.map((row: {
      id: bigint;
      order_number: string;
      merchant_name: string;
      merchant_code: string;
      mode: string;
      table_number: string | null;
      status: string;
      subtotal_amount: string;
      service_fee_amount: string;
      total_amount: string;
      created_at: Date;
    }) => ({
      id: row.id.toString(),
      orderNumber: row.order_number,
      merchantName: row.merchant_name,
      merchantCode: row.merchant_code,
      mode: row.mode,
      tableNumber: row.table_number,
      status: row.status,
      subtotalAmount: parseFloat(row.subtotal_amount),
      serviceFeeAmount: parseFloat(row.service_fee_amount),
      totalAmount: parseFloat(row.total_amount),
      createdAt: row.created_at.toISOString(),
    }));

    return NextResponse.json(
      {
        success: true,
        data: { orders },
        message: 'Berhasil memuat riwayat pesanan',
        statusCode: 200,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get customer orders error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Terjadi kesalahan pada server',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}
