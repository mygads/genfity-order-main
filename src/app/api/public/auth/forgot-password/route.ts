import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import crypto from 'crypto';
import emailService from '@/lib/services/EmailService';

/**
 * Forgot Password API Endpoint (Customer)
 * POST /api/public/auth/forgot-password
 * 
 * Features:
 * - Generates a 6-digit verification code
 * - Sends email with OTP code
 * - Rate limiting: 1 request per 3 minutes per email
 * - Code expires in 60 minutes
 * 
 * Uses Customer table (separate from admin users)
 */

// ✅ In-memory rate limit store (for serverless, consider Redis)
const rateLimitStore = new Map<string, number>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const CODE_EXPIRY_MINUTES = 60; // 1 hour

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

        // ✅ Rate Limiting Check (1 minute cooldown per email)
        const lastRequestTime = rateLimitStore.get(emailTrimmed);
        const now = Date.now();

        if (lastRequestTime && (now - lastRequestTime) < RATE_LIMIT_WINDOW_MS) {
            const remainingSeconds = Math.ceil((RATE_LIMIT_WINDOW_MS - (now - lastRequestTime)) / 1000);
            const remainingMinutes = Math.floor(remainingSeconds / 60);
            const remainingSecs = remainingSeconds % 60;

            console.log('⚠️ [FORGOT-PASSWORD] Rate limited:', emailTrimmed);
            return NextResponse.json(
                {
                    success: false,
                    error: 'RATE_LIMITED',
                    message: `Please wait ${remainingMinutes > 0 ? `${remainingMinutes}m ` : ''}${remainingSecs}s before requesting another code`,
                    data: { retryAfterSeconds: remainingSeconds },
                    statusCode: 429,
                },
                { status: 429 }
            );
        }

        // Find customer by email in Customer table
        const customer = await prisma.customer.findUnique({
            where: {
                email: emailTrimmed,
            },
            select: {
                id: true,
                email: true,
                name: true,
            },
        });

        // Return error if email not found
        if (!customer) {
            console.log('🔐 [FORGOT-PASSWORD] Email not found:', emailTrimmed);
            return NextResponse.json(
                {
                    success: false,
                    error: 'EMAIL_NOT_FOUND',
                    message: 'No account found with this email address',
                    statusCode: 404,
                },
                { status: 404 }
            );
        }

        // Generate 6-digit verification code
        const verificationCode = crypto.randomInt(100000, 999999).toString();

        // Store code with expiry (1 hour from now)
        const expiryTimestamp = Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000;
        const resetToken = `${verificationCode}:${expiryTimestamp}`;

        // Update customer with reset token
        await prisma.customer.update({
            where: { id: customer.id },
            data: { resetToken },
        });

        // ✅ Update rate limit store
        rateLimitStore.set(emailTrimmed, now);

        console.log('🔐 [FORGOT-PASSWORD] Verification code generated for:', emailTrimmed);
        console.log('🔐 [FORGOT-PASSWORD] Code (DEV ONLY):', verificationCode);

        // ✅ Send email with verification code
        const emailSent = await emailService.sendPasswordResetOTP({
            to: customer.email,
            name: customer.name || 'Customer',
            code: verificationCode,
            expiresInMinutes: CODE_EXPIRY_MINUTES,
        });

        if (emailSent) {
            console.log('✅ [FORGOT-PASSWORD] Email sent successfully to:', emailTrimmed);
        } else {
            console.warn('⚠️ [FORGOT-PASSWORD] Email sending failed, but code is stored');
        }

        return NextResponse.json(
            {
                success: true,
                data: {
                    emailSent,
                    lastSentAt: now,
                    retryAfterMs: RATE_LIMIT_WINDOW_MS,
                    // In development, return the code for testing
                    ...(process.env.NODE_ENV === 'development' && { code: verificationCode }),
                },
                message: emailSent
                    ? 'Verification code has been sent to your email'
                    : 'Verification code generated. Check console for code (dev mode).',
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
