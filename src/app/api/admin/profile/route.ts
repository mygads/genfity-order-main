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
import type { RouteContext } from '@/lib/utils/routeContext';
import userNotificationService from '@/lib/services/UserNotificationService';
import emailService from '@/lib/services/EmailService';

async function updateProfileHandler(
  request: NextRequest,
  authContext: AuthContext,
  _routeContext: RouteContext
) {
  try {
    const body = await request.json();
    const { name, email, phone, currentPassword, newPassword } = body;

    const userPref = await prisma.userPreference.findUnique({
      where: { userId: authContext.userId },
      select: { language: true },
    });
    const locale = userPref?.language === 'id' ? 'id' : 'en';

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

    const isPasswordChange = Boolean(newPassword);

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

      // In-app notification + email (password change)
      userNotificationService
        .createForUser({
          userId: authContext.userId,
          category: 'SYSTEM',
          title: locale === 'id' ? 'Kata sandi diubah' : 'Password changed',
          message:
            locale === 'id'
              ? 'Kata sandi akun Anda berhasil diubah.'
              : 'Your account password was changed successfully.',
          actionUrl: '/admin/dashboard/profile',
        })
        .catch((err) => console.error('Failed to create password change notification:', err));
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

      // In-app notification only (profile details change)
      userNotificationService
        .createForUser({
          userId: authContext.userId,
          category: 'SYSTEM',
          title: locale === 'id' ? 'Profil diperbarui' : 'Profile updated',
          message: locale === 'id' ? 'Detail profil Anda berhasil diperbarui.' : 'Your profile details were updated.',
          actionUrl: '/admin/dashboard/profile',
        })
        .catch((err) => console.error('Failed to create profile update notification:', err));
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

    // Email only for password changes
    if (isPasswordChange) {
      emailService
        .sendPasswordChanged({
          to: updatedUser.email,
          name: updatedUser.name || 'User',
          email: updatedUser.email,
          changedByLabel: 'you',
          locale,
        })
        .catch((err) => console.error('Failed to send password changed email:', err));
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
