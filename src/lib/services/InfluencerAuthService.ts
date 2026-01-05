/**
 * Influencer Authentication Service
 * Handles login, logout, token management for influencers (referral partners)
 */

import prisma from '@/lib/db/client';
import { hashPassword, comparePassword } from '@/lib/utils/passwordHasher';
import { generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken } from '@/lib/utils/jwtManager';
import { validateEmail, validatePassword } from '@/lib/utils/validators';
import { AuthenticationError, NotFoundError, ConflictError, ERROR_CODES } from '@/lib/constants/errors';
import { serializeBigInt } from '@/lib/utils/serializer';

interface InfluencerRegisterRequest {
  name: string;
  email: string;
  phone?: string;
  password: string;
  country: string;
}

interface InfluencerLoginRequest {
  email: string;
  password: string;
}

interface InfluencerLoginResponse {
  influencer: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    referralCode: string;
    isApproved: boolean;
    profilePictureUrl?: string;
  };
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Get default currency based on country
 */
function getDefaultCurrency(country: string): string {
  const currencyMap: Record<string, string> = {
    'Indonesia': 'IDR',
    'Australia': 'AUD',
    'United States': 'USD',
    'Singapore': 'SGD',
    'Malaysia': 'MYR',
  };
  return currencyMap[country] || 'USD';
}

/**
 * Generate unique referral code
 */
function generateReferralCode(name: string): string {
  const cleanName = name.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 4);
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${cleanName}${randomPart}`;
}

class InfluencerAuthService {
  /**
   * Influencer session duration: 30 days
   */
  private getSessionDuration(): number {
    return 30 * 24 * 60 * 60; // 30 days in seconds
  }

  /**
   * Get refresh token duration (2x session duration)
   */
  private getRefreshDuration(): number {
    return this.getSessionDuration() * 2;
  }

  /**
   * Register new influencer
   */
  async register(data: InfluencerRegisterRequest): Promise<InfluencerLoginResponse> {
    // Validate input
    validateEmail(data.email);
    validatePassword(data.password);

    // Check if email already exists
    const existingInfluencer = await prisma.influencer.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existingInfluencer) {
      throw new ConflictError(
        'An account with this email already exists',
        ERROR_CODES.CONFLICT
      );
    }

    // Generate unique referral code
    let referralCode = generateReferralCode(data.name);
    let attempts = 0;
    while (attempts < 10) {
      const existing = await prisma.influencer.findUnique({
        where: { referralCode },
      });
      if (!existing) break;
      referralCode = generateReferralCode(data.name);
      attempts++;
    }

    // Hash password
    const passwordHash = await hashPassword(data.password);
    const defaultCurrency = getDefaultCurrency(data.country);

    // Create influencer
    const influencer = await prisma.influencer.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        phone: data.phone,
        passwordHash,
        referralCode,
        country: data.country,
        defaultCurrency,
        isActive: true,
        isApproved: false, // Needs admin approval
      },
    });

    // Create default balance for their currency
    await prisma.influencerBalance.create({
      data: {
        influencerId: influencer.id,
        currency: defaultCurrency,
        balance: 0,
        totalEarned: 0,
        totalWithdrawn: 0,
      },
    });

    // Auto-login after registration
    return this.createSession(influencer, undefined, undefined);
  }

  /**
   * Login influencer
   */
  async login(
    credentials: InfluencerLoginRequest,
    deviceInfo?: string,
    ipAddress?: string
  ): Promise<InfluencerLoginResponse> {
    // Validate input
    validateEmail(credentials.email);
    validatePassword(credentials.password);

    // Find influencer by email
    const influencer = await prisma.influencer.findUnique({
      where: { email: credentials.email.toLowerCase() },
    });

    if (!influencer) {
      throw new AuthenticationError(
        'Invalid email or password',
        ERROR_CODES.INVALID_CREDENTIALS
      );
    }

    // Check if influencer is active
    if (!influencer.isActive) {
      throw new AuthenticationError(
        'Your account has been deactivated',
        ERROR_CODES.USER_INACTIVE
      );
    }

    // Verify password
    const isPasswordValid = await comparePassword(
      credentials.password,
      influencer.passwordHash
    );

    if (!isPasswordValid) {
      throw new AuthenticationError(
        'Invalid email or password',
        ERROR_CODES.INVALID_CREDENTIALS
      );
    }

    return this.createSession(influencer, deviceInfo, ipAddress);
  }

  /**
   * Create session and generate tokens
   */
  private async createSession(
    influencer: {
      id: bigint;
      name: string;
      email: string;
      phone: string | null;
      referralCode: string;
      isApproved: boolean;
      profilePictureUrl: string | null;
    },
    deviceInfo?: string,
    ipAddress?: string
  ): Promise<InfluencerLoginResponse> {
    // Calculate session duration
    const sessionDuration = this.getSessionDuration();
    const refreshDuration = this.getRefreshDuration();

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + sessionDuration);

    const refreshExpiresAt = new Date();
    refreshExpiresAt.setSeconds(refreshExpiresAt.getSeconds() + refreshDuration);

    // Create influencer session
    const session = await prisma.influencerSession.create({
      data: {
        influencerId: influencer.id,
        token: `temp_${influencer.id}_${Date.now()}`,
        deviceInfo,
        ipAddress,
        status: 'ACTIVE',
        expiresAt,
        refreshExpiresAt,
      },
    });

    // Update last login timestamp
    await prisma.influencer.update({
      where: { id: influencer.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate JWT tokens with influencer-specific payload
    const accessToken = generateAccessToken({
      userId: influencer.id,
      sessionId: session.id,
      role: 'INFLUENCER', // Virtual role for influencer
      email: influencer.email,
      influencerId: influencer.id.toString(),
      name: influencer.name,
    }, sessionDuration);

    const refreshToken = generateRefreshToken({
      userId: influencer.id,
      sessionId: session.id,
    }, refreshDuration);

    // Update session with actual access token
    await prisma.influencerSession.update({
      where: { id: session.id },
      data: { token: accessToken },
    });

    return {
      influencer: {
        id: influencer.id.toString(),
        name: influencer.name,
        email: influencer.email,
        phone: influencer.phone ?? undefined,
        referralCode: influencer.referralCode,
        isApproved: influencer.isApproved,
        profilePictureUrl: influencer.profilePictureUrl ?? undefined,
      },
      accessToken,
      refreshToken,
      expiresIn: sessionDuration,
    };
  }

  /**
   * Logout influencer - Revoke session
   */
  async logout(sessionId: bigint): Promise<void> {
    const session = await prisma.influencerSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundError(
        'Session not found',
        ERROR_CODES.SESSION_NOT_FOUND
      );
    }

    // Revoke session
    await prisma.influencerSession.update({
      where: { id: sessionId },
      data: { status: 'REVOKED' },
    });
  }

  /**
   * Verify influencer access token
   */
  async verifyToken(token: string): Promise<{
    influencerId: bigint;
    sessionId: bigint;
    email: string;
  } | null> {
    // Verify JWT signature and expiry
    const payload = verifyAccessToken(token);

    if (!payload) {
      return null;
    }

    // Check if it's an influencer token
    if (payload.role !== 'INFLUENCER') {
      return null;
    }

    // Check if session is still valid in database
    const session = await prisma.influencerSession.findFirst({
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
      influencerId: payload.userId,
      sessionId: payload.sessionId,
      email: payload.email,
    };
  }

  /**
   * Refresh influencer access token
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
    const session = await prisma.influencerSession.findUnique({
      where: { id: payload.sessionId },
      include: { influencer: true },
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
      await prisma.influencerSession.update({
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
      userId: session.influencerId,
      sessionId: session.id,
      role: 'INFLUENCER',
      email: session.influencer.email,
    }, sessionDuration);

    const newRefreshToken = generateRefreshToken({
      userId: session.influencerId,
      sessionId: session.id,
    }, refreshDuration);

    // Update session with new access token and extend expiry
    const newExpiresAt = new Date();
    newExpiresAt.setSeconds(newExpiresAt.getSeconds() + sessionDuration);

    const newRefreshExpiresAt = new Date();
    newRefreshExpiresAt.setSeconds(newRefreshExpiresAt.getSeconds() + refreshDuration);

    await prisma.influencerSession.update({
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
   * Get influencer by ID
   */
  async getInfluencerById(influencerId: bigint) {
    const influencer = await prisma.influencer.findUnique({
      where: { id: influencerId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        referralCode: true,
        country: true,
        defaultCurrency: true,
        profilePictureUrl: true,
        isActive: true,
        isApproved: true,
        approvedAt: true,
        bankNameIdr: true,
        bankAccountIdr: true,
        bankAccountNameIdr: true,
        bankNameAud: true,
        bankAccountAud: true,
        bankAccountNameAud: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    return influencer ? serializeBigInt(influencer) : null;
  }

  /**
   * Get influencer with balances
   */
  async getInfluencerWithBalances(influencerId: bigint) {
    const influencer = await prisma.influencer.findUnique({
      where: { id: influencerId },
      include: {
        balances: true,
        referredMerchants: {
          select: {
            id: true,
            name: true,
            email: true,
            currency: true,
            isActive: true,
            hasGivenFirstCommission: true,
            createdAt: true,
            subscription: {
              select: {
                type: true,
                status: true,
              },
            },
          },
        },
        _count: {
          select: {
            referredMerchants: true,
            transactions: true,
            withdrawals: true,
          },
        },
      },
    });

    return influencer ? serializeBigInt(influencer) : null;
  }

  /**
   * Request password reset - generate token and save to DB
   */
  async requestPasswordReset(email: string): Promise<{ resetToken: string; expiresAt: Date }> {
    const normalizedEmail = email.toLowerCase().trim();
    
    // Find influencer by email
    const influencer = await prisma.influencer.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, name: true, email: true },
    });

    if (!influencer) {
      // Return success even if not found to prevent email enumeration
      // Generate fake token for timing consistency
      const fakeToken = crypto.randomUUID().replace(/-/g, '');
      const fakeExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
      return { resetToken: fakeToken, expiresAt: fakeExpiresAt };
    }

    // Generate reset token
    const resetToken = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Save token to database
    await prisma.influencer.update({
      where: { id: influencer.id },
      data: {
        resetToken,
        resetTokenExpiresAt: expiresAt,
      },
    });

    return { resetToken, expiresAt };
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    // Validate new password
    validatePassword(newPassword);

    // Find influencer by reset token
    const influencer = await prisma.influencer.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!influencer) {
      throw new AuthenticationError(
        'Invalid or expired reset token',
        ERROR_CODES.TOKEN_INVALID
      );
    }

    // Hash new password
    const passwordHash = await hashPassword(newPassword);

    // Update password and clear reset token
    await prisma.influencer.update({
      where: { id: influencer.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiresAt: null,
      },
    });

    // Revoke all active sessions for security
    await prisma.influencerSession.updateMany({
      where: {
        influencerId: influencer.id,
        status: 'ACTIVE',
      },
      data: {
        status: 'REVOKED',
      },
    });
  }

  /**
   * Get influencer by email (for forgot password)
   */
  async getInfluencerByEmail(email: string) {
    const influencer = await prisma.influencer.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });
    return influencer;
  }
}

const influencerAuthService = new InfluencerAuthService();
export default influencerAuthService;
