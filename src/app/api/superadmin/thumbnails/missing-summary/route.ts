/**
 * Deprecated: Global thumbnail rebuild summary has been removed.
 */

import { NextResponse } from 'next/server';

export const GET = async () =>
  NextResponse.json(
    {
      success: false,
      error: 'GONE',
      message: 'Global thumbnail rebuild summary has been removed',
      statusCode: 410,
    },
    { status: 410 }
  );
