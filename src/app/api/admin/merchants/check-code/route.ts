/**
 * Check Merchant Code Availability API
 * GET /api/admin/merchants/check-code?code=XXX&excludeId=YYY
 * 
 * @description Checks if a merchant code is already in use
 */

import { NextRequest, NextResponse } from 'next/server';
import { withSuperAdmin } from '@/lib/middleware/auth';
import prisma from '@/lib/db/client';
import type { AuthContext } from '@/lib/types/auth';
import { parseOptionalBigIntQueryParam } from '@/lib/utils/routeContext';

async function handleGet(
  request: NextRequest,
  _authContext: AuthContext
) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const excludeIdResult = parseOptionalBigIntQueryParam(searchParams, 'excludeId', 'Invalid excludeId');
    if (!excludeIdResult.ok) {
      return NextResponse.json(excludeIdResult.body, { status: excludeIdResult.status });
    }

    if (!code) {
      return NextResponse.json(
        { success: false, error: 'VALIDATION_ERROR', message: 'Code parameter is required' },
        { status: 400 }
      );
    }

    // Check if code exists (excluding the current merchant if excludeId provided)
    const existingMerchant = await prisma.merchant.findFirst({
      where: {
        code: code.toUpperCase(),
        ...(excludeIdResult.value !== null ? { NOT: { id: excludeIdResult.value } } : {}),
      },
      select: { id: true, name: true },
    });

    return NextResponse.json({
      success: true,
      exists: !!existingMerchant,
      merchantName: existingMerchant?.name || null,
    });
  } catch (error) {
    console.error('Error checking merchant code:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'CHECK_FAILED',
        message: error instanceof Error ? error.message : 'Failed to check code availability',
      },
      { status: 500 }
    );
  }
}

export const GET = withSuperAdmin(handleGet);
