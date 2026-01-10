/**
 * User Sessions API Endpoint
 * Route: /api/admin/sessions
 * Access: All logged-in admin users (SUPER_ADMIN, MERCHANT_OWNER, MERCHANT_STAFF)
 * 
 * Features:
 * - GET: List all active sessions for current user
 * - DELETE: Revoke a specific session (logout from other device)
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withAuth, type AuthContext } from '@/lib/middleware/auth';

/**
 * GET /api/admin/sessions
 * List all sessions for current logged-in user
 */
async function handleGet(request: NextRequest, context: AuthContext) {
    try {
        // Get all sessions for this user
        const sessions = await prisma.userSession.findMany({
            where: {
                userId: context.userId,
                status: 'ACTIVE',
            },
            orderBy: {
                updatedAt: 'desc',
            },
            select: {
                id: true,
                token: true,
                deviceInfo: true,
                ipAddress: true,
                createdAt: true,
                updatedAt: true,
                expiresAt: true,
            },
        });

        // Get current session token from cookie
        const currentToken = request.cookies.get('auth-token')?.value;

        // Format response
        const formattedSessions = sessions.map((session: {
            id: bigint;
            token: string;
            deviceInfo: string | null;
            ipAddress: string | null;
            createdAt: Date;
            updatedAt: Date;
            expiresAt: Date;
        }) => ({
            id: session.id.toString(),
            deviceInfo: session.deviceInfo || 'Unknown Device',
            ipAddress: session.ipAddress || 'Unknown',
            lastActivityAt: session.updatedAt.toISOString(),
            createdAt: session.createdAt.toISOString(),
            expiresAt: session.expiresAt.toISOString(),
            isCurrent: session.token === currentToken,
        }));

        return NextResponse.json({
            success: true,
            data: formattedSessions,
        });

    } catch (error) {
        console.error('[Sessions API] Error fetching sessions:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch sessions' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/admin/sessions
 * Revoke a specific session (logout from other device)
 * Body: { sessionId: string }
 */
async function handleDelete(request: NextRequest, context: AuthContext) {
    try {
        const body = await request.json();
        const { sessionId } = body;

        if (!sessionId) {
            return NextResponse.json(
                { success: false, error: 'Session ID is required' },
                { status: 400 }
            );
        }

        // Find the session
        const session = await prisma.userSession.findUnique({
            where: { id: BigInt(sessionId) },
        });

        if (!session) {
            return NextResponse.json(
                { success: false, error: 'Session not found' },
                { status: 404 }
            );
        }

        // Verify the session belongs to current user
        if (session.userId !== context.userId) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized to revoke this session' },
                { status: 403 }
            );
        }

        // Don't allow revoking current session
        const currentToken = request.cookies.get('auth-token')?.value;
        if (session.token === currentToken) {
            return NextResponse.json(
                { success: false, error: 'Cannot revoke current session. Use sign out instead.' },
                { status: 400 }
            );
        }

        // Update session status to REVOKED
        await prisma.userSession.update({
            where: { id: BigInt(sessionId) },
            data: {
                status: 'REVOKED',
            },
        });

        return NextResponse.json({
            success: true,
            message: 'Session revoked successfully',
        });

    } catch (error) {
        console.error('[Sessions API] Error revoking session:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to revoke session' },
            { status: 500 }
        );
    }
}

export const GET = withAuth(handleGet, ['SUPER_ADMIN', 'MERCHANT_OWNER', 'MERCHANT_STAFF']);
export const DELETE = withAuth(handleDelete, ['SUPER_ADMIN', 'MERCHANT_OWNER', 'MERCHANT_STAFF']);
