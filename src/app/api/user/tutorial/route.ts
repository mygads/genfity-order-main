import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/middleware/auth';
import { handleError } from '@/lib/middleware/errorHandler';
import prisma from '@/lib/db/client';
import { serializeBigInt } from '@/lib/utils/serializer';

/**
 * GET /api/user/tutorial
 * Get current user's tutorial progress
 * 
 * @description
 * Retrieves tutorial progress from database.
 * Returns default values if preferences don't exist yet.
 * 
 * @authentication Required (Bearer token)
 * @returns {success: boolean, data: TutorialProgress}
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const userContext = await authenticate(request);

    // Get user preferences with tutorial fields
    const preferences = await prisma.userPreference.findUnique({
      where: { userId: userContext.userId },
      select: {
        hasCompletedOnboarding: true,
        completedTutorials: true,
        lastHintDismissedAt: true,
      },
    });

    // If no preferences exist, return defaults
    if (!preferences) {
      return NextResponse.json({
        success: true,
        data: {
          hasCompletedOnboarding: false,
          completedTutorials: [],
          lastHintDismissedAt: null,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: serializeBigInt({
        hasCompletedOnboarding: preferences.hasCompletedOnboarding,
        completedTutorials: preferences.completedTutorials || [],
        lastHintDismissedAt: preferences.lastHintDismissedAt,
      }),
    });
  } catch (error) {
    console.error('Error fetching tutorial progress:', error);
    return handleError(error);
  }
}

/**
 * PUT /api/user/tutorial
 * Update current user's tutorial progress
 * 
 * @description
 * Creates or updates tutorial progress in database.
 * Uses upsert to handle both create and update cases.
 * 
 * @authentication Required (Bearer token)
 * @body TutorialProgress object
 * @returns {success: boolean, data: TutorialProgress}
 */
export async function PUT(request: NextRequest) {
  try {
    // Authenticate user
    const userContext = await authenticate(request);

    // Parse request body
    const body = await request.json();

    // Extract tutorial fields
    const {
      hasCompletedOnboarding,
      completedTutorials,
      lastHintDismissedAt,
    } = body;

    // Validate completedTutorials is an array
    if (completedTutorials && !Array.isArray(completedTutorials)) {
      return NextResponse.json(
        {
          success: false,
          error: 'completedTutorials must be an array',
        },
        { status: 400 }
      );
    }

    // Upsert preferences (create if not exists, update if exists)
    const preferences = await prisma.userPreference.upsert({
      where: { userId: userContext.userId },
      update: {
        hasCompletedOnboarding: hasCompletedOnboarding ?? undefined,
        completedTutorials: completedTutorials ?? undefined,
        lastHintDismissedAt: lastHintDismissedAt 
          ? new Date(lastHintDismissedAt) 
          : undefined,
      },
      create: {
        userId: userContext.userId,
        hasCompletedOnboarding: hasCompletedOnboarding ?? false,
        completedTutorials: completedTutorials ?? [],
        lastHintDismissedAt: lastHintDismissedAt 
          ? new Date(lastHintDismissedAt) 
          : null,
      },
      select: {
        hasCompletedOnboarding: true,
        completedTutorials: true,
        lastHintDismissedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: serializeBigInt({
        hasCompletedOnboarding: preferences.hasCompletedOnboarding,
        completedTutorials: preferences.completedTutorials || [],
        lastHintDismissedAt: preferences.lastHintDismissedAt,
      }),
    });
  } catch (error) {
    console.error('Error updating tutorial progress:', error);
    return handleError(error);
  }
}
