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
import { ValidationError, ERROR_CODES } from '@/lib/constants/errors';
import { serializeBigInt } from '@/lib/utils/serializer';
import prisma from '@/lib/db/client';
import { PERMISSION_GROUPS } from '@/lib/constants/permissions';

// Helper to get human-readable permission names from keys
function getPermissionDisplayNames(permissionKeys: string[]): string[] {
  const displayNames: string[] = [];

  for (const group of Object.values(PERMISSION_GROUPS)) {
    for (const perm of group.permissions) {
      if (permissionKeys.includes(perm.key)) {
        // Use nameKey but extract readable name (e.g., 'admin.permissions.orders' -> 'Orders')
        const name = perm.nameKey.split('.').pop() || perm.key;
        displayNames.push(name.charAt(0).toUpperCase() + name.slice(1));
      }
    }
  }

  return displayNames;
}

/**
 * PUT handler - Update staff permissions
 */
async function updatePermissionsHandler(
  request: NextRequest,
  authContext: AuthContext,
  routeContext: { params: Promise<Record<string, string>> }
) {
  try {
    const params = await routeContext.params;
    const staffUserId = params.id;

    if (!staffUserId) {
      throw new ValidationError('Staff ID required', ERROR_CODES.VALIDATION_ERROR);
    }

    const body = await request.json();
    const { permissions } = body;

    if (!Array.isArray(permissions)) {
      throw new ValidationError('Permissions must be an array', ERROR_CODES.VALIDATION_ERROR);
    }

    await staffPermissionService.updatePermissions(
      authContext.merchantId!,
      BigInt(staffUserId),
      permissions,
      authContext.userId
    );

    // Fetch updated staff info
    const updatedStaff = await prisma.merchantUser.findFirst({
      where: {
        userId: BigInt(staffUserId),
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
      const permissionNames = getPermissionDisplayNames(permissions);

      emailService.sendPermissionUpdateNotification({
        to: updatedStaff.user.email,
        name: updatedStaff.user.name || 'Staff',
        merchantName: updatedStaff.merchant?.name || 'Store',
        permissions: permissionNames,
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
  routeContext: { params: Promise<Record<string, string>> }
) {
  try {
    const params = await routeContext.params;
    const staffUserId = params.id;

    if (!staffUserId) {
      throw new ValidationError('Staff ID required', ERROR_CODES.VALIDATION_ERROR);
    }

    const staffInfo = await staffPermissionService.getStaffPermissions(
      BigInt(staffUserId),
      authContext.merchantId!
    );

    if (!staffInfo) {
      throw new ValidationError('Staff member not found', ERROR_CODES.NOT_FOUND);
    }

    return successResponse(
      {
        userId: staffUserId,
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
  routeContext: { params: Promise<Record<string, string>> }
) {
  try {
    const params = await routeContext.params;
    const staffUserId = params.id;

    if (!staffUserId) {
      throw new ValidationError('Staff ID required', ERROR_CODES.VALIDATION_ERROR);
    }

    const body = await request.json();
    const { isActive } = body;

    if (typeof isActive !== 'boolean') {
      throw new ValidationError('isActive must be a boolean', ERROR_CODES.VALIDATION_ERROR);
    }

    await staffPermissionService.toggleStaffActive(
      authContext.merchantId!,
      BigInt(staffUserId),
      isActive,
      authContext.userId
    );

    // Fetch updated staff info
    const updatedStaff = await prisma.merchantUser.findFirst({
      where: {
        userId: BigInt(staffUserId),
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
      },
    });

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