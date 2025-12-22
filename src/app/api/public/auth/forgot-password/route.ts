import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import crypto from 'crypto';

/**
 * Forgot Password API Endpoint
 * POST /api/public/auth/forgot-password
 * 
 * Generates a 6-digit verification code and stores it in user's resetToken field.
 * In production, this would send an email with the code.
 * 
 * @security
 * - Rate limiting should be implemented
 * - Code expires in 10 minutes
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email } = body;

        // Validation
        if (!email || typeof email !== 'string') {
            return NextResponse.json(
                {
                    success: false,
                    error: 'VALIDATION_ERROR',
                    message: 'Email is required',
                    statusCode: 400,
                },
                { status: 400 }
            );
        }

        const emailTrimmed = email.trim().toLowerCase();
        if (!emailTrimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'VALIDATION_ERROR',
                    message: 'Invalid email format',
                    statusCode: 400,
                },
                { status: 400 }
            );
        }

        // Find user by email
        const user = await prisma.user.findFirst({
            where: {
                email: emailTrimmed,
                role: 'CUSTOMER',
            },
            select: {
                id: true,
                email: true,
                name: true,
            },
        });

        // Always return success to prevent email enumeration
        if (!user) {
            console.log('🔐 [FORGOT-PASSWORD] Email not found:', emailTrimmed);
            return NextResponse.json(
                {
                    success: true,
                    data: null,
                    message: 'If the email exists, you will receive a verification code shortly',
                    statusCode: 200,
                },
                { status: 200 }
            );
        }

        // Generate 6-digit verification code
        const verificationCode = crypto.randomInt(100000, 999999).toString();

        // Store code with expiry (10 minutes from now)
        // Format: CODE:EXPIRY_TIMESTAMP
        const expiryTimestamp = Date.now() + 10 * 60 * 1000; // 10 minutes
        const resetToken = `${verificationCode}:${expiryTimestamp}`;

        // Update user with reset token
        await prisma.user.update({
            where: { id: user.id },
            data: { resetToken },
        });

        console.log('🔐 [FORGOT-PASSWORD] Verification code generated for:', emailTrimmed);
        console.log('🔐 [FORGOT-PASSWORD] Code (DEV ONLY):', verificationCode);

        // TODO: Send email with verification code
        // In production, integrate with email service (SendGrid, Mailgun, etc.)
        // await sendEmail({
        //   to: user.email,
        //   subject: 'Password Reset Verification Code',
        //   body: `Your verification code is: ${verificationCode}. This code expires in 10 minutes.`
        // });

        return NextResponse.json(
            {
                success: true,
                data: {
                    // In development, return the code for testing
                    // Remove this in production!
                    ...(process.env.NODE_ENV === 'development' && { code: verificationCode }),
                },
                message: 'Verification code has been sent to your email',
                statusCode: 200,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error('❌ [FORGOT-PASSWORD] Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'INTERNAL_ERROR',
                message: 'An error occurred. Please try again.',
                statusCode: 500,
            },
            { status: 500 }
        );
    }
}
