import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import bcrypt from 'bcryptjs';

/**
 * Reset Password API Endpoint (Customer)
 * POST /api/public/auth/reset-password
 * 
 * Sets a new password for the customer after verification.
 * Uses Customer table (separate from admin users)
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
                    error: 'INVALID_TOKEN',
                    message: 'Invalid or expired reset token',
                    statusCode: 400,
                },
                { status: 400 }
            );
        }

        // Parse stored token (format: RESET:TOKEN:EXPIRY_TIMESTAMP)
        const parts = customer.resetToken.split(':');
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
            await prisma.customer.update({
                where: { id: customer.id },
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

        // Update customer password and clear reset token
        await prisma.customer.update({
            where: { id: customer.id },
            data: {
                passwordHash,
                resetToken: null,
                mustChangePassword: false,
            },
        });

        console.log('🔐 [RESET-PASSWORD] Password reset successful for:', emailTrimmed);

        // Invalidate all existing customer sessions for security
        await prisma.customerSession.updateMany({
            where: {
                customerId: customer.id,
                status: 'ACTIVE',
            },
            data: {
                status: 'REVOKED',
            },
        });

        console.log('🔐 [RESET-PASSWORD] All customer sessions revoked for:', emailTrimmed);

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
