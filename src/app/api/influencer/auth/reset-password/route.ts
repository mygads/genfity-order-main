/**
 * Influencer Reset Password API
 * POST /api/influencer/auth/reset-password
 * 
 * Resets password using the reset token
 * 
 * Request body:
 * {
 *   "token": "resetToken",
 *   "password": "newPassword123"
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import influencerAuthService from '@/lib/services/InfluencerAuthService';
import { handleError } from '@/lib/middleware/errorHandler';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password } = body;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: 'Reset token is required',
        },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        {
          success: false,
          message: 'New password is required',
        },
        { status: 400 }
      );
    }

    // Reset password
    await influencerAuthService.resetPassword(token, password);

    return NextResponse.json(
      {
        success: true,
        message: 'Password has been reset successfully. You can now login with your new password.',
      },
      { status: 200 }
    );
  } catch (error) {
    return handleError(error);
  }
}
