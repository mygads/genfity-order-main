/**
 * Menu Thumbnail Rebuild Cron API
 * POST /api/cron/thumbnails-rebuild
 */

import { NextRequest, NextResponse } from 'next/server';

const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const providedSecret = authHeader?.replace('Bearer ', '');

  if (CRON_SECRET && providedSecret !== CRON_SECRET) {
    return NextResponse.json(
      { success: false, error: 'UNAUTHORIZED', message: 'Invalid cron secret' },
      { status: 401 }
    );
  }

  return NextResponse.json(
    {
      success: false,
      error: 'NOT_IMPLEMENTED',
      message: 'Thumbnail rebuild is not implemented yet.',
    },
    { status: 501 }
  );
}

export async function GET(req: NextRequest) {
  return POST(req);
}
