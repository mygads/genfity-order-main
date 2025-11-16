/**
 * Update Profile API
 * PUT /api/admin/profile
 * Access: All authenticated admin users
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { successResponse } from '@/lib/middleware/errorHandler';
import { withAuth } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import bcrypt from 'bcryptjs';

async function updateProfileHandler(
  request: NextRequest,
  authContext: AuthContext,
  _routeContext: { params: Promise<Record<string, string>> }
) {
  try {
    const body = await request.json();
    const { name, email, phone, currentPassword, newPassword } = body;

    // Validate required fields
    if (!name || !email) {
      return NextResponse.json(
        { success: false, message: 'Name and email are required', error: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Check if email is already taken by another user
    const existingUser = await prisma.user.findFirst({
      where: {
        email,
        id: { not: authContext.userId },
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'Email is already taken by another user', error: 'EMAIL_TAKEN' },
        { status: 400 }
      );
    }

    // If changing password, validate current password
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { success: false, message: 'Current password is required to change password', error: 'VALIDATION_ERROR' },
          { status: 400 }
        );
      }

      // Verify current password
      const user = await prisma.user.findUnique({
        where: { id: authContext.userId },
        select: { passwordHash: true },
      });

      if (!user) {
        return NextResponse.json(
          { success: false, message: 'User not found', error: 'USER_NOT_FOUND' },
          { status: 404 }
        );
      }

      const isValidPassword = await bcrypt.compare(
        currentPassword,
        user.passwordHash
      );

      if (!isValidPassword) {
        return NextResponse.json(
          { success: false, message: 'Current password is incorrect', error: 'INVALID_PASSWORD' },
          { status: 400 }
        );
      }

      // Validate new password
      if (newPassword.length < 8) {
        return NextResponse.json(
          { success: false, message: 'New password must be at least 8 characters', error: 'VALIDATION_ERROR' },
          { status: 400 }
        );
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update with new password using Prisma
      await prisma.user.update({
        where: { id: authContext.userId },
        data: {
          name,
          email,
          phone: phone || null,
          passwordHash: hashedPassword,
        },
      });
    } else {
      // Update without password change using Prisma
      await prisma.user.update({
        where: { id: authContext.userId },
        data: {
          name,
          email,
          phone: phone || null,
        },
      });
    }

    // Fetch updated user data
    const updatedUser = await prisma.user.findUnique({
      where: { id: authContext.userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        profilePictureUrl: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!updatedUser) {
      return NextResponse.json(
        { success: false, message: 'User not found', error: 'USER_NOT_FOUND' },
        { status: 404 }
      );
    }

    return successResponse(
      {
        id: updatedUser.id.toString(),
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role,
        profilePictureUrl: updatedUser.profilePictureUrl || null,
        isActive: updatedUser.isActive,
        createdAt: updatedUser.createdAt,
      },
      'Profile updated successfully',
      200
    );
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update profile', error: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

export const PUT = withAuth(updateProfileHandler);
