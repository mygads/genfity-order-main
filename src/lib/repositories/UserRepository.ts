/**
 * User Repository
 * Handles all user-related database operations
 */

import prisma from '@/lib/db/client';
import { Prisma, UserRole } from '@prisma/client';

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
            merchant: true,
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
            merchant: true,
          },
        },
      },
    });
  }

  /**
   * Create new user
   */
  async create(data: Prisma.UserCreateInput) {
    return prisma.user.create({
      data,
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
}

const userRepository = new UserRepository();
export default userRepository;
