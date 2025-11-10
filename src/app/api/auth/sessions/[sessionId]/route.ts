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

import { NextRequest } from 'next/server';
import authService from '@/lib/services/AuthService';
import { successResponse } from '@/lib/middleware/errorHandler';
import { withAuth } from '@/lib/middleware/auth';
import { AuthContext } from '@/lib/types/auth';

async function revokeSessionHandler(
  request: NextRequest,
  authContext: AuthContext,
  context: { params: Promise<Record<string, string>> }
) {
  const params = await context.params;
  const sessionId = BigInt(params.sessionId);

  // Revoke session
  await authService.revokeSession(sessionId, authContext.userId);

  return successResponse(null, 'Session revoked successfully', 200);
}

export const DELETE = withAuth(revokeSessionHandler);
