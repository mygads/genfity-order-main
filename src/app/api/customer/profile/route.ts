import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withCustomer, CustomerAuthContext } from '@/lib/middleware/auth';
import { serializeBigInt } from '@/lib/utils/serializer';

/**
 * Customer Profile API
 * GET /api/customer/profile - Get profile
 * PUT /api/customer/profile - Update profile
 * 
 * @security JWT Bearer token required (Customer token)
 */

/**
 * Get customer profile
 */
export const GET = withCustomer(async (
    _request: NextRequest,
    context: CustomerAuthContext,
) => {
    try {
        // Get customer from database
        const customer = await prisma.customer.findUnique({
            where: {
                id: context.customerId,
                isActive: true,
            },
            select: {
                id: true,
                email: true,
                name: true,
                phone: true,
                createdAt: true,
                lastLoginAt: true,
            },
        });

        if (!customer) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'CUSTOMER_NOT_FOUND',
                    message: 'Customer not found',
                    statusCode: 404,
                },
                { status: 404 }
            );
        }

        return NextResponse.json(
            {
                success: true,
                data: serializeBigInt(customer),
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
});

/**
 * Update customer profile
 */
export const PUT = withCustomer(async (
    request: NextRequest,
    context: CustomerAuthContext,
) => {
    try {
        // Parse request body
        const body = await request.json();
        const { name, email, phone } = body;

        // Validate name
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

        // Validate email format
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

        // Check if email is already used by another customer
        if (email) {
            const emailTrimmed = email.trim().toLowerCase();
            const existingCustomer = await prisma.customer.findFirst({
                where: {
                    email: emailTrimmed,
                    id: { not: context.customerId },
                },
            });

            if (existingCustomer) {
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

        // Update customer
        const updatedCustomer = await prisma.customer.update({
            where: { id: context.customerId },
            data: {
                ...(name && { name: name.trim() }),
                ...(email && { email: email.trim().toLowerCase() }),
                ...(phone !== undefined && { phone: phone?.trim() || null }),
            },
            select: {
                id: true,
                email: true,
                name: true,
                phone: true,
                createdAt: true,
                lastLoginAt: true,
            },
        });

        console.log('✅ [PROFILE] Profile updated for customer:', context.customerId.toString());

        return NextResponse.json(
            {
                success: true,
                data: serializeBigInt(updatedCustomer),
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
});
