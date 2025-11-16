/**
 * Merchant Repository
 * Handles merchant-related database operations
 */

import prisma from '@/lib/db/client';
import { Prisma } from '@prisma/client';
import { serializeData } from '@/lib/utils/serializer';

export class MerchantRepository {
  /**
   * Find merchant by ID
   */
  async findById(id: bigint) {
    const result = await prisma.merchant.findUnique({
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
    return serializeData(result);
  }

  /**
   * Find merchant by code
   */
  async findByCode(code: string) {
    const result = await prisma.merchant.findUnique({
      where: { code },
      include: {
        openingHours: {
          orderBy: {
            dayOfWeek: 'asc',
          },
        },
      },
    });
    return serializeData(result);
  }

  /**
   * Get all merchants
   */
  async findAll(includeInactive = false) {
    const results = await prisma.merchant.findMany({
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
    return serializeData(results);
  }

  /**
   * Create merchant
   */
  async create(data: Prisma.MerchantCreateInput) {
    const result = await prisma.merchant.create({
      data,
    });
    return serializeData(result);
  }

  /**
   * Create merchant with user relationship (transaction)
   */
  async createWithUser(
    merchantData: Prisma.MerchantCreateInput,
    userId: bigint,
    role: 'OWNER' | 'STAFF' = 'OWNER'
  ) {
    const result = await prisma.$transaction(async (tx) => {
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
    return serializeData(result);
  }

  /**
   * Update merchant
   */
  async update(id: bigint, data: Prisma.MerchantUpdateInput) {
    const result = await prisma.merchant.update({
      where: { id },
      data,
    });
    return serializeData(result);
  }

  /**
   * Toggle merchant active status
   */
  async toggleActive(id: bigint, isActive: boolean) {
    const result = await prisma.merchant.update({
      where: { id },
      data: { isActive },
    });
    return serializeData(result);
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
    const result = await prisma.merchantOpeningHour.upsert({
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
    return serializeData(result);
  }

  /**
   * Get merchant's users
   */
  async getMerchantUsers(merchantId: bigint) {
    const results = await prisma.merchantUser.findMany({
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
    return serializeData(results);
  }

  /**
   * Add user to merchant
   */
  async addUser(merchantId: bigint, userId: bigint, role: 'OWNER' | 'STAFF') {
    const result = await prisma.merchantUser.create({
      data: {
        merchantId,
        userId,
        role,
      },
    });
    return serializeData(result);
  }

  /**
   * Remove user from merchant
   */
  async removeUser(merchantId: bigint, userId: bigint) {
    const result = await prisma.merchantUser.deleteMany({
      where: {
        merchantId,
        userId,
      },
    });
    return serializeData(result);
  }

  /**
   * Delete merchant
   */
  async delete(id: bigint) {
    const result = await prisma.merchant.delete({
      where: { id },
    });
    return serializeData(result);
  }
}

const merchantRepository = new MerchantRepository();
export default merchantRepository;
