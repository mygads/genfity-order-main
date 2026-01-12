/**
 * Forgot Password API
 * POST /api/auth/forgot-password
 * 
 * Generates reset token and sends email with reset link
 * 
 * Request body:
 * {
 *   "email": "user@example.com"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Password reset email sent"
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import authService from '@/lib/services/AuthService';
import { sendPasswordResetEmail } from '@/lib/utils/emailSender';
import { handleError } from '@/lib/middleware/errorHandler';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, client } = body as { email?: string; client?: 'admin' | 'driver' };

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          message: 'Email is required',
        },
        { status: 400 }
      );
    }

    // Request password reset (generates token)
    const { resetToken, expiresAt } = await authService.requestPasswordReset(email);

    // Generate reset URL
    // Only allow known reset pages to avoid open-redirect style abuse.
    const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const resetPath = client === 'driver' ? '/driver/reset-password' : '/admin/reset-password';
    const resetUrl = `${appBaseUrl}${resetPath}?token=${resetToken}`;

    // Send email with reset link
    await sendPasswordResetEmail({
      to: email,
      resetUrl,
      expiresAt,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Password reset email sent',
        data: {
          email,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return handleError(error);
  }
}
