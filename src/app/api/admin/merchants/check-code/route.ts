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

async function handleGet(
  request: NextRequest,
  _authContext: AuthContext
) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const excludeId = searchParams.get('excludeId');

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
        ...(excludeId ? { NOT: { id: BigInt(excludeId) } } : {}),
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
