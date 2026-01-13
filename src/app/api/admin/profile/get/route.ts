/**
 * Get Profile API
 * GET /api/admin/profile
 * Access: All authenticated admin users
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { successResponse } from '@/lib/middleware/errorHandler';
import { withAuth } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import type { RouteContext } from '@/lib/utils/routeContext';

async function getProfileHandler(
  _request: NextRequest,
  authContext: AuthContext,
  _routeContext: RouteContext
) {
  try {
    // Fetch user profile data using Prisma
    const user = await prisma.user.findUnique({
      where: { id: authContext.userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        profilePictureUrl: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found', error: 'USER_NOT_FOUND' },
        { status: 404 }
      );
    }

    return successResponse(
      {
        id: user.id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        profilePictureUrl: user.profilePictureUrl || null,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      'Profile retrieved successfully',
      200
    );
  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to retrieve profile', error: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getProfileHandler);
