/**
 * Upload Influencer Profile Picture API
 * POST /api/influencer/profile/upload-picture
 * Access: Authenticated influencers
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { successResponse } from '@/lib/middleware/errorHandler';
import { withInfluencer, InfluencerAuthContext } from '@/lib/middleware/auth';
import { BlobService } from '@/lib/services/BlobService';

async function uploadInfluencerPictureHandler(
  request: NextRequest,
  authContext: InfluencerAuthContext
): Promise<NextResponse> {
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
    const influencer = await prisma.influencer.findUnique({
      where: { id: authContext.influencerId },
      select: { profilePictureUrl: true },
    });

    if (influencer?.profilePictureUrl) {
      try {
        await BlobService.deleteFile(influencer.profilePictureUrl);
      } catch {
        // Ignore deletion errors
        console.log('Could not delete old influencer profile picture');
      }
    }

    // Upload new profile picture
    const uploadResult = await BlobService.uploadProfilePicture(
      `influencer-${authContext.influencerId.toString()}`,
      file
    );

    // Update influencer profile picture URL in database
    await prisma.influencer.update({
      where: { id: authContext.influencerId },
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
    console.error('Upload influencer profile picture error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to upload profile picture', error: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

export const POST = withInfluencer(uploadInfluencerPictureHandler);
