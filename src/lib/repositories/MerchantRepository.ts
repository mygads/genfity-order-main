/**
 * Merchant Repository
 * Handles merchant-related database operations
 */

import prisma from '@/lib/db/client';
import { Prisma } from '@prisma/client';

export class MerchantRepository {
  /**
   * Find merchant by ID
   */
  async findById(id: bigint) {
    return prisma.merchant.findUnique({
      where: { id },
      include: {
        openingHours: {
          orderBy: {
            dayOfWeek: 'asc',
          },
        },
        merchantUsers: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Find merchant by code
   */
  async findByCode(code: string) {
    return prisma.merchant.findUnique({
      where: { code },
      include: {
        openingHours: {
          orderBy: {
            dayOfWeek: 'asc',
          },
        },
      },
    });
  }

  /**
   * Get all merchants
   */
  async findAll(includeInactive = false) {
    return prisma.merchant.findMany({
      where: includeInactive ? {} : { isActive: true },
      include: {
        merchantUsers: {
          where: {
            role: 'OWNER',
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Create merchant
   */
  async create(data: Prisma.MerchantCreateInput) {
    return prisma.merchant.create({
      data,
    });
  }

  /**
   * Create merchant with user relationship (transaction)
   */
  async createWithUser(
    merchantData: Prisma.MerchantCreateInput,
    userId: bigint,
    role: 'OWNER' | 'STAFF' = 'OWNER'
  ) {
    return prisma.$transaction(async (tx) => {
      // Create merchant
      const merchant = await tx.merchant.create({
        data: merchantData,
      });

      // Link user to merchant
      await tx.merchantUser.create({
        data: {
          merchantId: merchant.id,
          userId,
          role,
        },
      });

      return merchant;
    });
  }

  /**
   * Update merchant
   */
  async update(id: bigint, data: Prisma.MerchantUpdateInput) {
    return prisma.merchant.update({
      where: { id },
      data,
    });
  }

  /**
   * Toggle merchant active status
   */
  async toggleActive(id: bigint, isActive: boolean) {
    return prisma.merchant.update({
      where: { id },
      data: { isActive },
    });
  }

  /**
   * Check if merchant code exists
   */
  async codeExists(code: string): Promise<boolean> {
    const count = await prisma.merchant.count({
      where: { code },
    });
    return count > 0;
  }

  /**
   * Update or create opening hours
   */
  async upsertOpeningHours(merchantId: bigint, dayOfWeek: number, data: {
    openTime?: string | null;
    closeTime?: string | null;
    isClosed: boolean;
  }) {
    return prisma.merchantOpeningHour.upsert({
      where: {
        merchantId_dayOfWeek: {
          merchantId,
          dayOfWeek,
        },
      },
      create: {
        merchantId,
        dayOfWeek,
        ...data,
      },
      update: data,
    });
  }

  /**
   * Get merchant's users
   */
  async getMerchantUsers(merchantId: bigint) {
    return prisma.merchantUser.findMany({
      where: { merchantId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
          },
        },
      },
    });
  }

  /**
   * Add user to merchant
   */
  async addUser(merchantId: bigint, userId: bigint, role: 'OWNER' | 'STAFF') {
    return prisma.merchantUser.create({
      data: {
        merchantId,
        userId,
        role,
      },
    });
  }

  /**
   * Remove user from merchant
   */
  async removeUser(merchantId: bigint, userId: bigint) {
    return prisma.merchantUser.deleteMany({
      where: {
        merchantId,
        userId,
      },
    });
  }

  /**
   * Delete merchant
   */
  async delete(id: bigint) {
    return prisma.merchant.delete({
      where: { id },
    });
  }
}

const merchantRepository = new MerchantRepository();
export default merchantRepository;
