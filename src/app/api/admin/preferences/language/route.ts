/**
 * Admin Language Preference API
 * 
 * @description
 * Endpoints to get and update admin user language preference
 * Syncs with UserPreference table in database
 * 
 * @specification copilot-instructions.md - User Preference Sync
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import prisma from '@/lib/db/client';
import { serializeBigInt } from '@/lib/utils/serializer';

/**
 * GET - Get current user's language preference
 */
export const GET = withAuth(async (req: NextRequest, authContext) => {
  try {
    const { userId } = authContext;

    // Get user preference
    const preference = await prisma.userPreference.findUnique({
      where: { userId: BigInt(userId) },
      select: { language: true },
    });

    return NextResponse.json({
      success: true,
      data: {
        language: preference?.language || 'en',
      },
    });
  } catch (error) {
    console.error('Failed to get language preference:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to get language preference' },
      { status: 500 }
    );
  }
});

/**
 * PUT - Update user's language preference
 */
export const PUT = withAuth(async (req: NextRequest, authContext) => {
  try {
    const { userId } = authContext;
    const body = await req.json();
    const { language } = body;

    // Validate language
    if (!language || !['en', 'id'].includes(language)) {
      return NextResponse.json(
        { success: false, message: 'Invalid language. Must be "en" or "id".' },
        { status: 400 }
      );
    }

    // Upsert user preference
    const preference = await prisma.userPreference.upsert({
      where: { userId: BigInt(userId) },
      update: { language },
      create: {
        userId: BigInt(userId),
        language,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Language preference updated',
      data: serializeBigInt(preference),
    });
  } catch (error) {
    console.error('Failed to update language preference:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update language preference' },
      { status: 500 }
    );
  }
});
