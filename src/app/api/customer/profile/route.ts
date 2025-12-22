import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/db/client';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

interface JWTPayload {
    customerId: string;
    email: string;
    name: string;
    role: string;
}

/**
 * Customer Profile API
 * GET /api/customer/profile - Get profile
 * PUT /api/customer/profile - Update profile
 * 
 * @security JWT Bearer token required
 */

/**
 * Get customer profile
 */
export async function GET(request: NextRequest) {
    try {
        // Get token from Authorization header
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'UNAUTHORIZED',
                    message: 'Authentication required',
                    statusCode: 401,
                },
                { status: 401 }
            );
        }

        const token = authHeader.substring(7);

        // Verify JWT
        let decoded: JWTPayload;
        try {
            decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
        } catch {
            return NextResponse.json(
                {
                    success: false,
                    error: 'INVALID_TOKEN',
                    message: 'Invalid or expired token',
                    statusCode: 401,
                },
                { status: 401 }
            );
        }

        // Get user from database
        const user = await prisma.user.findFirst({
            where: {
                id: BigInt(decoded.customerId),
                role: 'CUSTOMER',
                isActive: true,
            },
            select: {
                id: true,
                email: true,
                name: true,
                phone: true,
                profilePictureUrl: true,
                createdAt: true,
            },
        });

        if (!user) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'USER_NOT_FOUND',
                    message: 'User not found',
                    statusCode: 404,
                },
                { status: 404 }
            );
        }

        return NextResponse.json(
            {
                success: true,
                data: {
                    id: user.id.toString(),
                    email: user.email,
                    name: user.name,
                    phone: user.phone,
                    profilePictureUrl: user.profilePictureUrl,
                    createdAt: user.createdAt.toISOString(),
                },
                statusCode: 200,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error('❌ [PROFILE] Error getting profile:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'INTERNAL_ERROR',
                message: 'An error occurred',
                statusCode: 500,
            },
            { status: 500 }
        );
    }
}

/**
 * Update customer profile
 */
export async function PUT(request: NextRequest) {
    try {
        // Get token from Authorization header
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'UNAUTHORIZED',
                    message: 'Authentication required',
                    statusCode: 401,
                },
                { status: 401 }
            );
        }

        const token = authHeader.substring(7);

        // Verify JWT
        let decoded: JWTPayload;
        try {
            decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
        } catch {
            return NextResponse.json(
                {
                    success: false,
                    error: 'INVALID_TOKEN',
                    message: 'Invalid or expired token',
                    statusCode: 401,
                },
                { status: 401 }
            );
        }

        // Parse request body
        const body = await request.json();
        const { name, email } = body;

        // Validate
        if (name && (typeof name !== 'string' || name.trim().length < 1)) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'VALIDATION_ERROR',
                    message: 'Invalid name',
                    statusCode: 400,
                },
                { status: 400 }
            );
        }

        if (email && (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))) {
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

        // Check if email is already used by another user
        if (email) {
            const emailTrimmed = email.trim().toLowerCase();
            const existingUser = await prisma.user.findFirst({
                where: {
                    email: emailTrimmed,
                    id: { not: BigInt(decoded.customerId) },
                },
            });

            if (existingUser) {
                return NextResponse.json(
                    {
                        success: false,
                        error: 'EMAIL_EXISTS',
                        message: 'Email is already in use',
                        statusCode: 400,
                    },
                    { status: 400 }
                );
            }
        }

        // Update user
        const updatedUser = await prisma.user.update({
            where: { id: BigInt(decoded.customerId) },
            data: {
                ...(name && { name: name.trim() }),
                ...(email && { email: email.trim().toLowerCase() }),
            },
            select: {
                id: true,
                email: true,
                name: true,
                phone: true,
                profilePictureUrl: true,
            },
        });

        console.log('✅ [PROFILE] Profile updated for:', decoded.customerId);

        return NextResponse.json(
            {
                success: true,
                data: {
                    id: updatedUser.id.toString(),
                    email: updatedUser.email,
                    name: updatedUser.name,
                    phone: updatedUser.phone,
                    profilePictureUrl: updatedUser.profilePictureUrl,
                },
                message: 'Profile updated successfully',
                statusCode: 200,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error('❌ [PROFILE] Error updating profile:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'INTERNAL_ERROR',
                message: 'An error occurred',
                statusCode: 500,
            },
            { status: 500 }
        );
    }
}
