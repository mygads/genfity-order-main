/**
 * Influencer Forgot Password API
 * POST /api/influencer/auth/forgot-password
 * 
 * Generates reset token and sends email with reset link
 * 
 * Request body:
 * {
 *   "email": "influencer@example.com"
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import influencerAuthService from '@/lib/services/InfluencerAuthService';
import { sendPasswordResetEmail } from '@/lib/utils/emailSender';
import { handleError } from '@/lib/middleware/errorHandler';
import { enqueueNotificationJob } from '@/lib/queue/notificationJobsQueue';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          message: 'Email is required',
        },
        { status: 400 }
      );
    }

    // Check if influencer exists (for logging purposes, but don't reveal to user)
    const influencer = await influencerAuthService.getInfluencerByEmail(email);
    
    // Request password reset (generates token)
    const { resetToken, expiresAt } = await influencerAuthService.requestPasswordReset(email);

    // Only send email if influencer exists
    if (influencer) {
      // Generate reset URL
      const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/influencer/reset-password?token=${resetToken}`;

      let queuedOk = false;
      try {
        const queued = await enqueueNotificationJob({
          kind: 'email.password_reset_link',
          payload: {
            kind: 'email.password_reset_link',
            to: email,
            resetUrl,
            expiresAt: expiresAt.toISOString(),
          },
        });
        queuedOk = queued.ok;
      } catch (err) {
        console.error('[influencer-forgot-password] failed to enqueue reset email:', err);
      }

      if (!queuedOk) {
        // Fallback: direct send
        await sendPasswordResetEmail({
          to: email,
          resetUrl,
          expiresAt,
        });
      }
    }

    // Always return success to prevent email enumeration
    return NextResponse.json(
      {
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent',
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
