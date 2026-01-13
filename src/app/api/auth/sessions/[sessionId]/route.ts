/**
 * DELETE /api/auth/sessions/[sessionId]
 * Revoke specific session
 * 
 * Headers:
 * Authorization: Bearer <token>
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": null,
 *   "message": "Session revoked successfully",
 *   "statusCode": 200
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import authService from '@/lib/services/AuthService';
import { successResponse } from '@/lib/middleware/errorHandler';
import { withAuth } from '@/lib/middleware/auth';
import { AuthContext } from '@/lib/types/auth';
import { requireBigIntRouteParam, type RouteContext } from '@/lib/utils/routeContext';

async function revokeSessionHandler(
  request: NextRequest,
  authContext: AuthContext,
  context: RouteContext
) {
  const sessionIdResult = await requireBigIntRouteParam(context, 'sessionId');
  if (!sessionIdResult.ok) {
    return NextResponse.json(sessionIdResult.body, { status: sessionIdResult.status });
  }
  const sessionId = sessionIdResult.value;

  // Revoke session
  await authService.revokeSession(sessionId, authContext.userId);

  return successResponse(null, 'Session revoked successfully', 200);
}

export const DELETE = withAuth(revokeSessionHandler);
