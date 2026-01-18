/**
 * POST /api/metrics/backoff
 * Lightweight endpoint to record backoff metrics events.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false }, { status: 400 });
    }

    // eslint-disable-next-line no-console
    console.log('[backoff-metrics]', JSON.stringify(body));

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
