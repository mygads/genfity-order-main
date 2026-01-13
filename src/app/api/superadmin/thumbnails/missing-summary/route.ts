/**
 * Super Admin Utility: Global Thumbnail Missing Summary
 *
 * GET /api/superadmin/thumbnails/missing-summary
 */

import { NextRequest, NextResponse } from 'next/server';
import { withSuperAdmin } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import {
  getGlobalThumbnailMissingSummary,
  getGlobalThumbnailRebuildJob,
} from '@/lib/services/GlobalThumbnailRebuildService';

async function getHandler(_req: NextRequest, _ctx: AuthContext) {
  const [summary, job] = await Promise.all([
    getGlobalThumbnailMissingSummary(),
    getGlobalThumbnailRebuildJob(),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      summary,
      job,
    },
    statusCode: 200,
  });
}

export const GET = withSuperAdmin(getHandler);
