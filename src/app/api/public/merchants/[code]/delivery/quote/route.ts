/**
 * Public Delivery Fee Quote API
 * POST /api/public/merchants/[code]/delivery/quote
 * 
 * Returns estimated delivery fee for a given customer location
 * Used by customer checkout to preview fee before completing order
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import DeliveryFeeService from '@/lib/services/DeliveryFeeService';

interface QuoteRequest {
  latitude: number;
  longitude: number;
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  try {
    const params = await context.params;
    const code = params.code;
    const merchantCode = code;
    const body: QuoteRequest = await req.json();

    const { latitude, longitude } = body;

    // Validate required fields
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_COORDS',
          message: 'Valid latitude and longitude are required',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    // Find merchant by code
    const merchant = await prisma.merchant.findUnique({
      where: { code: merchantCode },
      select: { id: true, isActive: true },
    });

    if (!merchant || !merchant.isActive) {
      return NextResponse.json(
        {
          success: false,
          error: 'MERCHANT_NOT_FOUND',
          message: 'Merchant not found or inactive',
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    // Validate and calculate delivery fee
    const result = await DeliveryFeeService.validateAndCalculateFee(
      merchant.id,
      latitude,
      longitude
    );

    if (!result.success) {
      const errorMessage = DeliveryFeeService.getErrorMessage(result.error?.code || '');
      return NextResponse.json(
        {
          success: false,
          error: result.error?.code || 'VALIDATION_ERROR',
          message: errorMessage,
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          distanceKm: result.data!.distanceKm,
          feeAmount: result.data!.feeAmount,
        },
        message: 'Delivery fee calculated successfully',
        statusCode: 200,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error calculating delivery fee quote:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to calculate delivery fee',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}
