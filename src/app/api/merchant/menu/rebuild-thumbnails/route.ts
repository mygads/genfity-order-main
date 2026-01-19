/**
 * Menu Thumbnail Rebuild API
 * POST /api/merchant/menu/rebuild-thumbnails
 */

import { NextRequest, NextResponse } from 'next/server';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';

async function handlePost(_req: NextRequest, _context: AuthContext) {
  return NextResponse.json(
    {
      success: false,
      error: 'NOT_IMPLEMENTED',
      message: 'Thumbnail rebuild is not implemented yet.',
      statusCode: 501,
    },
    { status: 501 }
  );
}

export const POST = withMerchant(handlePost);
