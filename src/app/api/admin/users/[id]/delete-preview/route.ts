/**
 * GET /api/admin/users/:id/delete-preview
 * Super Admin-only: preview what will be reassigned/deleted when hard-deleting a user.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withSuperAdmin } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/types/auth';
import { successResponse } from '@/lib/middleware/errorHandler';
import { requireBigIntRouteParam, type RouteContext } from '@/lib/utils/routeContext';
import { NotFoundError, ERROR_CODES, ValidationError } from '@/lib/constants/errors';
import prisma from '@/lib/db/client';
import userRepository from '@/lib/repositories/UserRepository';

const SYSTEM_USER_EMAIL = 'system@genfity.com';

async function getDeletePreviewHandler(
  request: NextRequest,
  authContext: AuthContext,
  context: RouteContext
) {
  const userIdResult = await requireBigIntRouteParam(context, 'id');
  if (!userIdResult.ok) {
    return NextResponse.json(userIdResult.body, { status: userIdResult.status });
  }
  const userId = userIdResult.value;

  const user = await userRepository.findById(userId);
  if (!user) {
    throw new NotFoundError('User not found', ERROR_CODES.USER_NOT_FOUND);
  }

  // Keep preview behavior aligned with DELETE rules.
  if (user.email === SYSTEM_USER_EMAIL) {
    throw new ValidationError('You cannot delete the system account', ERROR_CODES.VALIDATION_ERROR);
  }

  if (authContext.userId === userId) {
    throw new ValidationError('You cannot delete your own account', ERROR_CODES.VALIDATION_ERROR);
  }

  if (user.role === 'SUPER_ADMIN' && user.isActive) {
    const otherActiveSuperAdmins = await prisma.user.count({
      where: {
        role: 'SUPER_ADMIN',
        isActive: true,
        id: { not: userId },
      },
    });

    if (otherActiveSuperAdmins === 0) {
      throw new ValidationError('You cannot delete the last active Super Admin', ERROR_CODES.VALIDATION_ERROR);
    }
  }

  const [stockPhotos, influencerApprovalLogs] = await Promise.all([
    prisma.stockPhoto.count({ where: { uploadedByUserId: userId } }),
    prisma.influencerApprovalLog.count({ where: { actedByUserId: userId } }),
  ]);

  const systemUser = await prisma.user.findUnique({
    where: { email: SYSTEM_USER_EMAIL },
    select: { id: true, email: true },
  });

  const total = stockPhotos + influencerApprovalLogs;

  return successResponse(
    {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      systemUser: systemUser
        ? { id: systemUser.id, email: systemUser.email }
        : { id: null, email: SYSTEM_USER_EMAIL },
      reassignmentCounts: {
        stockPhotos,
        influencerApprovalLogs,
        total,
      },
    },
    'Delete preview retrieved successfully',
    200
  );
}

export const GET = withSuperAdmin(getDeletePreviewHandler);
