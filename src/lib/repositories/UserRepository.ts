/**
 * User Repository
 * Handles all user-related database operations
 */

import prisma from '@/lib/db/client';
import type { Prisma, UserRole } from '@prisma/client';
import { DEFAULT_NOTIFICATION_SETTINGS } from '@/lib/utils/notificationSettings';

export class UserRepository {
  /**
   * Find user by ID
   */
  async findById(id: bigint) {
    return prisma.user.findUnique({
      where: { id },
      include: {
        merchantUsers: {
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
        },
      },
    });
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
      include: {
        merchantUsers: {
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
        },
      },
    });
  }

  /**
   * Create new user
   */
  async create(data: Prisma.UserCreateInput) {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data });

      await tx.userPreference.create({
        data: {
          userId: user.id,
          notificationSettings: DEFAULT_NOTIFICATION_SETTINGS as unknown as Prisma.InputJsonValue,
          emailNotifications: true,
          orderNotifications: true,
          marketingEmails: false,
        },
      });

      return user;
    });
  }

  /**
   * Update user
   */
  async update(id: bigint, data: Prisma.UserUpdateInput) {
    return prisma.user.update({
      where: { id },
      data,
    });
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(id: bigint) {
    return prisma.user.update({
      where: { id },
      data: {
        lastLoginAt: new Date(),
      },
    });
  }

  /**
   * Check if email exists
   */
  async emailExists(email: string): Promise<boolean> {
    const count = await prisma.user.count({
      where: { email },
    });
    return count > 0;
  }

  /**
   * Find user by phone number
   * @param phone - Phone number to search
   */
  async findByPhone(phone: string) {
    return prisma.user.findFirst({
      where: { phone },
      include: {
        merchantUsers: {
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
        },
      },
    });
  }

  /**
   * Check if phone number exists
   */
  async phoneExists(phone: string): Promise<boolean> {
    const count = await prisma.user.count({
      where: { phone },
    });
    return count > 0;
  }

  /**
   * Get user with merchant relationship
   */
  async findUserWithMerchant(userId: bigint, merchantId: bigint) {
    return prisma.merchantUser.findFirst({
      where: {
        userId,
        merchantId,
      },
      include: {
        user: true,
        merchant: true,
      },
    });
  }

  /**
   * Get all active users by role
   */
  async findByRole(role: string) {
    return prisma.user.findMany({
      where: {
        role: role as UserRole,
        isActive: true,
      },
      include: {
        merchantUsers: {
          include: {
            merchant: true,
          },
        },
      },
    });
  }

  /**
   * Get all users linked to a specific merchant
   */
  async findByMerchant(merchantId: bigint) {
    return prisma.user.findMany({
      where: {
        merchantUsers: {
          some: {
            merchantId,
          },
        },
      },
      include: {
        merchantUsers: {
          where: {
            merchantId,
          },
          include: {
            merchant: true,
          },
        },
      },
      orderBy: {
        role: 'asc',
      },
    });
  }

  /**
   * Get all users
   */
  async findAll() {
    return prisma.user.findMany({
      include: {
        merchantUsers: {
          include: {
            merchant: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Delete user (soft delete by setting isActive to false)
   */
  async softDelete(id: bigint) {
    return prisma.user.update({
      where: { id },
      data: {
        isActive: false,
      },
    });
  }

  /**
   * Hard delete user
   */
  async delete(id: bigint) {
    return prisma.user.delete({
      where: { id },
    });
  }

  /**
   * Find users with reset token (for password reset validation)
   */
  async findByResetToken() {
    return prisma.user.findMany({
      where: {
        resetToken: {
          not: null,
        },
      },
    });
  }
}

const userRepository = new UserRepository();
export default userRepository;
