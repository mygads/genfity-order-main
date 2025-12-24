import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import crypto from 'crypto';

/**
 * Verify Reset Code API Endpoint (Customer)
 * POST /api/public/auth/verify-reset-code
 * 
 * Verifies the 6-digit code and returns a token for password reset.
 * Uses Customer table (separate from admin users)
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, code } = body;

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

        if (!code || typeof code !== 'string' || code.length !== 6) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'VALIDATION_ERROR',
                    message: 'Invalid verification code',
                    statusCode: 400,
                },
                { status: 400 }
            );
        }

        const emailTrimmed = email.trim().toLowerCase();

        // Find customer by email in Customer table
        const customer = await prisma.customer.findUnique({
            where: {
                email: emailTrimmed,
            },
            select: {
                id: true,
                email: true,
                resetToken: true,
            },
        });

        if (!customer || !customer.resetToken) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'INVALID_CODE',
                    message: 'Invalid or expired verification code',
                    statusCode: 400,
                },
                { status: 400 }
            );
        }

        // Parse stored token (format: CODE:EXPIRY_TIMESTAMP)
        const [storedCode, expiryStr] = customer.resetToken.split(':');
        const expiryTimestamp = parseInt(expiryStr, 10);

        // Check if code matches
        if (storedCode !== code) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'INVALID_CODE',
                    message: 'Invalid verification code',
                    statusCode: 400,
                },
                { status: 400 }
            );
        }

        // Check if code expired
        if (Date.now() > expiryTimestamp) {
            // Clear expired token
            await prisma.customer.update({
                where: { id: customer.id },
                data: { resetToken: null },
            });

            return NextResponse.json(
                {
                    success: false,
                    error: 'EXPIRED_CODE',
                    message: 'Verification code has expired. Please request a new one.',
                    statusCode: 400,
                },
                { status: 400 }
            );
        }

        // Generate a reset token for password change (valid for 15 minutes)
        const resetPasswordToken = crypto.randomBytes(32).toString('hex');
        const resetPasswordExpiry = Date.now() + 15 * 60 * 1000; // 15 minutes

        // Update customer with new reset token for password change
        await prisma.customer.update({
            where: { id: customer.id },
            data: { resetToken: `RESET:${resetPasswordToken}:${resetPasswordExpiry}` },
        });

        console.log('🔐 [VERIFY-CODE] Code verified for:', emailTrimmed);

        return NextResponse.json(
            {
                success: true,
                data: {
                    token: resetPasswordToken,
                },
                message: 'Verification successful',
                statusCode: 200,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error('❌ [VERIFY-CODE] Error:', error);
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
