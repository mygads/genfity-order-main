/**
 * Staff Permissions API
 * PUT /api/merchant/staff/[id]/permissions - Update staff permissions
 * 
 * Only accessible by merchant owner
 */

import { NextRequest } from 'next/server';
import { successResponse, handleError } from '@/lib/middleware/errorHandler';
import { withMerchantOwner } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import staffPermissionService from '@/lib/services/StaffPermissionService';
import emailService from '@/lib/services/EmailService';
import authService from '@/lib/services/AuthService';
import { ValidationError, ERROR_CODES } from '@/lib/constants/errors';
import { serializeBigInt } from '@/lib/utils/serializer';
import prisma from '@/lib/db/client';
import { PERMISSION_GROUPS } from '@/lib/constants/permissions';
import { getBigIntRouteParam, type RouteContext } from '@/lib/utils/routeContext';

/**
 * PUT handler - Update staff permissions
 */
async function updatePermissionsHandler(
  request: NextRequest,
  authContext: AuthContext,
  routeContext: RouteContext
) {
  try {
    const staffUserId = await getBigIntRouteParam(routeContext, 'id');
    if (!staffUserId) throw new ValidationError('Staff ID required', ERROR_CODES.VALIDATION_ERROR);

    const body = await request.json();
    const { permissions } = body;

    if (!Array.isArray(permissions)) {
      throw new ValidationError('Permissions must be an array', ERROR_CODES.VALIDATION_ERROR);
    }

    await staffPermissionService.updatePermissions(
      authContext.merchantId!,
      staffUserId,
      permissions,
      authContext.userId
    );

    // Fetch updated staff info
    const updatedStaff = await prisma.merchantUser.findFirst({
      where: {
        userId: staffUserId,
        merchantId: authContext.merchantId!,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        merchant: {
          select: {
            name: true,
            country: true,
          },
        },
      },
    });

    // Fetch updater info for the email
    const updater = await prisma.user.findUnique({
      where: { id: authContext.userId },
      select: { name: true },
    });

    // Send email notification
    if (updatedStaff?.user?.email) {
      emailService.sendPermissionUpdateNotification({
        to: updatedStaff.user.email,
        name: updatedStaff.user.name || 'Staff',
        merchantName: updatedStaff.merchant?.name || 'Store',
        // Send raw permission keys; email template renders friendly labels per locale.
        permissions,
        updatedBy: updater?.name || 'Owner',
        merchantCountry: updatedStaff.merchant?.country,
      }).catch((err) => {
        // Don't block the response if email fails
        console.error('Failed to send permission update email:', err);
      });
    }

    return successResponse(
      serializeBigInt(updatedStaff),
      'Staff permissions updated successfully',
      200
    );
  } catch (error) {
    return handleError(error);
  }
}

/**
 * GET handler - Get staff permissions
 */
async function getPermissionsHandler(
  request: NextRequest,
  authContext: AuthContext,
  routeContext: RouteContext
) {
  try {
    const staffUserId = await getBigIntRouteParam(routeContext, 'id');
    if (!staffUserId) throw new ValidationError('Staff ID required', ERROR_CODES.VALIDATION_ERROR);

    const staffInfo = await staffPermissionService.getStaffPermissions(
      staffUserId,
      authContext.merchantId!
    );

    if (!staffInfo) {
      throw new ValidationError('Staff member not found', ERROR_CODES.NOT_FOUND);
    }

    return successResponse(
      {
        userId: staffUserId.toString(),
        ...staffInfo,
      },
      'Staff permissions retrieved successfully',
      200
    );
  } catch (error) {
    return handleError(error);
  }
}

export const GET = withMerchantOwner(getPermissionsHandler);
export const PUT = withMerchantOwner(updatePermissionsHandler);

/**
 * PATCH handler - Toggle staff active status
 */
async function toggleStatusHandler(
  request: NextRequest,
  authContext: AuthContext,
  routeContext: RouteContext
) {
  try {
    const staffUserId = await getBigIntRouteParam(routeContext, 'id');
    if (!staffUserId) throw new ValidationError('Staff ID required', ERROR_CODES.VALIDATION_ERROR);

    const body = await request.json();
    const { isActive } = body;

    if (typeof isActive !== 'boolean') {
      throw new ValidationError('isActive must be a boolean', ERROR_CODES.VALIDATION_ERROR);
    }

    await staffPermissionService.toggleStaffActive(
      authContext.merchantId!,
      staffUserId,
      isActive,
      authContext.userId
    );

    // Force logout from all devices when access is disabled for this merchant
    if (!isActive) {
      await authService.logoutAll(staffUserId);
    }

    // Fetch updated staff info
    const updatedStaff = await prisma.merchantUser.findFirst({
      where: {
        userId: staffUserId,
        merchantId: authContext.merchantId!,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        merchant: {
          select: {
            name: true,
            code: true,
            country: true,
          },
        },
      },
    });

    // Notify staff when access is disabled
    if (!isActive && updatedStaff?.user?.email) {
      emailService
        .sendMerchantAccessDisabled({
          to: updatedStaff.user.email,
          name: updatedStaff.user.name || 'Staff',
          email: updatedStaff.user.email,
          merchantName: updatedStaff.merchant?.name || 'Store',
          merchantCode: updatedStaff.merchant?.code || undefined,
          merchantCountry: updatedStaff.merchant?.country,
        })
        .catch((err) => {
          console.error('Failed to send merchant access disabled email:', err);
        });
    }

    return successResponse(
      serializeBigInt(updatedStaff),
      `Staff ${isActive ? 'activated' : 'deactivated'} successfully`,
      200
    );
  } catch (error) {
    return handleError(error);
  }
}

export const PATCH = withMerchantOwner(toggleStatusHandler);