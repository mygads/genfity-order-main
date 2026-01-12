/**
 * DEPRECATED
 *
 * Previously: Merchant Utility: Rebuild Menu Thumbnails
 * POST /api/merchant/menu/rebuild-thumbnails
 *
 * This is now restricted to Super Admin and replaced by the global rebuild job:
 * POST /api/superadmin/thumbnails/rebuild (action=start|tick)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withSuperAdmin } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';

async function handlePost(_req: NextRequest, _context: AuthContext) {
  return NextResponse.json(
    {
      success: false,
      error: 'DEPRECATED_ENDPOINT',
      message:
        'This endpoint is deprecated. Use POST /api/superadmin/thumbnails/rebuild with { action: "start" } then { action: "tick" }.',
      statusCode: 410,
    },
    { status: 410 }
  );
}

export const POST = withSuperAdmin(handlePost);

