/**
 * Customer Authentication Service
 * Handles login, logout, token management for customers (separate from admin users)
 */

import prisma from '@/lib/db/client';
import { comparePassword } from '@/lib/utils/passwordHasher';
import { generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken } from '@/lib/utils/jwtManager';
import { validateEmail, validatePassword } from '@/lib/utils/validators';
import { AuthenticationError, NotFoundError, ERROR_CODES } from '@/lib/constants/errors';
import { serializeBigInt } from '@/lib/utils/serializer';

interface CustomerLoginRequest {
  email: string;
  password: string;
}

interface CustomerLoginResponse {
  customer: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// CustomerTokenPayload interface kept for future use
interface _CustomerTokenPayload {
  customerId: bigint;
  sessionId: bigint;
  email: string;
  type: 'customer';
}

class CustomerAuthService {
  /**
   * Customer session duration: 1 year
   */
  private getSessionDuration(): number {
    return 365 * 24 * 60 * 60; // 31536000 seconds = 365 days = 1 year
  }

  /**
   * Get refresh token duration (2x session duration)
   */
  private getRefreshDuration(): number {
    return this.getSessionDuration() * 2;
  }

  /**
   * Login customer
   */
  async login(
    credentials: CustomerLoginRequest,
    deviceInfo?: string,
    ipAddress?: string
  ): Promise<CustomerLoginResponse> {
    // Validate input
    validateEmail(credentials.email);
    validatePassword(credentials.password);

    // Find customer by email
    const customer = await prisma.customer.findUnique({
      where: { email: credentials.email.toLowerCase() },
    });

    if (!customer) {
      throw new AuthenticationError(
        'Invalid email or password',
        ERROR_CODES.INVALID_CREDENTIALS
      );
    }

    // Check if customer is active
    if (!customer.isActive) {
      throw new AuthenticationError(
        'Your account has been deactivated',
        ERROR_CODES.USER_INACTIVE
      );
    }

    // Check if customer has password set
    if (!customer.passwordHash) {
      throw new AuthenticationError(
        'Please set your password first',
        ERROR_CODES.PASSWORD_NOT_SET
      );
    }

    // Verify password
    const isPasswordValid = await comparePassword(
      credentials.password,
      customer.passwordHash
    );

    if (!isPasswordValid) {
      throw new AuthenticationError(
        'Invalid email or password',
        ERROR_CODES.INVALID_CREDENTIALS
      );
    }

    // Calculate session duration
    const sessionDuration = this.getSessionDuration();
    const refreshDuration = this.getRefreshDuration();

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + sessionDuration);

    const refreshExpiresAt = new Date();
    refreshExpiresAt.setSeconds(refreshExpiresAt.getSeconds() + refreshDuration);

    // Create customer session
    const session = await prisma.customerSession.create({
      data: {
        customerId: customer.id,
        token: `temp_${customer.id}_${Date.now()}`,
        deviceInfo,
        ipAddress,
        status: 'ACTIVE',
        expiresAt,
        refreshExpiresAt,
      },
    });

    // Update last login timestamp
    await prisma.customer.update({
      where: { id: customer.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate JWT tokens with customer-specific payload
    const accessToken = generateAccessToken({
      userId: customer.id, // Use userId field for compatibility
      sessionId: session.id,
      role: 'CUSTOMER', // Virtual role for customer
      email: customer.email,
    }, sessionDuration);

    const refreshToken = generateRefreshToken({
      userId: customer.id,
      sessionId: session.id,
    }, refreshDuration);

    // Update session with actual access token
    await prisma.customerSession.update({
      where: { id: session.id },
      data: { token: accessToken },
    });

    return {
      customer: {
        id: customer.id.toString(),
        name: customer.name,
        email: customer.email,
        phone: customer.phone ?? undefined,
      },
      accessToken,
      refreshToken,
      expiresIn: sessionDuration,
    };
  }

  /**
   * Logout customer - Revoke session
   */
  async logout(sessionId: bigint): Promise<void> {
    const session = await prisma.customerSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundError(
        'Session not found',
        ERROR_CODES.SESSION_NOT_FOUND
      );
    }

    // Revoke session
    await prisma.customerSession.update({
      where: { id: sessionId },
      data: { status: 'REVOKED' },
    });
  }

  /**
   * Logout from all devices - Revoke all customer sessions
   */
  async logoutAll(customerId: bigint): Promise<void> {
    await prisma.customerSession.updateMany({
      where: { 
        customerId, 
        status: 'ACTIVE' 
      },
      data: { status: 'REVOKED' },
    });
  }

  /**
   * Verify customer access token
   */
  async verifyToken(token: string): Promise<{
    customerId: bigint;
    sessionId: bigint;
    email: string;
  } | null> {
    // Verify JWT signature and expiry
    const payload = verifyAccessToken(token);

    if (!payload) {
      return null;
    }

    // Check if it's a customer token (role === 'CUSTOMER' virtual role)
    if (payload.role !== 'CUSTOMER') {
      return null;
    }

    // Check if session is still valid in database
    const session = await prisma.customerSession.findFirst({
      where: {
        id: payload.sessionId,
        status: 'ACTIVE',
        expiresAt: { gt: new Date() },
      },
    });

    if (!session) {
      return null;
    }

    return {
      customerId: payload.userId, // userId in JWT is customerId
      sessionId: payload.sessionId,
      email: payload.email,
    };
  }

  /**
   * Refresh customer access token
   */
  async refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    // Verify refresh token
    const payload = verifyRefreshToken(refreshToken);

    if (!payload) {
      throw new AuthenticationError(
        'Invalid refresh token',
        ERROR_CODES.TOKEN_INVALID
      );
    }

    // Check if session is valid
    const session = await prisma.customerSession.findUnique({
      where: { id: payload.sessionId },
      include: { customer: true },
    });

    if (!session) {
      throw new NotFoundError(
        'Session not found',
        ERROR_CODES.SESSION_NOT_FOUND
      );
    }

    if (session.status !== 'ACTIVE') {
      throw new AuthenticationError(
        'Session has been revoked',
        ERROR_CODES.SESSION_REVOKED
      );
    }

    // Check if refresh token is expired
    if (session.refreshExpiresAt && session.refreshExpiresAt < new Date()) {
      await prisma.customerSession.update({
        where: { id: session.id },
        data: { status: 'EXPIRED' },
      });
      throw new AuthenticationError(
        'Refresh token has expired',
        ERROR_CODES.TOKEN_EXPIRED
      );
    }

    const sessionDuration = this.getSessionDuration();
    const refreshDuration = this.getRefreshDuration();

    // Generate new tokens
    const newAccessToken = generateAccessToken({
      userId: session.customerId,
      sessionId: session.id,
      role: 'CUSTOMER',
      email: session.customer.email,
    }, sessionDuration);

    const newRefreshToken = generateRefreshToken({
      userId: session.customerId,
      sessionId: session.id,
    }, refreshDuration);

    // Update session with new access token and extend expiry
    const newExpiresAt = new Date();
    newExpiresAt.setSeconds(newExpiresAt.getSeconds() + sessionDuration);

    const newRefreshExpiresAt = new Date();
    newRefreshExpiresAt.setSeconds(newRefreshExpiresAt.getSeconds() + refreshDuration);

    await prisma.customerSession.update({
      where: { id: session.id },
      data: {
        token: newAccessToken,
        expiresAt: newExpiresAt,
        refreshExpiresAt: newRefreshExpiresAt,
      },
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Get customer by ID
   */
  async getCustomerById(customerId: bigint) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isActive: true,
        mustChangePassword: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    return customer ? serializeBigInt(customer) : null;
  }

  /**
   * Get customer by email
   */
  async getCustomerByEmail(email: string) {
    const customer = await prisma.customer.findUnique({
      where: { email: email.toLowerCase() },
    });

    return customer ? serializeBigInt(customer) : null;
  }

  /**
   * Check if customer has password set
   */
  async hasPassword(email: string): Promise<boolean> {
    const customer = await prisma.customer.findUnique({
      where: { email: email.toLowerCase() },
      select: { passwordHash: true },
    });

    return !!(customer?.passwordHash);
  }
}

const customerAuthService = new CustomerAuthService();
export default customerAuthService;
