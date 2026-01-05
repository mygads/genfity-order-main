/**
 * PUT /api/influencer/profile
 * Update influencer profile (name, phone, profile picture)
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withInfluencer, InfluencerAuthContext } from '@/lib/middleware/auth';
import { serializeBigInt } from '@/lib/utils/serializer';
import { ValidationError, ERROR_CODES } from '@/lib/constants/errors';
import { handleError, successResponse } from '@/lib/middleware/errorHandler';

async function putHandler(
  request: NextRequest,
  context: InfluencerAuthContext
): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { name, phone, profilePictureUrl } = body;

    // Validate name if provided
    if (name !== undefined && name !== null) {
      if (typeof name !== 'string' || name.trim().length < 2) {
        throw new ValidationError(
          'Name must be at least 2 characters',
          ERROR_CODES.VALIDATION_FAILED
        );
      }
    }

    // Validate phone if provided
    if (phone !== undefined && phone !== null && phone !== '') {
      if (typeof phone !== 'string' || phone.length < 8) {
        throw new ValidationError(
          'Please enter a valid phone number',
          ERROR_CODES.VALIDATION_FAILED
        );
      }
    }

    // Build update data
    const updateData: {
      name?: string;
      phone?: string | null;
      profilePictureUrl?: string | null;
    } = {};

    if (name !== undefined && name !== null) {
      updateData.name = name.trim();
    }

    if (phone !== undefined) {
      updateData.phone = phone === '' ? null : phone.trim();
    }

    if (profilePictureUrl !== undefined) {
      updateData.profilePictureUrl = profilePictureUrl === '' ? null : profilePictureUrl;
    }

    // Update influencer
    const updatedInfluencer = await prisma.influencer.update({
      where: { id: context.influencerId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        referralCode: true,
        country: true,
        defaultCurrency: true,
        profilePictureUrl: true,
        isActive: true,
        isApproved: true,
        createdAt: true,
      },
    });

    return successResponse(
      serializeBigInt(updatedInfluencer),
      'Profile updated successfully'
    );
  } catch (error) {
    return handleError(error);
  }
}

export const PUT = withInfluencer(putHandler);
