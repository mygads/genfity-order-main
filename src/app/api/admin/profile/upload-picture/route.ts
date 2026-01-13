/**
 * Upload Profile Picture API
 * POST /api/admin/profile/upload-picture
 * Access: All authenticated admin users
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { successResponse } from '@/lib/middleware/errorHandler';
import { withAuth } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import { BlobService } from '@/lib/services/BlobService';
import type { RouteContext } from '@/lib/utils/routeContext';

async function uploadProfilePictureHandler(
  request: NextRequest,
  authContext: AuthContext,
  _routeContext: RouteContext
) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'No file uploaded', error: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Validate file
    const validation = BlobService.validateImageFile(file, 5); // Max 5MB
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, message: validation.error || 'Invalid file', error: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Delete old profile picture if exists
    await BlobService.deleteOldProfilePicture(authContext.userId.toString());

    // Upload new profile picture
    const uploadResult = await BlobService.uploadProfilePicture(
      authContext.userId.toString(),
      file
    );

    // Update user profile picture URL in database using Prisma
    await prisma.user.update({
      where: { id: authContext.userId },
      data: {
        profilePictureUrl: uploadResult.url,
      },
    });

    return successResponse(
      {
        url: uploadResult.url,
        downloadUrl: uploadResult.downloadUrl,
        pathname: uploadResult.pathname,
      },
      'Profile picture uploaded successfully',
      200
    );
  } catch (error) {
    console.error('Upload profile picture error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to upload profile picture', error: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

export const POST = withAuth(uploadProfilePictureHandler);
