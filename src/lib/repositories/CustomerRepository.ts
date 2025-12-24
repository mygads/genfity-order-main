/**
 * Customer Repository
 * Handles all customer-related database operations
 * 
 * Customers are separate from Users (admin/merchant accounts)
 * This allows the same email to be used for both admin and customer accounts
 */

import prisma from '@/lib/db/client';
import type { Prisma } from '@prisma/client';

export class CustomerRepository {
  /**
   * Find customer by ID
   */
  async findById(id: bigint) {
    return prisma.customer.findUnique({
      where: { id },
    });
  }

  /**
   * Find customer by email
   */
  async findByEmail(email: string) {
    return prisma.customer.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  /**
   * Find customer by phone number
   */
  async findByPhone(phone: string) {
    return prisma.customer.findFirst({
      where: { phone },
    });
  }

  /**
   * Create new customer
   */
  async create(data: Prisma.CustomerCreateInput) {
    return prisma.customer.create({
      data: {
        ...data,
        email: data.email.toLowerCase(),
      },
    });
  }

  /**
   * Update customer
   */
  async update(id: bigint, data: Prisma.CustomerUpdateInput) {
    return prisma.customer.update({
      where: { id },
      data,
    });
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(id: bigint) {
    return prisma.customer.update({
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
    const count = await prisma.customer.count({
      where: { email: email.toLowerCase() },
    });
    return count > 0;
  }

  /**
   * Check if phone exists
   */
  async phoneExists(phone: string): Promise<boolean> {
    const count = await prisma.customer.count({
      where: { phone },
    });
    return count > 0;
  }

  /**
   * Get all customers with pagination
   */
  async findAll(options?: {
    skip?: number;
    take?: number;
    search?: string;
  }) {
    const where: Prisma.CustomerWhereInput = {};

    if (options?.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { email: { contains: options.search, mode: 'insensitive' } },
        { phone: { contains: options.search } },
      ];
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip: options?.skip,
        take: options?.take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.customer.count({ where }),
    ]);

    return { customers, total };
  }

  /**
   * Count all customers
   */
  async count(where?: Prisma.CustomerWhereInput) {
    return prisma.customer.count({ where });
  }

  /**
   * Get customer with their orders
   */
  async findWithOrders(id: bigint) {
    return prisma.customer.findUnique({
      where: { id },
      include: {
        orders: {
          orderBy: { placedAt: 'desc' },
          take: 10,
        },
      },
    });
  }

  /**
   * Delete customer (soft delete by setting isActive = false)
   */
  async softDelete(id: bigint) {
    return prisma.customer.update({
      where: { id },
      data: { isActive: false },
    });
  }
}

const customerRepository = new CustomerRepository();
export default customerRepository;
