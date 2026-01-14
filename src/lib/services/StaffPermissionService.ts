/**
 * Staff Permission Service
 * Handles staff permission management and validation
 */

import prisma from '@/lib/db/client';
import { 
  STAFF_PERMISSIONS, 
  DEFAULT_STAFF_PERMISSIONS,
  hasPermission,
  getPermissionForApi,
  type StaffPermission 
} from '@/lib/constants/permissions';
import { NotFoundError, AuthorizationError, ERROR_CODES } from '@/lib/constants/errors';

class StaffPermissionService {
  /**
   * Get staff permissions for a user at a specific merchant
   * 
   * @param userId User ID
   * @param merchantId Merchant ID
   * @returns Staff permissions and role info
   */
  async getStaffPermissions(userId: bigint, merchantId: bigint): Promise<{
    permissions: string[];
    role: string;
    isOwner: boolean;
    isActive: boolean;
  } | null> {
    const merchantUser = await prisma.merchantUser.findUnique({
      where: {
        merchantId_userId: {
          merchantId,
          userId,
        },
      },
      select: {
        role: true,
        permissions: true,
        isActive: true,
      },
    });

    if (!merchantUser) {
      return null;
    }

    const isOwner = merchantUser.role === 'OWNER';

    return {
      permissions: isOwner ? Object.values(STAFF_PERMISSIONS) : merchantUser.permissions,
      role: merchantUser.role,
      isOwner,
      isActive: merchantUser.isActive,
    };
  }

  /**
   * Check if user has specific permission at a merchant
   * 
   * @param userId User ID
   * @param merchantId Merchant ID
   * @param permission Required permission
   * @returns Whether user has permission
   */
  async checkPermission(
    userId: bigint,
    merchantId: bigint,
    permission: StaffPermission
  ): Promise<boolean> {
    const staffInfo = await this.getStaffPermissions(userId, merchantId);
    
    if (!staffInfo || !staffInfo.isActive) {
      return false;
    }

    return hasPermission(staffInfo.permissions, permission, staffInfo.isOwner);
  }

  /**
   * Check API permission (used by middleware)
   * 
   * @param userId User ID
   * @param merchantId Merchant ID
   * @param apiPath API path
   * @returns Whether user has permission for this API
   */
  async checkApiPermission(
    userId: bigint,
    merchantId: bigint,
    apiPath: string,
    method?: string
  ): Promise<boolean> {
    const permission = getPermissionForApi(apiPath, method);
    
    // If no specific permission required, allow access
    if (!permission) {
      return true;
    }

    return this.checkPermission(userId, merchantId, permission);
  }

  /**
   * Update staff permissions
   * 
   * @param merchantId Merchant ID
   * @param staffUserId Staff user ID to update
   * @param permissions New permissions array
   * @param updatedByUserId User making the update (must be owner)
   */
  async updatePermissions(
    merchantId: bigint,
    staffUserId: bigint,
    permissions: string[],
    updatedByUserId: bigint
  ): Promise<void> {
    // Verify updater is owner
    const updater = await prisma.merchantUser.findUnique({
      where: {
        merchantId_userId: {
          merchantId,
          userId: updatedByUserId,
        },
      },
    });

    if (!updater || updater.role !== 'OWNER') {
      throw new AuthorizationError(
        'Only merchant owner can update staff permissions',
        ERROR_CODES.FORBIDDEN
      );
    }

    // Find staff member
    const staffMember = await prisma.merchantUser.findUnique({
      where: {
        merchantId_userId: {
          merchantId,
          userId: staffUserId,
        },
      },
    });

    if (!staffMember) {
      throw new NotFoundError(
        'Staff member not found',
        ERROR_CODES.NOT_FOUND
      );
    }

    // Cannot update owner permissions
    if (staffMember.role === 'OWNER') {
      throw new AuthorizationError(
        'Cannot modify owner permissions',
        ERROR_CODES.FORBIDDEN
      );
    }

    // Validate permissions are valid
    const validPermissions = Object.values(STAFF_PERMISSIONS);
    const filteredPermissions = permissions.filter(p => validPermissions.includes(p as StaffPermission));

    // Update permissions
    await prisma.merchantUser.update({
      where: { id: staffMember.id },
      data: { permissions: filteredPermissions },
    });
  }

  /**
   * Toggle staff active status
   * 
   * @param merchantId Merchant ID
   * @param staffUserId Staff user ID
   * @param isActive New active status
   * @param updatedByUserId User making the update (must be owner)
   */
  async toggleStaffActive(
    merchantId: bigint,
    staffUserId: bigint,
    isActive: boolean,
    updatedByUserId: bigint
  ): Promise<void> {
    // Verify updater is owner
    const updater = await prisma.merchantUser.findUnique({
      where: {
        merchantId_userId: {
          merchantId,
          userId: updatedByUserId,
        },
      },
    });

    if (!updater || updater.role !== 'OWNER') {
      throw new AuthorizationError(
        'Only merchant owner can toggle staff status',
        ERROR_CODES.FORBIDDEN
      );
    }

    // Find staff member
    const staffMember = await prisma.merchantUser.findUnique({
      where: {
        merchantId_userId: {
          merchantId,
          userId: staffUserId,
        },
      },
    });

    if (!staffMember) {
      throw new NotFoundError(
        'Staff member not found',
        ERROR_CODES.NOT_FOUND
      );
    }

    // Cannot deactivate owner
    if (staffMember.role === 'OWNER') {
      throw new AuthorizationError(
        'Cannot deactivate merchant owner',
        ERROR_CODES.FORBIDDEN
      );
    }

    // Update status
    await prisma.merchantUser.update({
      where: { id: staffMember.id },
      data: { isActive },
    });
  }

  /**
   * Staff leaves merchant (self-initiated)
   * 
   * @param userId User ID
   * @param merchantId Merchant ID to leave
   */
  async leaveMerchant(userId: bigint, merchantId: bigint): Promise<void> {
    // Find the merchant user record
    const merchantUser = await prisma.merchantUser.findUnique({
      where: {
        merchantId_userId: {
          merchantId,
          userId,
        },
      },
    });

    if (!merchantUser) {
      throw new NotFoundError(
        'You are not a member of this merchant',
        ERROR_CODES.NOT_FOUND
      );
    }

    // Owner cannot leave (must transfer ownership first or delete merchant)
    if (merchantUser.role === 'OWNER') {
      throw new AuthorizationError(
        'Owner cannot leave merchant. Please transfer ownership or contact support.',
        ERROR_CODES.FORBIDDEN
      );
    }

    // Delete the merchant user record
    await prisma.merchantUser.delete({
      where: { id: merchantUser.id },
    });
  }

  /**
   * Get all merchants for a user
   * Used for merchant selection on login
   * 
   * @param userId User ID
   * @returns List of merchants with details
   */
  async getUserMerchants(userId: bigint): Promise<Array<{
    merchantId: string;
    merchantCode: string;
    merchantName: string;
    merchantLogo: string | null;
    address: string | null;
    city: string | null;
    isOpen: boolean;
    role: string;
    permissions: string[];
    isActive: boolean;
  }>> {
    const merchantUsers = await prisma.merchantUser.findMany({
      where: { 
        userId,
        isActive: true,
      },
      include: {
        merchant: {
          select: {
            id: true,
            code: true,
            name: true,
            logoUrl: true,
            address: true,
            city: true,
            isOpen: true,
            isActive: true,
          },
        },
      },
    });

    return merchantUsers
      .filter(mu => mu.merchant.isActive) // Only active merchants
      .map(mu => ({
        merchantId: mu.merchantId.toString(),
        merchantCode: mu.merchant.code,
        merchantName: mu.merchant.name,
        merchantLogo: mu.merchant.logoUrl,
        address: mu.merchant.address,
        city: mu.merchant.city,
        isOpen: mu.merchant.isOpen,
        role: mu.role,
        permissions: mu.role === 'OWNER' ? Object.values(STAFF_PERMISSIONS) : mu.permissions,
        isActive: mu.isActive,
      }));
  }

  /**
   * Set default permissions for new staff
   * 
   * @param merchantUserId MerchantUser record ID
   */
  async setDefaultPermissions(merchantUserId: bigint): Promise<void> {
    await prisma.merchantUser.update({
      where: { id: merchantUserId },
      data: { permissions: DEFAULT_STAFF_PERMISSIONS },
    });
  }
}

const staffPermissionService = new StaffPermissionService();
export default staffPermissionService;
