/**
 * Reset Password API
 * POST /api/auth/reset-password
 * 
 * Resets user password with valid reset token
 * 
 * Request body:
 * {
 *   "token": "reset-token-from-email",
 *   "password": "newPassword123"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Password reset successful"
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import authService from '@/lib/services/AuthService';
import { handleError } from '@/lib/middleware/errorHandler';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password } = body;

    if (!token || !password) {
      return NextResponse.json(
        {
          success: false,
          message: 'Token and password are required',
        },
        { status: 400 }
      );
    }

    // Reset password
    await authService.resetPassword(token, password);

    return NextResponse.json(
      {
        success: true,
        message: 'Password reset successful',
      },
      { status: 200 }
    );
  } catch (error) {
    return handleError(error);
  }
}
