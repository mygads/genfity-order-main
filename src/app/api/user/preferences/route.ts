import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/middleware/auth';
import { handleError } from '@/lib/middleware/errorHandler';
import prisma from '@/lib/db/client';

/**
 * GET /api/user/preferences
 * Get current user's preferences
 * 
 * @description
 * Retrieves user preferences from database.
 * Returns default values if preferences don't exist yet.
 * 
 * @authentication Required (Bearer token)
 * @returns {success: boolean, data: UserPreferences}
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const userContext = await authenticate(request);

    // Get user preferences
    const preferences = await prisma.userPreference.findUnique({
      where: { userId: userContext.userId },
      select: {
        theme: true,
        language: true,
        timezone: true,
        dateFormat: true,
        timeFormat: true,
        currency: true,
        emailNotifications: true,
        orderNotifications: true,
        marketingEmails: true,
      },
    });

    // If no preferences exist, return defaults
    if (!preferences) {
      return NextResponse.json({
        success: true,
        data: {
          theme: 'light',
          language: 'en',
          timezone: 'Asia/Jakarta',
          dateFormat: 'DD/MM/YYYY',
          timeFormat: '24h',
          currency: 'IDR',
          emailNotifications: true,
          orderNotifications: true,
          marketingEmails: false,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: preferences,
    });
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    return handleError(error);
  }
}

/**
 * PUT /api/user/preferences
 * Update current user's preferences
 * 
 * @description
 * Creates or updates user preferences in database.
 * Uses upsert to handle both create and update cases.
 * 
 * @authentication Required (Bearer token)
 * @body UserPreferences object
 * @returns {success: boolean, data: UserPreferences}
 */
export async function PUT(request: NextRequest) {
  try {
    // Authenticate user
    const userContext = await authenticate(request);

    // Parse request body
    const body = await request.json();

    // Validate required fields
    const {
      theme,
      language,
      timezone,
      dateFormat,
      timeFormat,
      currency,
      emailNotifications,
      orderNotifications,
      marketingEmails,
    } = body;

    // Upsert preferences (create if not exists, update if exists)
    const preferences = await prisma.userPreference.upsert({
      where: { userId: userContext.userId },
      create: {
        userId: userContext.userId,
        theme,
        language,
        timezone,
        dateFormat,
        timeFormat,
        currency,
        emailNotifications,
        orderNotifications,
        marketingEmails,
      },
      update: {
        theme,
        language,
        timezone,
        dateFormat,
        timeFormat,
        currency,
        emailNotifications,
        orderNotifications,
        marketingEmails,
      },
      select: {
        theme: true,
        language: true,
        timezone: true,
        dateFormat: true,
        timeFormat: true,
        currency: true,
        emailNotifications: true,
        orderNotifications: true,
        marketingEmails: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: preferences,
      message: 'Preferences saved successfully',
    });
  } catch (error) {
    console.error('Error saving user preferences:', error);
    return handleError(error);
  }
}
