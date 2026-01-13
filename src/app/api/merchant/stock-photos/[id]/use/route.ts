/**
 * Track Stock Photo Usage
 * 
 * POST /api/merchant/stock-photos/[id]/use - Increment usage count when merchant uses a stock photo
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import { requireBigIntRouteParam, type RouteContext } from '@/lib/utils/routeContext';

/**
 * POST - Track usage of stock photo
 */
async function postHandler(
  request: NextRequest,
  _authContext: AuthContext,
  context: RouteContext
) {
  const photoIdResult = await requireBigIntRouteParam(context, 'id');
  if (!photoIdResult.ok) {
    return NextResponse.json(photoIdResult.body, { status: photoIdResult.status });
  }

  const photoId = photoIdResult.value;

  // Check if photo exists and is active
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const photo = await (prisma as any).stockPhoto.findUnique({
    where: { id: photoId, isActive: true },
  });

  if (!photo) {
    return NextResponse.json({
      success: false,
      error: 'NOT_FOUND',
      message: 'Stock photo not found',
      statusCode: 404,
    }, { status: 404 });
  }

  // Increment usage count
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (prisma as any).stockPhoto.update({
    where: { id: photoId },
    data: { usageCount: { increment: 1 } },
  });

  return NextResponse.json({
    success: true,
    message: 'Usage tracked successfully',
    statusCode: 200,
  });
}

export const POST = withMerchant(postHandler);
