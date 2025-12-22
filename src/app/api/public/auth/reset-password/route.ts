import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import bcrypt from 'bcryptjs';

/**
 * Reset Password API Endpoint
 * POST /api/public/auth/reset-password
 * 
 * Sets a new password for the user after verification.
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, token, password } = body;

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

        if (!token || typeof token !== 'string') {
            return NextResponse.json(
                {
                    success: false,
                    error: 'VALIDATION_ERROR',
                    message: 'Reset token is required',
                    statusCode: 400,
                },
                { status: 400 }
            );
        }

        if (!password || typeof password !== 'string' || password.length < 6) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'VALIDATION_ERROR',
                    message: 'Password must be at least 6 characters',
                    statusCode: 400,
                },
                { status: 400 }
            );
        }

        const emailTrimmed = email.trim().toLowerCase();

        // Find user by email
        const user = await prisma.user.findFirst({
            where: {
                email: emailTrimmed,
                role: 'CUSTOMER',
            },
            select: {
                id: true,
                email: true,
                resetToken: true,
            },
        });

        if (!user || !user.resetToken) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'INVALID_TOKEN',
                    message: 'Invalid or expired reset token',
                    statusCode: 400,
                },
                { status: 400 }
            );
        }

        // Parse stored token (format: RESET:TOKEN:EXPIRY_TIMESTAMP)
        const parts = user.resetToken.split(':');
        if (parts.length !== 3 || parts[0] !== 'RESET') {
            return NextResponse.json(
                {
                    success: false,
                    error: 'INVALID_TOKEN',
                    message: 'Invalid reset token format',
                    statusCode: 400,
                },
                { status: 400 }
            );
        }

        const [, storedToken, expiryStr] = parts;
        const expiryTimestamp = parseInt(expiryStr, 10);

        // Check if token matches
        if (storedToken !== token) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'INVALID_TOKEN',
                    message: 'Invalid reset token',
                    statusCode: 400,
                },
                { status: 400 }
            );
        }

        // Check if token expired
        if (Date.now() > expiryTimestamp) {
            // Clear expired token
            await prisma.user.update({
                where: { id: user.id },
                data: { resetToken: null },
            });

            return NextResponse.json(
                {
                    success: false,
                    error: 'EXPIRED_TOKEN',
                    message: 'Reset token has expired. Please start over.',
                    statusCode: 400,
                },
                { status: 400 }
            );
        }

        // Hash the new password
        const passwordHash = await bcrypt.hash(password, 10);

        // Update user password and clear reset token
        await prisma.user.update({
            where: { id: user.id },
            data: {
                passwordHash,
                resetToken: null,
                mustChangePassword: false,
            },
        });

        console.log('🔐 [RESET-PASSWORD] Password reset successful for:', emailTrimmed);

        // Invalidate all existing sessions for security
        await prisma.userSession.updateMany({
            where: {
                userId: user.id,
                status: 'ACTIVE',
            },
            data: {
                status: 'REVOKED',
            },
        });

        console.log('🔐 [RESET-PASSWORD] All sessions revoked for:', emailTrimmed);

        return NextResponse.json(
            {
                success: true,
                data: null,
                message: 'Password has been reset successfully. Please sign in with your new password.',
                statusCode: 200,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error('❌ [RESET-PASSWORD] Error:', error);
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
