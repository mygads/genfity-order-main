/**
 * POST /api/auth/logout
 * User logout endpoint - revokes current session
 * 
 * Headers:
 * Authorization: Bearer <token>
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": null,
 *   "message": "Logout successful",
 *   "statusCode": 200
 * }
 */

import { NextRequest } from 'next/server';
import authService from '@/lib/services/AuthService';
import { successResponse } from '@/lib/middleware/errorHandler';
import { withAuth } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/types/auth';
import prisma from '@/lib/db/client';

async function logoutHandler(request: NextRequest, authContext: AuthContext) {
  // Revoke current session
  await authService.logout(authContext.sessionId);

  // Notify merchant owner when staff logs out (if enabled)
  if (authContext.role === 'MERCHANT_STAFF' && authContext.merchantId) {
    const user = await prisma.user.findUnique({
      where: { id: authContext.userId },
      select: { name: true, email: true },
    });

    if (user) {
      import('@/lib/services/UserNotificationService').then(({ default: userNotificationService }) => {
        userNotificationService.notifyStaffLogout(authContext.merchantId!, user.name, user.email).catch(err => {
          console.error('⚠️ Staff logout notification failed:', err);
        });
      }).catch(err => {
        console.error('⚠️ Failed to import notification service:', err);
      });
    }
  }

  return successResponse(null, 'Logout successful', 200);
}

export const POST = withAuth(logoutHandler);
